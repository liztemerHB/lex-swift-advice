import { useEffect, useState } from "react";
import { ArrowLeft, FileText, UserCheck, CheckCircle2, AlertTriangle, Lock, Send, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResultScreenProps {
  onBack: () => void;
  onLawyerDashboard: () => void;
  caseId: string;
}

interface CaseRow {
  id: string;
  category: string | null;
  urgency: string | null;
  problem_summary: string | null;
  facts: any;
  next_steps: string[] | null;
  estimated_damage: number | null;
  city: string | null;
}

const urgencyLabel = (u: string | null) => {
  const key = (u ?? "").toLowerCase();
  if (key === "emergency") return { label: "Срочный", color: "text-destructive bg-destructive/15" };
  if (key === "high") return { label: "Высокий", color: "text-destructive bg-destructive/10" };
  if (key === "medium") return { label: "Средний", color: "text-amber-600 bg-amber-50" };
  if (key === "low") return { label: "Низкий", color: "text-emerald-600 bg-emerald-50" };
  return { label: "—", color: "text-muted-foreground bg-muted" };
};

const ResultScreen = ({ onBack, onLawyerDashboard, caseId }: ResultScreenProps) => {
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [agreeData, setAgreeData] = useState(false);
  const [agreeTransfer, setAgreeTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).single();
      if (error) console.error(error);
      else setCaseRow(data as CaseRow);
      setLoading(false);
    };
    load();
  }, [caseId]);

  const handleSubmit = async () => {
    if (!contact.trim() || !agreeData || !agreeTransfer) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lead", {
        body: {
          caseId,
          contact: contact.trim(),
          consentPersonalData: true,
          consentTransferToLawyer: true,
          privacyPolicyAccepted: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const steps = (caseRow?.next_steps ?? []) as string[];
  const urgency = urgencyLabel(caseRow?.urgency ?? null);
  const facts = caseRow?.facts ?? {};
  const factEntries = Object.entries(facts).filter(([_, v]) => v !== null && v !== "");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-foreground">Результаты анализа</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div className="rounded-2xl border border-border p-5 shadow-card opacity-0 animate-fade-up">
          <h2 className="mb-4 text-lg font-bold text-foreground">Ваше дело</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Категория</p>
                <p className="text-sm font-semibold text-foreground">{caseRow?.category ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${urgency.color}`}>
                <div className="h-1.5 w-1.5 rounded-full bg-current" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Уровень риска</p>
                <p className="text-sm font-semibold text-foreground">{urgency.label}</p>
              </div>
            </div>
            {caseRow?.estimated_damage != null && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Оценка ущерба</p>
                  <p className="text-sm font-semibold text-foreground">
                    ~{Number(caseRow.estimated_damage).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>
            )}
            {caseRow?.problem_summary && (
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{caseRow.problem_summary}</p>
            )}
          </div>
        </div>

        {factEntries.length > 0 && (
          <div className="rounded-2xl border border-border p-5 shadow-card">
            <h3 className="mb-3 text-base font-bold text-foreground">Ключевые факты</h3>
            <dl className="space-y-2 text-sm">
              {factEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground capitalize">{k}</dt>
                  <dd className="font-medium text-foreground text-right">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {steps.length > 0 && (
          <div className="rounded-2xl border border-border p-5 shadow-card opacity-0 animate-fade-up-delay-1">
            <h3 className="mb-4 text-base font-bold text-foreground">Алгоритм действий</h3>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-primary/20 p-5 shadow-card relative overflow-hidden opacity-0 animate-fade-up-delay-2">
          <div className="absolute inset-0 glow-blue opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Сгенерировать претензию (PDF)</h3>
            </div>
            <div className="mb-4 rounded-xl bg-secondary p-4 relative">
              <div className="space-y-2 blur-[3px] select-none">
                <p className="text-xs text-foreground">ПРЕТЕНЗИЯ</p>
                <p className="text-xs text-muted-foreground">На основании ст. 1064 ГК РФ требую…</p>
                <p className="text-xs text-muted-foreground">Сумма причинённого ущерба составляет…</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <Button variant="hero" className="w-full rounded-xl">
              Открыть документ за 100 ₽
            </Button>
          </div>
        </div>

        <div className="rounded-2xl p-5 shadow-card bg-gradient-premium text-primary-foreground opacity-0 animate-fade-up-delay-3">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-5 w-5" />
            <h3 className="text-base font-bold">Передать дело юристу</h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed opacity-80">
            Ситуация требует специалиста. Мы подберём профильного юриста.
          </p>
          <Button
            variant="outline"
            className="w-full rounded-xl border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            onClick={() => setDrawerOpen(true)}
          >
            Связаться с юристом
          </Button>
        </div>

        <div className="pb-6 text-center opacity-0 animate-fade-up-delay-4">
          <button
            onClick={onLawyerDashboard}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Панель юриста (B2B) →
          </button>
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Передача дела</DrawerTitle>
            <DrawerDescription>Оставьте контакт, и юрист свяжется с вами</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {!submitted ? (
              <>
                <Input
                  placeholder="Ваш телефон или Telegram"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="rounded-xl"
                />
                <div className="flex items-start gap-2">
                  <Checkbox id="ag1" checked={agreeData} onCheckedChange={(v) => setAgreeData(v === true)} className="mt-0.5" />
                  <label htmlFor="ag1" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Я согласен на обработку персональных данных.
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="ag2" checked={agreeTransfer} onCheckedChange={(v) => setAgreeTransfer(v === true)} className="mt-0.5" />
                  <label htmlFor="ag2" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Я согласен на передачу моего обращения, досье и контактов профильному юристу для связи по моей ситуации.
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  См.{" "}
                  <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                    Политику конфиденциальности
                  </Link>
                  .
                </p>
                <Button
                  variant="hero"
                  className="w-full rounded-xl"
                  disabled={!contact.trim() || !agreeData || !agreeTransfer || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Отправить досье</>}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <p className="text-sm font-semibold text-foreground">Заявка принята</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Юрист свяжется с вами в ближайшее время — он уже ознакомится с вашей ситуацией.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ResultScreen;
