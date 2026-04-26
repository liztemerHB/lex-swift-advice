// Admin-only edge function to update auth user (password / email / metadata)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "no auth" }, 401);

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const { target_user_id, password, email, full_name } = body ?? {};
    if (!target_user_id) return json({ error: "target_user_id required" }, 400);

    const updates: Record<string, unknown> = {};
    if (password) updates.password = password;
    if (email) updates.email = email;
    if (full_name !== undefined) updates.user_metadata = { full_name };

    if (Object.keys(updates).length === 0) return json({ error: "nothing to update" }, 400);

    const { error: upErr } = await admin.auth.admin.updateUserById(target_user_id, updates);
    if (upErr) return json({ error: upErr.message }, 400);

    if (full_name !== undefined || email) {
      await admin
        .from("profiles")
        .update({
          ...(full_name !== undefined ? { full_name } : {}),
          ...(email ? { email } : {}),
        })
        .eq("id", target_user_id);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
