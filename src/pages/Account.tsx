import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Save,
  KeyRound,
  Coins,
  Wallet,
  FileText,
  Briefcase,
  CheckCircle2,
  Scale,
  LogOut,
  Zap,
  Copy,
  Users,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { PLANS } from "@/config/plans";

type Credits = { credits_total: number; credits_remaining: number; balance_rub: number };
type Purchase = { id: string; document_type: string; title: string | null; price_rub: number; created_at: string };
type CaseRow = { id: string; category: string | null; problem_summary: string | null; created_at: string; urgency: string | null };
type LeadPurchase = { id: string; price_rub: number; created_at: string; lead_id: string };

const Account = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const planState = usePlan();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credits, setCredits] = useState<Credits>({ credits_total: 100, credits_remaining: 100, balance_rub: 0 });

  // client data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);

  // lawyer data
  const [leadPurchases, setLeadPurchases] = useState<LeadPurchase[]>([]);
  const [availableLeads, setAvailableLeads] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        setFullName(prof.full_name ?? "");
        setEmail(prof.email ?? user.email ?? "");
      } else {
        setEmail(user.email ?? "");
      }

      const { data: cr } = await supabase
        .from("user_credits")
        .select("credits_total, credits_remaining, balance_rub")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cr) setCredits(cr as any);

      if (role === "lawyer") {
        const [{ data: lp }, { count }] = await Promise.all([
          supabase
            .from("lead_purchases")
            .select("id, price_rub, created_at, lead_id")
            .eq("lawyer_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "available"),
        ]);
        setLeadPurchases((lp ?? []) as any);
        setAvailableLeads(count ?? 0);
      } else {
        const [{ data: pu }, { data: cs }] = await Promise.all([
          supabase
            .from("document_purchases")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("cases")
            .select("id, category, problem_summary, created_at, urgency")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);
        setPurchases((pu ?? []) as any);
        setCases((cs ?? []) as any);
      }
      setLoading(false);
    };
    load();
  }, [user, role]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: { full_name?: string; password?: string; email?: string } = {};
      if (fullName) updates.full_name = fullName;
      if (email && email !== user.email) updates.email = email;
      if (newPassword) updates.password = newPassword;

      // user metadata + password via auth.updateUser (works for self)
      const authUpdates: any = {};
      if (updates.password) authUpdates.password = updates.password;
      if (updates.email) authUpdates.email = updates.email;
      if (updates.full_name !== undefined) authUpdates.data = { full_name: updates.full_name };

      if (Object.keys(authUpdates).length > 0) {
        const { error } = await supabase.auth.updateUser(authUpdates);
        if (error) throw error;
      }

      if (updates.full_name !== undefined) {
        await supabase.from("profiles").update({ full_name: updates.full_name }).eq("id", user.id);
      }

      toast.success("Изменения сохранены");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalSpent = leadPurchases.reduce((s, p) => s + p.price_rub, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">LexAdvice</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Назад
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Личный кабинет</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <Badge variant={role === "lawyer" ? "secondary" : "outline"}>
            {role === "lawyer" ? "Юрист" : role === "admin" ? "Админ" : "Клиент"}
          </Badge>
        </div>

        {/* Stats */}
        {role === "lawyer" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Briefcase className="h-3.5 w-3.5" />} label="Дел взято" value={leadPurchases.length} />
            <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Доступно лидов" value={availableLeads} />
            <StatCard icon={<Wallet className="h-3.5 w-3.5" />} label="Потрачено" value={`${totalSpent} ₽`} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Coins className="h-3.5 w-3.5" />}
              label="Кредиты"
              value={`${credits.credits_remaining} / ${credits.credits_total}`}
            />
            <StatCard icon={<Wallet className="h-3.5 w-3.5" />} label="Баланс" value={`${credits.balance_rub} ₽`} />
            <StatCard icon={<FileText className="h-3.5 w-3.5" />} label="Дел создано" value={cases.length} />
          </div>
        )}

        {/* Plan card (clients only) */}
        {role !== "lawyer" && role !== "admin" && (
          <Card className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Текущий тариф
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{planState.plan.name}</span>
                  <Badge variant={planState.planId === "free" ? "outline" : "secondary"}>
                    {planState.plan.priceRub === 0
                      ? "Бесплатно"
                      : `${planState.plan.priceRub.toLocaleString("ru-RU")} ₽/мес`}
                  </Badge>
                </div>
                {planState.planExpiresAt && planState.planId !== "free" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Активен до {new Date(planState.planExpiresAt).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
              <Button asChild variant="hero" size="sm" className="rounded-lg">
                <Link to="/pricing">
                  <Zap className="h-4 w-4" />
                  {planState.planId === "unlimited" ? "Сменить" : "Улучшить"}
                </Link>
              </Button>
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageRow
                label="Сообщения ИИ сегодня"
                used={planState.usage.aiMessagesToday}
                limit={planState.plan.dailyAiMessages}
                bonus={planState.bonusMessages}
              />
              <UsageRow
                label={
                  planState.plan.dailyDocuments != null
                    ? "Документы сегодня"
                    : "Документы в этом месяце"
                }
                used={
                  planState.plan.dailyDocuments != null
                    ? planState.usage.documentsToday
                    : planState.usage.documentsThisMonth
                }
                limit={planState.plan.dailyDocuments ?? planState.plan.monthlyDocuments}
                bonus={planState.bonusDocuments}
              />
            </div>
          </Card>
        )}

        {/* Referral card */}
        {role !== "admin" && planState.referralCode && (
          <Card className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Пригласи друга
              </h2>
            </div>
            <p className="text-sm text-foreground">
              Поделитесь ссылкой — друг получит +5 сообщений ИИ при регистрации, и вы тоже.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <code className="flex-1 truncate text-xs">
                {`${window.location.origin}/auth?tab=signup&ref=${planState.referralCode}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/auth?tab=signup&ref=${planState.referralCode}`
                  );
                  toast.success("Ссылка скопирована");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Приглашено друзей: <b className="text-foreground">{planState.referralsCount}</b>
              </span>
              <span>
                Бонусные сообщения: <b className="text-foreground">{planState.bonusMessages}</b>
              </span>
            </div>
          </Card>
        )}

        {/* Profile edit */}
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Регистрационные данные
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Имя</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="new_password" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Новый пароль
            </Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Оставьте пустым, чтобы не менять"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={saveProfile} disabled={saving} variant="hero">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </Button>
        </Card>

        {/* Lawyer: purchased leads */}
        {role === "lawyer" && (
          <>
            <Card className="shadow-card">
              <div className="p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Купленные лиды ({leadPurchases.length})
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>ID лида</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        Пока нет покупок
                      </TableCell>
                    </TableRow>
                  ) : (
                    leadPurchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.lead_id.slice(0, 8)}…</TableCell>
                        <TableCell className="text-right font-medium">{p.price_rub} ₽</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            <Button asChild variant="outline">
              <Link to="/lawyer">
                <Briefcase className="h-4 w-4" /> Перейти к доске лидов
              </Link>
            </Button>
          </>
        )}

        {/* Client: cases + purchases */}
        {role !== "lawyer" && (
          <>
            <Card className="shadow-card">
              <div className="p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Мои дела ({cases.length})
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        Пока нет дел
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell>{c.category ?? "—"}</TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm">
                          {c.problem_summary ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="shadow-card">
              <div className="p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Купленные документы ({purchases.length})
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Пока нет покупок
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell>{p.document_type}</TableCell>
                        <TableCell>{p.title ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">{p.price_rub} ₽</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
  </Card>
);

export default Account;
