import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ты — ИИ-ассистент LexTriage по российскому праву. Задавай уточняющие вопросы (по одному за раз), чтобы понять ситуацию пользователя: что произошло, когда, какие документы есть, сумма ущерба, город. После сбора достаточной информации (обычно 3-5 уточнений) — сформируй итоговое досье.

Отвечай кратко, по-человечески, на русском. Не давай юридических заключений как у адвоката — только базовые информационные рекомендации.

Когда информации достаточно для базовых рекомендаций — верни итог в формате tool call set_case_summary.`;

const tools = [
  {
    type: "function",
    function: {
      name: "set_case_summary",
      description:
        "Завершает сбор фактов и сохраняет структурированное досье по делу.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Категория: ДТП, Развод, Залив, Трудовой спор, Прочее",
          },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          problem_summary: { type: "string" },
          facts: {
            type: "object",
            description: "Ключевые факты: даты, суммы, документы, стороны.",
          },
          next_steps: {
            type: "array",
            items: { type: "string" },
            description: "3-5 базовых шагов для пользователя.",
          },
          estimated_damage: { type: "number" },
          city: { type: "string" },
        },
        required: ["category", "urgency", "problem_summary", "next_steps"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, caseId } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get or create case
    let currentCaseId = caseId as string | undefined;
    if (!currentCaseId) {
      const { data: created, error: createErr } = await admin
        .from("cases")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (createErr) throw createErr;
      currentCaseId = created.id;
    }

    // Save user message
    await admin
      .from("case_messages")
      .insert({ case_id: currentCaseId, role: "user", content: message });

    // Load history
    const { data: history } = await admin
      .from("case_messages")
      .select("role, content")
      .eq("case_id", currentCaseId)
      .order("created_at", { ascending: true });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call Lovable AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Превышен лимит запросов. Попробуйте позже." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Закончились AI-кредиты." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway failed");
    }

    const aiJson = await aiRes.json();
    const choice = aiJson.choices?.[0]?.message;
    let reply: string = choice?.content ?? "";
    let isComplete = false;
    let caseSummary: any = null;

    const toolCall = choice?.tool_calls?.[0];
    if (toolCall?.function?.name === "set_case_summary") {
      try {
        caseSummary = JSON.parse(toolCall.function.arguments);
        isComplete = true;
        if (!reply) {
          reply = "Я собрал достаточно информации. Подготовил для вас алгоритм действий — посмотрите план.";
        }

        await admin
          .from("cases")
          .update({
            category: caseSummary.category ?? null,
            urgency: caseSummary.urgency ?? null,
            problem_summary: caseSummary.problem_summary ?? null,
            facts: caseSummary.facts ?? {},
            next_steps: caseSummary.next_steps ?? [],
            estimated_damage: caseSummary.estimated_damage ?? null,
            city: caseSummary.city ?? null,
            is_fact_gathering_complete: true,
          })
          .eq("id", currentCaseId);
      } catch (e) {
        console.error("Failed to parse tool call", e);
      }
    }

    // Save assistant reply
    await admin
      .from("case_messages")
      .insert({ case_id: currentCaseId, role: "assistant", content: reply });

    const { data: caseRow } = await admin
      .from("cases")
      .select("*")
      .eq("id", currentCaseId)
      .single();

    return new Response(
      JSON.stringify({
        caseId: currentCaseId,
        reply,
        is_fact_gathering_complete: isComplete || caseRow?.is_fact_gathering_complete === true,
        case: caseRow,
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
