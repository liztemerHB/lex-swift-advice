import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Save, KeyRound, Coins, Wallet, FileText, Shield } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; email: string | null; full_name: string | null; created_at: string };
type Credits = { credits_total: number; credits_remaining: number; balance_rub: number };
type Purchase = { id: string; document_type: string; title: string | null; price_rub: number; created_at: string };
type Role = "admin" | "client" | "lawyer";

const ALL_ROLES: Role[] = ["admin", "lawyer", "client"];
const roleLabel = (r: string) => (r === "admin" ? "Админ" : r === "lawyer" ? "Юрист" : "Клиент");

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<Credits>({ credits_total: 100, credits_remaining: 100, balance_rub: 0 });
  const [roles, setRoles] = useState<Role[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [casesCount, setCasesCount] = useState(0);

  // Editable
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: prof }, { data: cr }, { data: rl }, { data: pu }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_credits").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id),
        supabase.from("document_purchases").select("*").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", id),
      ]);
      if (prof) {
        setProfile(prof as any);
        setFullName(prof.full_name ?? "");
        setEmail(prof.email ?? "");
      }
      if (cr) setCredits(cr as any);
      else {
        // create on the fly
        await supabase.from("user_credits").insert({ user_id: id });
      }
      setRoles(((rl ?? []) as any[]).map((r) => r.role));
      setPurchases((pu ?? []) as any);
      setCasesCount(count ?? 0);
      setLoading(false);
    };
    load();
  }, [id]);

  const saveProfile = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("admin-update-user", {
        body: {
          target_user_id: id,
          full_name: fullName,
          email: email !== profile?.email ? email : undefined,
          password: newPassword || undefined,
        },
      });
      if (error) throw error;
      toast.success("Профиль сохранён");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const saveCredits = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_credits")
      .upsert({ user_id: id, ...credits }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Баланс обновлён");
  };

  const toggleRole = async (r: Role) => {
    if (!id) return;
    const has = roles.includes(r);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", r);
      if (error) return toast.error(error.message);
      setRoles(roles.filter((x) => x !== r));
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: r });
      if (error) return toast.error(error.message);
      setRoles([...roles, r]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4" /> Назад
        </Button>
        <Card className="p-8 text-center text-muted-foreground">Пользователь не найден</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{fullName || "Без имени"}</h2>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <Badge key={r} variant={r === "admin" ? "default" : r === "lawyer" ? "secondary" : "outline"}>
              {roleLabel(r)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-3.5 w-3.5" /> Кредиты
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {credits.credits_remaining}
            <span className="text-sm font-normal text-muted-foreground"> / {credits.credits_total}</span>
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Баланс
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{credits.balance_rub} ₽</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Дела
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{casesCount}</p>
        </Card>
      </div>

      {/* Profile */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Регистрационные данные</h3>
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
          Сохранить профиль
        </Button>
      </Card>

      {/* Credits & balance */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Кредиты и баланс</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Всего кредитов</Label>
            <Input
              type="number"
              value={credits.credits_total}
              onChange={(e) => setCredits({ ...credits, credits_total: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Осталось</Label>
            <Input
              type="number"
              value={credits.credits_remaining}
              onChange={(e) => setCredits({ ...credits, credits_remaining: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Баланс, ₽</Label>
            <Input
              type="number"
              value={credits.balance_rub}
              onChange={(e) => setCredits({ ...credits, balance_rub: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button onClick={saveCredits} disabled={saving} variant="hero">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить баланс
        </Button>
      </Card>

      {/* Roles */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Роли
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((r) => {
            const active = roles.includes(r);
            return (
              <Button
                key={r}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => toggleRole(r)}
              >
                {active ? "✓ " : ""}{roleLabel(r)}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Purchases */}
      <Card className="shadow-card">
        <div className="p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Купленные документы ({purchases.length})
          </h3>
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
                  Покупок пока нет
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
    </div>
  );
};

export default UserDetail;
