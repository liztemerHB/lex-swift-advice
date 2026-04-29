import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { PLANS, PLAN_ORDER, PlanId } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const { user } = useAuth();
  const { planId, refresh } = usePlan();
  const navigate = useNavigate();
  const [activating, setActivating] = useState<PlanId | null>(null);

  const activate = async (target: PlanId) => {
    if (!user) {
      navigate("/auth?tab=signup");
      return;
    }
    setActivating(target);
    try {
      const expires =
        target === "free"
          ? null
          : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({ plan: target, plan_expires_at: expires })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(
        target === "free"
          ? "Тариф изменён на Free"
          : `Тариф ${PLANS[target].name} активирован (демо)`
      );
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось активировать тариф");
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">LexAdvice</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Назад
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full glow-blue px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Тарифы LexAdvice
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Выберите подходящий план
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Начните бесплатно и переходите на расширенный тариф, когда нужно больше консультаций и
            документов.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const isCurrent = planId === id;
            return (
              <Card
                key={id}
                className={`relative flex flex-col p-6 ${
                  p.highlight ? "border-primary shadow-card" : ""
                }`}
              >
                {p.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Популярный
                  </Badge>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {p.priceRub === 0 ? "0" : p.priceRub.toLocaleString("ru-RU")}
                  </span>
                  <span className="text-sm text-muted-foreground">₽/мес</span>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full rounded-xl"
                  variant={p.highlight ? "hero" : "outline"}
                  disabled={isCurrent || activating !== null}
                  onClick={() => activate(id)}
                >
                  {activating === id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Текущий тариф"
                  ) : id === "free" ? (
                    "Перейти на Free"
                  ) : (
                    "Оформить (демо)"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Демонстрационный режим: оплата не списывается, тариф активируется мгновенно на 30 дней.
        </p>
      </main>
    </div>
  );
};

export default Pricing;
