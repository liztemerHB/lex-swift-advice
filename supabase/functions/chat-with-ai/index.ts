import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_TEXT =
  "Сейчас не удалось получить ответ LexAdvice. Попробуйте ещё раз через минуту.";

const buildFallback = (caseId: string | null, updatedCase: unknown) => ({
  caseId,
  reply: FALLBACK_TEXT,
  message: FALLBACK_TEXT,
  text: FALLBACK_TEXT,
  is_fact_gathering_complete: false,
  case_patch: {},
  next_questions: [],
  next_steps: [],
  cta: {},
  case: updatedCase,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let caseId: string | null = null;

  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    caseId = body?.caseId ?? null;
    const consentPersonalData: boolean = !!body?.consentPersonalData;
    const privacyPolicyAccepted: boolean = !!body?.privacyPolicyAccepted;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    if (!caseId) {
      const { data: newCase, error: caseErr } = await admin
        .from("cases")
        .insert({
          user_id: userId,
          consent_personal_data: consentPersonalData,
          privacy_policy_accepted: privacyPolicyAccepted,
          consent_at: consentPersonalData ? new Date().toISOString() : null,
          consent_version: consentPersonalData ? "v1.0" : null,
        })
        .select()
        .single();
      if (caseErr) throw caseErr;
      caseId = newCase.id;
    }

    await admin.from("case_messages").insert({
      case_id: caseId,
      role: "user",
      content: message,
    });

    const { data: history } = await admin
      .from("case_messages")
      .select("role, content, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(10);
    const recentHistory = (history ?? []).reverse();

    const { data: currentCase } = await admin
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    const n8nUrl = Deno.env.get("N8N_CHAT_WEBHOOK_URL");
    if (!n8nUrl) {
      console.error("N8N_CHAT_WEBHOOK_URL is not configured");
      return new Response(JSON.stringify(buildFallback(caseId, currentCase)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      message,
      history: recentHistory,
      currentFacts: currentCase?.facts ?? {},
      caseId,
      userId,
    };

    let n8nResp: Response;
    try {
      console.log("n8n request: POST (caseId=", caseId, ", userId=", userId, ")");
      n8nResp = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("n8n response status:", n8nResp.status);
    } catch (netErr) {
      console.error("n8n network error:", (netErr as Error).message);
      return new Response(JSON.stringify(buildFallback(caseId, currentCase)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n8nText = await n8nResp.text();
    if (!n8nResp.ok) {
      console.error("n8n non-OK status:", n8nResp.status, "body length:", n8nText.length);
      return new Response(JSON.stringify(buildFallback(caseId, currentCase)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let n8nData: any = {};
    if (n8nText && n8nText.trim().length > 0) {
      try {
        n8nData = JSON.parse(n8nText);
        if (Array.isArray(n8nData)) n8nData = n8nData[0] ?? {};
        if (n8nData && typeof n8nData === "object" && !n8nData.reply) {
          if (n8nData.data && typeof n8nData.data === "object") n8nData = n8nData.data;
          else if (n8nData.body && typeof n8nData.body === "object") n8nData = n8nData.body;
          else if (n8nData.json && typeof n8nData.json === "object") n8nData = n8nData.json;
          else if (n8nData.output && typeof n8nData.output === "object") n8nData = n8nData.output;
        }
      } catch (e) {
        console.error("n8n returned non-JSON, parse error:", (e as Error).message);
        return new Response(JSON.stringify(buildFallback(caseId, currentCase)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.error("n8n returned empty body");
      return new Response(JSON.stringify(buildFallback(caseId, currentCase)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply: string = typeof n8nData?.reply === "string" ? n8nData.reply : "";
    const isComplete: boolean = !!n8nData?.is_fact_gathering_complete;
    const patch =
      n8nData?.case_patch && typeof n8nData.case_patch === "object" ? n8nData.case_patch : {};
    const nextQuestions: unknown[] = Array.isArray(n8nData?.next_questions)
      ? n8nData.next_questions
      : [];
    const nextSteps: string[] = Array.isArray(n8nData?.next_steps)
      ? n8nData.next_steps
      : Array.isArray(patch?.next_steps)
      ? patch.next_steps
      : [];
    const cta = n8nData?.cta && typeof n8nData.cta === "object" ? n8nData.cta : {};

    if (reply) {
      await admin.from("case_messages").insert({
        case_id: caseId,
        role: "assistant",
        content: reply,
      });
    }

    const update: Record<string, unknown> = {
      is_fact_gathering_complete: isComplete,
      next_steps: nextSteps,
    };
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.urgency !== undefined) update.urgency = patch.urgency;
    if (patch.problem_summary !== undefined) update.problem_summary = patch.problem_summary;
    if (patch.extracted_facts !== undefined) update.facts = patch.extracted_facts;
    if (patch.estimated_damage !== undefined) update.estimated_damage = patch.estimated_damage;
    if (patch.city !== undefined) update.city = patch.city;

    const { data: updatedCase } = await admin
      .from("cases")
      .update(update)
      .eq("id", caseId)
      .select()
      .single();

    const finalReply = reply || FALLBACK_TEXT;

    return new Response(
      JSON.stringify({
        caseId,
        reply: finalReply,
        message: finalReply,
        text: finalReply,
        is_fact_gathering_complete: isComplete,
        case_patch: patch,
        next_questions: nextQuestions,
        next_steps: nextSteps,
        cta,
        case: updatedCase,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-with-ai error:", (err as Error).message);
    return new Response(JSON.stringify(buildFallback(caseId, null)), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
