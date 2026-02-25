import { ArrowLeft, Scale, Briefcase, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useState } from "react";

interface LawyerDashboardProps {
  onBack: () => void;
}

interface Lead {
  id: number;
  category: string;
  emoji: string;
  amount: string;
  status: "new" | "in_progress" | "done";
  statusLabel: string;
  date: string;
}

const LEADS: Lead[] = [
  { id: 1, category: "Залив квартиры", emoji: "💧", amount: "150 000 ₽", status: "new", statusLabel: "Собрано досье", date: "Сегодня" },
  { id: 2, category: "ДТП", emoji: "🚗", amount: "320 000 ₽", status: "new", statusLabel: "Собрано досье", date: "Сегодня" },
  { id: 3, category: "Трудовой спор", emoji: "👷", amount: "85 000 ₽", status: "in_progress", statusLabel: "В работе", date: "Вчера" },
  { id: 4, category: "Развод", emoji: "💔", amount: "Раздел имущества", status: "done", statusLabel: "Завершено", date: "22 фев" },
];

const statusConfig = {
  new: { color: "bg-primary/10 text-primary", icon: Clock },
  in_progress: { color: "bg-amber-50 text-amber-600", icon: Briefcase },
  done: { color: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
};

const LawyerDashboard = ({ onBack }: LawyerDashboardProps) => {
  const [leads, setLeads] = useState(LEADS);
  const [confirmLeadId, setConfirmLeadId] = useState<number | null>(null);

  const handleConfirm = () => {
    if (confirmLeadId !== null) {
      setLeads((prev) =>
        prev.map((l) => (l.id === confirmLeadId ? { ...l, status: "in_progress" as const, statusLabel: "В работе" } : l))
      );
      setConfirmLeadId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Панель юриста</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-3 gap-3 opacity-0 animate-fade-up">
          {[
            { label: "Новые", value: leads.filter((l) => l.status === "new").length.toString(), accent: true },
            { label: "В работе", value: leads.filter((l) => l.status === "in_progress").length.toString() },
            { label: "Завершено", value: leads.filter((l) => l.status === "done").length.toString() },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-3 text-center shadow-card">
              <p className={`text-2xl font-bold ${s.accent ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-base font-bold text-foreground opacity-0 animate-fade-up-delay-1">Тёплые лиды</h2>

        <div className="space-y-3">
          {leads.map((lead, i) => {
            const config = statusConfig[lead.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={lead.id}
                className="rounded-2xl border border-border p-4 shadow-card opacity-0"
                style={{ animation: `fade-up 0.5s ease-out ${0.15 + i * 0.1}s forwards` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lead.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{lead.category}</p>
                      <p className="text-xs text-muted-foreground">{lead.date}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {lead.statusLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Сумма: <span className="text-primary">{lead.amount}</span>
                  </p>
                  {lead.status === "new" && (
                    <Button
                      variant="hero"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => setConfirmLeadId(lead.id)}
                    >
                      Взять в работу
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Purchase Dialog */}
      <Dialog open={confirmLeadId !== null} onOpenChange={(open) => !open && setConfirmLeadId(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Открыть контакты клиента?</DialogTitle>
            <DialogDescription>
              Стоимость: 500 ₽. Спишется с баланса.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl">Отмена</Button>
            </DialogClose>
            <Button variant="hero" className="flex-1 rounded-xl" onClick={handleConfirm}>
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LawyerDashboard;
