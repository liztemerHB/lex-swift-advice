import { useEffect, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";

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
      // TODO: заменить на реальные запросы
      // const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      // const { data: leads } = await supabase.from('leads').select('price').eq('status', 'sold');

      await new Promise((r) => setTimeout(r, 300));
      setData({
        totalUsers: 1284,
        activeChats: 47,
        leadsSold: 312,
        revenue: 156000,
        deltas: { totalUsers: 12, activeChats: 8, leadsSold: 23, revenue: 18 },
        funnel: [
          { stage: "Регистрация", value: 1284 },
          { stage: "Чат начат", value: 892 },
          { stage: "PDF куплен", value: 421 },
          { stage: "Лид продан", value: 312 },
        ],
        categories: [
          { name: "ДТП", value: 38 },
          { name: "Развод", value: 24 },
          { name: "Залив", value: 22 },
          { name: "Прочее", value: 16 },
        ],
      });
      setLoading(false);
    };
    load();
  }, []);

  return { data, loading };
};
