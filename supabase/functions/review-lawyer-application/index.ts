// Admin-only: approve or reject a lawyer application
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function sendTg(chat_id: number, text: string) {
  try {
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("tg send error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "no auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) return json({ error: "forbidden" }, 403);

    const { application_id, action, notes } = await req.json();
    if (!application_id || !["approve", "reject"].includes(action))
      return json({ error: "bad params" }, 400);

    const { data: app } = await admin
      .from("lawyer_applications")
      .select("*")
      .eq("id", application_id)
      .maybeSingle();
    if (!app) return json({ error: "not found" }, 404);

    const newStatus = action === "approve" ? "approved" : "rejected";
    await admin
      .from("lawyer_applications")
      .update({
        status: newStatus,
        reviewed_by: u.user.id,
        reviewed_at: new Date().toISOString(),
        notes: notes ?? app.notes,
      })
      .eq("id", application_id);

    if (action === "approve") {
      await admin.from("user_roles").insert({ user_id: app.user_id, role: "lawyer" });
    }

    // Notify lawyer via TG if linked
    const { data: link } = await admin
      .from("telegram_links")
      .select("chat_id")
      .eq("user_id", app.user_id)
      .maybeSingle();
    if (link?.chat_id) {
      const msg =
        action === "approve"
          ? "✅ Ваша заявка юриста <b>одобрена</b>. Войдите в кабинет: /lawyer"
          : "❌ Ваша заявка юриста отклонена." + (notes ? `\n\nПричина: ${notes}` : "");
      await sendTg(Number(link.chat_id), msg);
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
