import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("telegram_login_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ status: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(data.expires_at).getTime() < Date.now() && data.status === "pending") {
      await supabase.from("telegram_login_tokens").update({ status: "expired" }).eq("token", token);
      return new Response(JSON.stringify({ status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.status !== "confirmed") {
      return new Response(JSON.stringify({ status: data.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirmed: return session tokens once, then mark as used
    const access_token = data.access_token;
    const refresh_token = data.refresh_token;

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ status: "error", message: "missing session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("telegram_login_tokens")
      .update({ status: "used", access_token: null, refresh_token: null })
      .eq("token", token);

    return new Response(
      JSON.stringify({ status: "confirmed", access_token, refresh_token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("telegram-check-login error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
