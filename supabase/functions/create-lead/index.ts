import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { caseId, contact, consentPersonalData, consentTransferToLawyer, privacyPolicyAccepted } =
      await req.json();

    if (!caseId || !contact || !consentPersonalData || !consentTransferToLawyer || !privacyPolicyAccepted) {
      return new Response(
        JSON.stringify({ error: "Все поля и согласия обязательны" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof contact !== "string" || contact.trim().length < 3 || contact.length > 200) {
      return new Response(JSON.stringify({ error: "Некорректный контакт" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: caseRow, error: caseErr } = await admin
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();
    if (caseErr || !caseRow) {
      return new Response(JSON.stringify({ error: "Дело не найдено" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .insert({
        case_id: caseId,
        category: caseRow.category,
        urgency: caseRow.urgency,
        public_summary: caseRow.problem_summary,
        estimated_damage: caseRow.estimated_damage,
        city: caseRow.city,
        price_rub: 500,
        status: "available",
      })
      .select()
      .single();
    if (leadErr) throw leadErr;

    await admin.from("lead_contacts").insert({
      lead_id: lead.id,
      contact: contact.trim(),
      consent_personal_data: true,
      consent_transfer_to_lawyer: true,
      privacy_policy_accepted: true,
    });

    // Notify n8n if configured
    const n8n = Deno.env.get("N8N_WEBHOOK_URL");
    if (n8n) {
      try {
        await fetch(n8n, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "lead.created", leadId: lead.id, caseId }),
        });
      } catch (e) {
        console.error("n8n notify failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
