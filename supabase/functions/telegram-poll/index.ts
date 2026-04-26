import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

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
  // Look up token
  const { data: row, error } = await supabase
    .from("telegram_login_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) {
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

  // Look for existing telegram_link
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
    // Reset password so we can sign in deterministically
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

  // Sign in to get session tokens
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

  await sendMessage(
    chat_id,
    "✅ Готово! Вернитесь на сайт LexAdvice — вы автоматически вошли в аккаунт.",
  );
}

Deno.serve(async () => {
  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let processed = 0;
  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();
  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }
  let offset: number = state.update_offset;

  while (true) {
    const remaining = MAX_RUNTIME_MS - (Date.now() - start);
    if (remaining < MIN_REMAINING_MS) break;
    const timeout = Math.min(50, Math.floor(remaining / 1000) - 5);
    if (timeout < 1) break;

    let resp;
    try {
      resp = await tg("getUpdates", { offset, timeout, allowed_updates: ["message"] });
    } catch (e) {
      console.error("getUpdates failed:", e);
      break;
    }

    const updates = resp.result ?? [];
    if (updates.length === 0) continue;

    for (const u of updates) {
      const msg = u.message;
      if (!msg) continue;
      const chat_id = msg.chat.id;
      const text: string = msg.text ?? "";
      const username = msg.from?.username;

      try {
        await supabase.from("telegram_messages").upsert(
          { update_id: u.update_id, chat_id, text, raw_update: u },
          { onConflict: "update_id" },
        );
      } catch (e) {
        console.error("store message failed:", e);
      }

      if (text.startsWith("/start ")) {
        const token = text.slice("/start ".length).trim();
        if (token) await handleStart(supabase, chat_id, username, token);
      } else if (text === "/start") {
        await sendMessage(
          chat_id,
          "👋 Это бот LexAdvice. Откройте сайт и нажмите «Войти через Telegram», чтобы войти в аккаунт.",
        );
      }

      processed++;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);
    offset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed, offset }), {
    headers: { "Content-Type": "application/json" },
  });
});
