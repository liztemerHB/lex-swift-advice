import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  totalUsers: number;
  activeChats: number;
  leadsSold: number;
  revenue: number;
  deltas: { totalUsers: number; activeChats: number; leadsSold: number; revenue: number };
  funnel: { stage: string; value: number }[];
  categories: { name: string; value: number }[];
}

export const useMetrics = () => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profilesRes, casesRes, leadsRes, purchasesRes] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("cases").select("category, is_fact_gathering_complete", { count: "exact" }),
          supabase.from("leads").select("status, price_rub", { count: "exact" }),
          supabase.from("lead_purchases").select("price_rub", { count: "exact" }),
        ]);

        const totalUsers = profilesRes.count ?? 0;
        const cases = casesRes.data ?? [];
        const leads = leadsRes.data ?? [];
        const purchases = purchasesRes.data ?? [];

        const activeChats = cases.filter((c: any) => !c.is_fact_gathering_complete).length;
        const leadsSold = leads.filter((l: any) => l.status === "sold").length;
        const revenue = purchases.reduce((s: number, p: any) => s + (p.price_rub ?? 0), 0);

        const completeCases = cases.filter((c: any) => c.is_fact_gathering_complete).length;
        const funnel = [
          { stage: "Регистрация", value: totalUsers },
          { stage: "Чат начат", value: cases.length },
          { stage: "Досье собрано", value: completeCases },
          { stage: "Лид продан", value: leadsSold },
        ];

        const catMap = new Map<string, number>();
        cases.forEach((c: any) => {
          const k = c.category || "Прочее";
          catMap.set(k, (catMap.get(k) ?? 0) + 1);
        });
        const categories = Array.from(catMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        setData({
          totalUsers,
          activeChats,
          leadsSold,
          revenue,
          deltas: { totalUsers: 0, activeChats: 0, leadsSold: 0, revenue: 0 },
          funnel,
          categories: categories.length ? categories : [{ name: "Нет данных", value: 1 }],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { data, loading };
};
