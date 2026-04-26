import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, CreditCard, ShoppingBag, TrendingUp, Loader2, FileText } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart } from "recharts";

const Finance = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [creditsRes, profilesRes, leadPurchasesRes, docPurchasesRes] = await Promise.all([
        supabase.from("user_credits").select("*"),
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("lead_purchases").select("*"),
        supabase.from("document_purchases").select("*"),
      ]);

      const credits = creditsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const leadPurchases = leadPurchasesRes.data ?? [];
      const docPurchases = docPurchasesRes.data ?? [];

      const profMap = new Map(profiles.map((p: any) => [p.id, p]));

      const totalBalance = credits.reduce((s: number, c: any) => s + (c.balance_rub || 0), 0);
      const totalCreditsUsed = credits.reduce((s: number, c: any) => s + ((c.credits_total || 0) - (c.credits_remaining || 0)), 0);
      const totalCreditsAlloc = credits.reduce((s: number, c: any) => s + (c.credits_total || 0), 0);
      const leadRevenue = leadPurchases.reduce((s: number, p: any) => s + (p.price_rub || 0), 0);
      const docRevenue = docPurchases.reduce((s: number, p: any) => s + (p.price_rub || 0), 0);

      // выручка за 14 дней
      const days: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      [...leadPurchases, ...docPurchases].forEach((p: any) => {
        const k = p.created_at?.slice(0, 10);
        if (k in days) days[k] += p.price_rub || 0;
      });
      const revSeries = Object.entries(days).map(([date, value]) => ({ date: date.slice(5), value }));

      const topCredits = credits
        .map((c: any) => ({ ...c, profile: profMap.get(c.user_id) }))
        .sort((a: any, b: any) => (b.credits_total - b.credits_remaining) - (a.credits_total - a.credits_remaining))
        .slice(0, 10);

      setData({
        totalBalance,
        totalCreditsUsed,
        totalCreditsAlloc,
        leadRevenue,
        docRevenue,
        leadCount: leadPurchases.length,
        docCount: docPurchases.length,
        revSeries,
        topCredits,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !data) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Финансы и кредиты</h2>
        <p className="mt-1 text-sm text-muted-foreground">Оплаты, кредиты пользователей и выручка</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Wallet} label="Сумма балансов" value={`${data.totalBalance.toLocaleString("ru-RU")} ₽`} />
        <MetricCard icon={TrendingUp} label="Выручка с лидов" value={`${data.leadRevenue.toLocaleString("ru-RU")} ₽`} />
        <MetricCard icon={FileText} label="Выручка с документов" value={`${data.docRevenue.toLocaleString("ru-RU")} ₽`} />
        <MetricCard icon={CreditCard} label="Кредитов использовано" value={`${data.totalCreditsUsed} / ${data.totalCreditsAlloc}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Выручка за 14 дней</h3>
          <p className="mb-4 text-xs text-muted-foreground">Сумма всех оплат по дням</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.revSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Структура продаж</h3>
          <p className="mb-4 text-xs text-muted-foreground">Сравнение выручки и количества</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { name: "Лиды", count: data.leadCount, revenue: data.leadRevenue },
              { name: "Документы", count: data.docCount, revenue: data.docRevenue },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Выручка ₽" />
              <Bar dataKey="count" fill="hsl(217 91% 74%)" radius={[6, 6, 0, 0]} name="Кол-во" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Топ пользователей по использованию кредитов</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Кредиты</TableHead>
              <TableHead className="text-right">Использовано</TableHead>
              <TableHead className="text-right">Баланс ₽</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topCredits.map((c: any) => (
              <TableRow key={c.user_id}>
                <TableCell className="font-medium">{c.profile?.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.profile?.email || "—"}</TableCell>
                <TableCell className="text-right">{c.credits_remaining} / {c.credits_total}</TableCell>
                <TableCell className="text-right">{c.credits_total - c.credits_remaining}</TableCell>
                <TableCell className="text-right">{(c.balance_rub || 0).toLocaleString("ru-RU")}</TableCell>
              </TableRow>
            ))}
            {data.topCredits.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Finance;
