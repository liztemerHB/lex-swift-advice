import { Users, MessageSquare, ShoppingBag, Wallet, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import MetricCard from "@/components/admin/MetricCard";
import FunnelChart from "@/components/admin/FunnelChart";
import CategoryChart from "@/components/admin/CategoryChart";
import { useMetrics } from "@/hooks/useMetrics";

const Overview = () => {
  const { data, loading } = useMetrics();

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Обзор</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ключевые метрики платформы за последние 7 дней</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Всего пользователей" value={data.totalUsers.toLocaleString("ru-RU")} delta={data.deltas.totalUsers} />
        <MetricCard icon={MessageSquare} label="Активные чаты" value={data.activeChats} delta={data.deltas.activeChats} />
        <MetricCard icon={ShoppingBag} label="Продано лидов" value={data.leadsSold} delta={data.deltas.leadsSold} />
        <MetricCard icon={Wallet} label="Выручка" value={`${data.revenue.toLocaleString("ru-RU")} ₽`} delta={data.deltas.revenue} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Воронка конверсии</h3>
          <p className="mb-4 text-xs text-muted-foreground">От регистрации до продажи лида</p>
          <FunnelChart data={data.funnel} />
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Категории дел</h3>
          <p className="mb-4 text-xs text-muted-foreground">Распределение обращений по типу</p>
          <CategoryChart data={data.categories} />
        </Card>
      </div>
    </div>
  );
};

export default Overview;
