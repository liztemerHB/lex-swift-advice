import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    let caseId: string | undefined = body?.caseId;
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

    const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (!n8nUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_WEBHOOK_URL is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const n8nResp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        caseId,
        history: recentHistory,
        currentFacts: currentCase?.facts ?? {},
      }),
    });

    const n8nText = await n8nResp.text();
    if (!n8nResp.ok) {
      console.error("n8n error", n8nResp.status, n8nText);
      return new Response(
        JSON.stringify({ error: "Ошибка ИИ-сервиса", details: n8nText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let n8nData: any = {};
    if (n8nText && n8nText.trim().length > 0) {
      try {
        n8nData = JSON.parse(n8nText);
      } catch (e) {
        console.error("n8n returned non-JSON response:", n8nText);
        return new Response(
          JSON.stringify({
            error: "ИИ-сервис вернул некорректный ответ. Проверьте, что n8n workflow возвращает JSON с полем 'reply'.",
            raw: n8nText.slice(0, 500),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.error("n8n returned empty body");
      return new Response(
        JSON.stringify({
          error: "ИИ-сервис вернул пустой ответ. Проверьте, что n8n workflow активен и возвращает JSON.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply: string = n8nData?.reply ?? "";
    const isComplete: boolean = !!n8nData?.is_fact_gathering_complete;
    const patch = n8nData?.case_patch ?? {};
    const nextSteps: string[] = Array.isArray(n8nData?.next_steps) ? n8nData.next_steps : [];

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

    return new Response(
      JSON.stringify({
        caseId,
        reply,
        is_fact_gathering_complete: isComplete,
        case: updatedCase,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
