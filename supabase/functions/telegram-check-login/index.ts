import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return json({ error: "token required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("telegram-check-login missing backend credentials");
      return json({ error: "SERVICE_UNAVAILABLE", fallback: true });
    }

    const supabase = createClient(
      supabaseUrl,
      serviceKey,
    );

    const { data, error } = await supabase
      .from("telegram_login_tokens")
      .select("status, expires_at, access_token, refresh_token")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return json({ status: "not_found" });
    }

    if (new Date(data.expires_at).getTime() < Date.now() && data.status === "pending") {
      await supabase.from("telegram_login_tokens").update({ status: "expired" }).eq("token", token);
      return json({ status: "expired" });
    }

    if (data.status !== "confirmed") {
      return json({ status: data.status });
    }

    // Confirmed: return session tokens once, then mark as used
    const access_token = data.access_token;
    const refresh_token = data.refresh_token;

    if (!access_token || !refresh_token) {
      return json({ status: "used" });
    }

    await supabase
      .from("telegram_login_tokens")
      .update({ status: "used", access_token: null, refresh_token: null })
      .eq("token", token);

    return json({ status: "confirmed", access_token, refresh_token });
  } catch (e) {
    console.error("telegram-check-login error:", e);
    return json({ error: "SERVICE_UNAVAILABLE", fallback: true });
  }
});
