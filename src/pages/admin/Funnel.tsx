import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import FunnelChart from "@/components/admin/FunnelChart";

const Funnel = () => {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<{ stage: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [profilesRes, casesRes, leadsRes, leadPurchasesRes, docPurchasesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cases").select("id, is_fact_gathering_complete"),
        supabase.from("leads").select("id, status"),
        supabase.from("lead_purchases").select("id", { count: "exact", head: true }),
        supabase.from("document_purchases").select("id", { count: "exact", head: true }),
      ]);

      const registered = profilesRes.count ?? 0;
      const cases = casesRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const leadsBought = leadPurchasesRes.count ?? 0;
      const docsBought = docPurchasesRes.count ?? 0;

      const startedChat = cases.length;
      const dossierComplete = cases.filter((c: any) => c.is_fact_gathering_complete).length;
      const leadsCreated = leads.length;

      setStages([
        { stage: "Зарегистрировались", value: registered },
        { stage: "Начали чат", value: startedChat },
        { stage: "Досье готово", value: dossierComplete },
        { stage: "Лид создан", value: leadsCreated },
        { stage: "Лид куплен юристом", value: leadsBought },
        { stage: "Купили документ", value: docsBought },
      ]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Воронка продаж</h2>
        <p className="mt-1 text-sm text-muted-foreground">От регистрации до оплаты</p>
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Этапы воронки</h3>
        <FunnelChart data={stages} />
      </Card>

      <Card className="p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Конверсии между этапами</h3>
        <div className="space-y-3">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].value : null;
            const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
            const fromStart = Math.round((s.value / (stages[0].value || 1)) * 100);
            return (
              <div key={s.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{s.stage}</span>
                  <span className="text-muted-foreground">
                    {s.value.toLocaleString("ru-RU")}
                    {conv !== null && <span className="ml-2 text-xs">({conv}% от пред.)</span>}
                    <span className="ml-2 text-xs text-primary">{fromStart}% от старта</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(s.value / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Funnel;
