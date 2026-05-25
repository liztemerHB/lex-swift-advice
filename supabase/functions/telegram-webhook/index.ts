import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${apiKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function tg(method: string, body: unknown) {
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`tg ${method} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function sendMessage(chat_id: number, text: string) {
  try {
    await tg("sendMessage", { chat_id, text, parse_mode: "HTML" });
  } catch (e) {
    console.error("sendMessage failed:", e);
  }
}

async function handleStart(supabase: any, chat_id: number, username: string | undefined, token: string) {
  const { data: row } = await supabase
    .from("telegram_login_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row) {
    await sendMessage(chat_id, "❌ Ссылка недействительна. Откройте сайт LexAdvice заново.");
    return;
  }
  if (row.status !== "pending") {
    await sendMessage(chat_id, "⚠️ Эта ссылка уже использована или истекла.");
    return;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("telegram_login_tokens").update({ status: "expired" }).eq("token", token);
    await sendMessage(chat_id, "⏱ Срок действия ссылки истёк. Откройте сайт и попробуйте снова.");
    return;
  }

  const { data: existingLink } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chat_id)
    .maybeSingle();

  let userId: string;
  let email: string;
  const password = crypto.randomUUID() + crypto.randomUUID();

  if (existingLink) {
    userId = existingLink.user_id;
    const { error: upErr } = await supabase.auth.admin.updateUserById(userId, { password });
    if (upErr) {
      console.error("updateUserById failed:", upErr);
      await sendMessage(chat_id, "Произошла ошибка. Попробуйте позже.");
      return;
    }
    const { data: udata } = await supabase.auth.admin.getUserById(userId);
    email = udata.user?.email ?? `tg_${chat_id}@lexadvice.local`;
  } else {
    email = `tg_${chat_id}@lexadvice.local`;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: username ? `@${username}` : `Telegram ${chat_id}`,
        telegram_chat_id: chat_id,
        telegram_username: username ?? null,
      },
    });
    if (createErr || !created.user) {
      console.error("createUser failed:", createErr);
      await sendMessage(chat_id, "Не удалось создать аккаунт. Попробуйте позже.");
      return;
    }
    userId = created.user.id;
    await supabase.from("telegram_links").insert({
      user_id: userId,
      chat_id,
      telegram_username: username ?? null,
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: signin, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signin.session) {
    console.error("signIn failed:", signErr);
    await sendMessage(chat_id, "Не удалось завершить вход. Попробуйте позже.");
    return;
  }

  await supabase
    .from("telegram_login_tokens")
    .update({
      status: "confirmed",
      chat_id,
      telegram_username: username ?? null,
      user_id: userId,
      access_token: signin.session.access_token,
      refresh_token: signin.session.refresh_token,
    })
    .eq("token", token);

  await sendMessage(chat_id, "✅ Готово! Вернитесь на сайт LexAdvice — вы автоматически вошли в аккаунт.");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const apiKey = Deno.env.get("TELEGRAM_API_KEY")!;
  const expected = await deriveSecret(apiKey);
  const actual = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "Content-Type": "application/json" } });
  }

  const msg = update.message ?? update.edited_message;
  if (!msg?.chat?.id || typeof update.update_id !== "number") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "Content-Type": "application/json" } });
  }

  const chat_id = msg.chat.id;
  const text: string = msg.text ?? "";
  const username = msg.from?.username;

  try {
    await supabase.from("telegram_messages").upsert(
      { update_id: update.update_id, chat_id, text, raw_update: update },
      { onConflict: "update_id" },
    );
  } catch (e) {
    console.error("store message failed:", e);
  }

  try {
    if (text.startsWith("/start ")) {
      const token = text.slice("/start ".length).trim();
      if (token) await handleStart(supabase, chat_id, username, token);
    } else if (text === "/start") {
      await sendMessage(chat_id, "👋 Это бот LexAdvice. Откройте сайт и нажмите «Войти через Telegram», чтобы войти в аккаунт.");
    }
  } catch (e) {
    console.error("handler error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
