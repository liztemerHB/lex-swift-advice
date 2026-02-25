import { useState } from "react";
import { ArrowLeft, FileText, UserCheck, CheckCircle2, AlertTriangle, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

interface ResultScreenProps {
  onBack: () => void;
  onLawyerDashboard: () => void;
}

const STEPS = [
  "Сфотографируйте последствия залива (стены, потолок, мебель).",
  "Вызовите представителя УК для составления акта осмотра.",
  "Закажите независимую оценку ущерба у сертифицированного оценщика.",
];

const ResultScreen = ({ onBack, onLawyerDashboard }: ResultScreenProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (contact.trim() && agreed) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-foreground">Результаты анализа</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Summary Card */}
        <div className="rounded-2xl border border-border p-5 shadow-card opacity-0 animate-fade-up">
          <h2 className="mb-4 text-lg font-bold text-foreground">Ваше дело</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Проблема</p>
                <p className="text-sm font-semibold text-foreground">Залив квартиры</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Уровень риска</p>
                <p className="text-sm font-semibold text-foreground">Средний</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Оценка ущерба</p>
                <p className="text-sm font-semibold text-foreground">~150 000 ₽</p>
              </div>
            </div>
          </div>
        </div>

        {/* Free Algorithm */}
        <div className="rounded-2xl border border-border p-5 shadow-card opacity-0 animate-fade-up-delay-1">
          <h3 className="mb-4 text-base font-bold text-foreground">Алгоритм действий</h3>
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Upsell */}
        <div className="rounded-2xl border border-primary/20 p-5 shadow-card relative overflow-hidden opacity-0 animate-fade-up-delay-2">
          <div className="absolute inset-0 glow-blue opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Готовая претензия (PDF)</h3>
            </div>

            {/* Blurred preview */}
            <div className="mb-4 rounded-xl bg-secondary p-4 relative">
              <div className="space-y-2 blur-[3px] select-none">
                <p className="text-xs text-foreground">ПРЕТЕНЗИЯ</p>
                <p className="text-xs text-muted-foreground">В адрес: Иванов И.И., проживающий по адресу...</p>
                <p className="text-xs text-muted-foreground">На основании ст. 1064 ГК РФ требую...</p>
                <p className="text-xs text-muted-foreground">Сумма причинённого ущерба составляет...</p>
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

        {/* Lawyer Routing */}
        <div className="rounded-2xl p-5 shadow-card bg-gradient-premium text-primary-foreground opacity-0 animate-fade-up-delay-3">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-5 w-5" />
            <h3 className="text-base font-bold">Передать дело адвокату</h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed opacity-80">
            Ситуация требует специалиста. Мы подобрали юриста в вашем районе.
          </p>
          <Button
            variant="outline"
            className="w-full rounded-xl border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            onClick={() => setDrawerOpen(true)}
          >
            Связаться с юристом
          </Button>
        </div>

        {/* Link to lawyer dashboard */}
        <div className="pb-6 text-center opacity-0 animate-fade-up-delay-4">
          <button
            onClick={onLawyerDashboard}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Панель юриста (B2B) →
          </button>
        </div>
      </div>

      {/* Lawyer Contact Drawer */}
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
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Я соглашаюсь с политикой конфиденциальности и обработкой персональных данных
                  </label>
                </div>
                <Button
                  variant="hero"
                  className="w-full rounded-xl"
                  disabled={!contact.trim() || !agreed}
                  onClick={handleSubmit}
                >
                  <Send className="h-4 w-4" />
                  Отправить досье
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <p className="text-sm font-semibold text-foreground">Заявка принята</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Юрист свяжется с вами в ближайшее время, он уже ознакамливается с вашей ситуацией.
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
