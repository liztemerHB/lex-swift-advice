import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Требуется авторизация" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Неавторизован" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "lawyer")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Доступ только для юристов" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Лид не найден" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await admin
      .from("lead_purchases")
      .select("id")
      .eq("lead_id", leadId)
      .eq("lawyer_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: purchaseErr } = await admin.from("lead_purchases").insert({
        lead_id: leadId,
        lawyer_id: user.id,
        price_rub: lead.price_rub,
      });
      if (purchaseErr) throw purchaseErr;

      await admin.from("leads").update({ status: "purchased" }).eq("id", leadId);
    }

    const { data: contactRow } = await admin
      .from("lead_contacts")
      .select("contact")
      .eq("lead_id", leadId)
      .maybeSingle();

    const { data: updatedLead } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        contact: contactRow?.contact ?? null,
        lead: updatedLead,
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
