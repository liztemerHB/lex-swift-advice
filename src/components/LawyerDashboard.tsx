import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scale, Briefcase, Loader2, MapPin, Phone, LogOut, UserCircle2, MessageCircle, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const urgencyMap: Record<string, { label: string; color: string }> = {
  high: { label: "Высокий", color: "bg-destructive/10 text-destructive" },
  medium: { label: "Средний", color: "bg-amber-50 text-amber-600" },
  low: { label: "Низкий", color: "bg-emerald-50 text-emerald-600" },
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Ошибка покупки");

const LawyerDashboard = () => {
  const { leads, loading, purchase } = useLeads();
  const { signOut, user } = useAuth();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealedContacts, setRevealedContacts] = useState<Record<string, string>>({});
  const [threadByLead, setThreadByLead] = useState<Record<string, string>>({});
  const [purchasedLeadIds, setPurchasedLeadIds] = useState<Set<string>>(new Set());
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lawyer_profiles")
      .select("completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileCompleted(data?.completed ?? false));
    Promise.all([
      supabase.from("chat_threads").select("id, lead_id").eq("lawyer_id", user.id),
      supabase.from("lead_purchases").select("lead_id").eq("lawyer_id", user.id),
      supabase.from("lead_contacts").select("lead_id, contact"),
    ]).then(([threadsRes, purchasesRes, contactsRes]) => {
        const map: Record<string, string> = {};
        (threadsRes.data ?? []).forEach((t) => { if (t.lead_id) map[t.lead_id] = t.id; });
        setThreadByLead(map);

        const purchased = new Set<string>((purchasesRes.data ?? []).map((p) => p.lead_id));
        setPurchasedLeadIds(purchased);

        const contacts: Record<string, string> = {};
        (contactsRes.data ?? []).forEach((c) => {
          if (c.lead_id && purchased.has(c.lead_id)) contacts[c.lead_id] = c.contact;
        });
        setRevealedContacts(contacts);
      });
  }, [user]);

  const handleConfirm = async () => {
    if (!confirmId) return;
    setBusy(true);
    try {
      const res = await purchase(confirmId);
      if (res.contact) setRevealedContacts((p) => ({ ...p, [confirmId]: res.contact! }));
      setPurchasedLeadIds((p) => new Set(p).add(confirmId));
      if (res.threadId) setThreadByLead((p) => ({ ...p, [confirmId]: res.threadId! }));
      toast.success(res.alreadyPurchased ? "Контакты уже открыты" : "Контакты открыты");
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Панель юриста</p>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/lawyer/profile" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Мой профиль">
            <IdCard className="h-4 w-4" />
          </Link>
          <Link to="/chats" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Чаты">
            <MessageCircle className="h-4 w-4" />
          </Link>
          <Link to="/account" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Кабинет">
            <UserCircle2 className="h-4 w-4" />
          </Link>
          <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Выйти">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {profileCompleted === false && (
          <Link
            to="/lawyer/profile"
            className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 hover:bg-amber-100"
          >
            <span>Заполните профиль — клиенты увидят, кто им помогает</span>
            <IdCard className="h-4 w-4 shrink-0" />
          </Link>
        )}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Доступно", value: leads.filter((l) => l.status === "available").length, accent: true },
            { label: "Куплено", value: purchasedLeadIds.size },
            { label: "Всего", value: leads.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-3 text-center shadow-card">
              <p className={`text-2xl font-bold ${s.accent ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-base font-bold text-foreground">Тёплые лиды</h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Пока нет лидов. Они появятся, когда клиенты передадут свои дела юристу.
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const u = urgencyMap[lead.urgency ?? "low"] ?? urgencyMap.low;
              const contact = revealedContacts[lead.id];
              const purchased = purchasedLeadIds.has(lead.id);
              return (
                <div key={lead.id} className="rounded-2xl border border-border p-4 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{lead.category ?? "Без категории"}</p>
                      {lead.city && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {lead.city}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${u.color}`}>
                      {u.label}
                    </span>
                  </div>

                  {lead.public_summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{lead.public_summary}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    {lead.estimated_damage != null && (
                      <p className="font-medium text-foreground">
                        Ущерб: <span className="text-primary">{Number(lead.estimated_damage).toLocaleString("ru-RU")} ₽</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Цена лида: {lead.price_rub} ₽</p>
                  </div>

                  {contact && (
                    <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">{contact}</span>
                    </div>
                  )}

                   {threadByLead[lead.id] ? (
                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={() => navigate(`/chat/${threadByLead[lead.id]}`)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Написать клиенту
                    </Button>
                  ) : !purchased && lead.status === "available" ? (
                    <Button variant="hero" size="sm" className="w-full rounded-lg" onClick={() => setConfirmId(lead.id)}>
                      <Briefcase className="h-3.5 w-3.5" />
                      Взять в работу
                    </Button>
                  ) : !purchased && !contact ? (
                    <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setConfirmId(lead.id)}>
                      Открыть контакт
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full rounded-lg" disabled>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Чат создаётся…
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Открыть контакты клиента?</DialogTitle>
            <DialogDescription>Стоимость: 500 ₽. Спишется с баланса.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl" disabled={busy}>Отмена</Button>
            </DialogClose>
            <Button variant="hero" className="flex-1 rounded-xl" onClick={handleConfirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LawyerDashboard;
