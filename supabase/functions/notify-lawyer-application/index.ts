// Notifies all admins via Telegram about a new lawyer application
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function sendTg(chat_id: number, text: string) {
  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
    });
    if (!res.ok) console.error("tg send failed", res.status, await res.text());
  } catch (e) {
    console.error("tg send error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: app } = await admin
      .from("lawyer_applications")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();
    if (!app) return json({ error: "application not found" }, 404);

    // Get all admin user IDs
    const { data: adminRoles } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (adminRoles ?? []).map((r: any) => r.user_id);
    if (adminIds.length === 0) return json({ ok: true, notified: 0 });

    const { data: links } = await admin
      .from("telegram_links")
      .select("chat_id")
      .in("user_id", adminIds);

    const text =
      `🆕 <b>Новая заявка юриста</b>\n\n` +
      `👤 ${escapeHtml(app.full_name || "Без имени")}\n` +
      `📧 ${escapeHtml(app.email || "—")}\n\n` +
      `Откройте админ-панель, чтобы одобрить или отклонить заявку.`;

    let notified = 0;
    for (const l of links ?? []) {
      await sendTg(Number((l as any).chat_id), text);
      notified++;
    }
    return json({ ok: true, notified });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
