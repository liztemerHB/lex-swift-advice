import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, Briefcase, MessageSquare, FolderOpen, CheckCircle2, Loader2, UserCog } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import CategoryChart from "@/components/admin/CategoryChart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [profilesRes, rolesRes, casesRes, msgsRes, leadsRes, purchasesRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("user_roles").select("role, user_id"),
        supabase.from("cases").select("id, category, urgency, city, is_fact_gathering_complete, created_at"),
        supabase.from("case_messages").select("id, role, created_at"),
        supabase.from("leads").select("id, status, category, city"),
        supabase.from("lead_purchases").select("id, lead_id, lawyer_id, created_at"),
      ]);

      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const cases = casesRes.data ?? [];
      const msgs = msgsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const purchases = purchasesRes.data ?? [];

      const roleCount = { admin: 0, lawyer: 0, client: 0 };
      roles.forEach((r: any) => { roleCount[r.role as keyof typeof roleCount] = (roleCount[r.role as keyof typeof roleCount] || 0) + 1; });

      // регистрации по дням (14 дней)
      const days: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      profiles.forEach((p: any) => {
        const k = p.created_at?.slice(0, 10);
        if (k in days) days[k]++;
      });
      const regSeries = Object.entries(days).map(([date, value]) => ({ date: date.slice(5), value }));

      // категории дел
      const catMap = new Map<string, number>();
      cases.forEach((c: any) => {
        const k = c.category || "Прочее";
        catMap.set(k, (catMap.get(k) ?? 0) + 1);
      });
      const categories = Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

      // города
      const cityMap = new Map<string, number>();
      cases.forEach((c: any) => {
        if (!c.city) return;
        cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + 1);
      });
      const cities = Array.from(cityMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

      // срочность
      const urgMap = new Map<string, number>();
      cases.forEach((c: any) => {
        const k = c.urgency || "не указана";
        urgMap.set(k, (urgMap.get(k) ?? 0) + 1);
      });
      const urgency = Array.from(urgMap.entries()).map(([name, value]) => ({ name, value }));

      const userMsgs = msgs.filter((m: any) => m.role === "user").length;
      const aiMsgs = msgs.filter((m: any) => m.role === "assistant").length;
      const completeCases = cases.filter((c: any) => c.is_fact_gathering_complete).length;
      const leadsTransferred = purchases.length;

      setStats({
        totalUsers: profiles.length,
        roleCount,
        cases: cases.length,
        completeCases,
        msgs: msgs.length,
        userMsgs,
        aiMsgs,
        leadsTotal: leads.length,
        leadsTransferred,
        regSeries,
        categories: categories.length ? categories : [{ name: "Нет данных", value: 1 }],
        cities,
        urgency,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Аналитика использования</h2>
        <p className="mt-1 text-sm text-muted-foreground">Подробные метрики по пользователям, ролям и активности</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Users} label="Всего пользователей" value={stats.totalUsers} />
        <MetricCard icon={Shield} label="Администраторов" value={stats.roleCount.admin} />
        <MetricCard icon={Briefcase} label="Юристов" value={stats.roleCount.lawyer} />
        <MetricCard icon={UserCog} label="Клиентов" value={stats.roleCount.client} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={FolderOpen} label="Всего дел" value={stats.cases} />
        <MetricCard icon={CheckCircle2} label="Досье собрано" value={stats.completeCases} />
        <MetricCard icon={MessageSquare} label="Сообщений в чатах" value={stats.msgs} />
        <MetricCard icon={Briefcase} label="Передано юристам" value={stats.leadsTransferred} />
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Регистрации за 14 дней</h3>
        <p className="mb-4 text-xs text-muted-foreground">Новые пользователи по дням</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats.regSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Категории дел</h3>
          <p className="mb-4 text-xs text-muted-foreground">Распределение обращений</p>
          <CategoryChart data={stats.categories} />
        </Card>
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Активность чата</h3>
          <p className="mb-4 text-xs text-muted-foreground">Сообщения пользователей и ответы AI</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { name: "Пользователи", value: stats.userMsgs },
              { name: "AI", value: stats.aiMsgs },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Топ городов</h3>
          <p className="mb-4 text-xs text-muted-foreground">Где больше всего обращений</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.cities} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Срочность</h3>
          <p className="mb-4 text-xs text-muted-foreground">Распределение по приоритету</p>
          <CategoryChart data={stats.urgency.length ? stats.urgency : [{ name: "Нет данных", value: 1 }]} />
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
