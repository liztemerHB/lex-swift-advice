import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, PlanId, PlanConfig } from "@/config/plans";

interface UsageState {
  aiMessagesToday: number;
  documentsToday: number;
  documentsThisMonth: number;
}

interface PlanState {
  loading: boolean;
  plan: PlanConfig;
  planId: PlanId;
  planExpiresAt: string | null;
  bonusMessages: number;
  bonusDocuments: number;
  referralCode: string | null;
  referralsCount: number;
  usage: UsageState;
  remainingMessages: number | null; // null = unlimited
  remainingDocuments: number | null; // null = unlimited
  refresh: () => Promise<void>;
  consumeMessage: () => Promise<void>;
  consumeDocument: () => Promise<void>;
}

const todayUTC = () => new Date().toISOString().slice(0, 10);
const monthUTC = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

export const usePlan = (): PlanState => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [bonusMessages, setBonusMessages] = useState(0);
  const [bonusDocuments, setBonusDocuments] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralsCount, setReferralsCount] = useState(0);
  const [usage, setUsage] = useState<UsageState>({
    aiMessagesToday: 0,
    documentsToday: 0,
    documentsThisMonth: 0,
  });

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const day = todayUTC();
    const month = monthUTC();

    const [{ data: prof }, { data: ud }, { data: um }, { count: refs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan, plan_expires_at, referral_code, bonus_messages, bonus_documents")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("usage_daily")
        .select("ai_messages, documents")
        .eq("user_id", user.id)
        .eq("day", day)
        .maybeSingle(),
      supabase
        .from("usage_monthly")
        .select("documents")
        .eq("user_id", user.id)
        .eq("month", month)
        .maybeSingle(),
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id),
    ]);

    let activePlan: PlanId = (prof?.plan as PlanId) ?? "free";
    if (prof?.plan_expires_at && new Date(prof.plan_expires_at) < new Date()) {
      activePlan = "free";
    }
    setPlanId(activePlan);
    setPlanExpiresAt(prof?.plan_expires_at ?? null);
    setBonusMessages(prof?.bonus_messages ?? 0);
    setBonusDocuments(prof?.bonus_documents ?? 0);
    setReferralCode(prof?.referral_code ?? null);
    setReferralsCount(refs ?? 0);
    setUsage({
      aiMessagesToday: ud?.ai_messages ?? 0,
      documentsToday: ud?.documents ?? 0,
      documentsThisMonth: um?.documents ?? 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const plan = PLANS[planId];

  const remainingMessages =
    plan.dailyAiMessages == null
      ? null
      : Math.max(0, plan.dailyAiMessages + bonusMessages - usage.aiMessagesToday);

  const remainingDocuments = (() => {
    if (plan.dailyDocuments != null) {
      return Math.max(0, plan.dailyDocuments + bonusDocuments - usage.documentsToday);
    }
    if (plan.monthlyDocuments != null) {
      return Math.max(0, plan.monthlyDocuments + bonusDocuments - usage.documentsThisMonth);
    }
    return null;
  })();

  const consumeMessage = useCallback(async () => {
    if (!user) return;
    const day = todayUTC();
    // upsert + increment
    const { data: existing } = await supabase
      .from("usage_daily")
      .select("id, ai_messages")
      .eq("user_id", user.id)
      .eq("day", day)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("usage_daily")
        .update({ ai_messages: existing.ai_messages + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("usage_daily").insert({
        user_id: user.id,
        day,
        ai_messages: 1,
      });
    }
    setUsage((u) => ({ ...u, aiMessagesToday: u.aiMessagesToday + 1 }));
  }, [user]);

  const consumeDocument = useCallback(async () => {
    if (!user) return;
    const day = todayUTC();
    const month = monthUTC();

    const { data: ed } = await supabase
      .from("usage_daily")
      .select("id, documents")
      .eq("user_id", user.id)
      .eq("day", day)
      .maybeSingle();
    if (ed) {
      await supabase.from("usage_daily").update({ documents: ed.documents + 1 }).eq("id", ed.id);
    } else {
      await supabase.from("usage_daily").insert({ user_id: user.id, day, documents: 1 });
    }

    const { data: em } = await supabase
      .from("usage_monthly")
      .select("id, documents")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();
    if (em) {
      await supabase.from("usage_monthly").update({ documents: em.documents + 1 }).eq("id", em.id);
    } else {
      await supabase.from("usage_monthly").insert({ user_id: user.id, month, documents: 1 });
    }

    setUsage((u) => ({
      ...u,
      documentsToday: u.documentsToday + 1,
      documentsThisMonth: u.documentsThisMonth + 1,
    }));
  }, [user]);

  return {
    loading,
    plan,
    planId,
    planExpiresAt,
    bonusMessages,
    bonusDocuments,
    referralCode,
    referralsCount,
    usage,
    remainingMessages,
    remainingDocuments,
    refresh: load,
    consumeMessage,
    consumeDocument,
  };
};
