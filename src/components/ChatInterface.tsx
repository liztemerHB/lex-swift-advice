import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SendHorizontal, Scale, Mic, AlertCircle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import ConsentSheet from "@/components/ConsentSheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatInterfaceProps {
  onBack: () => void;
  onHome?: () => void;
  onShowResult: (caseId: string) => void;
  initialTopic?: string;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3 surface-chat-ai rounded-2xl rounded-bl-md w-fit">
    <div className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot-1" />
    <div className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot-2" />
    <div className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot-3" />
  </div>
);

const ChatInterface = ({ onBack, onHome, onShowResult, initialTopic }: ChatInterfaceProps) => {
  const { messages, isTyping, error, caseId, caseData, sendMessage } = useChat();
  const { user } = useAuth();
  const { plan, remainingMessages, consumeMessage, refresh: refreshPlan } = usePlan();
  const [inputValue, setInputValue] = useState(initialTopic ?? "");
  const [isRecording, setIsRecording] = useState(false);
  const [consentOpen, setConsentOpen] = useState(true);
  const [consented, setConsented] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptShown, setAuthPromptShown] = useState(false);
  const [limitPromptOpen, setLimitPromptOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userMessagesCount = messages.filter((m) => m.role === "user").length;
  const GUEST_LIMIT = 3;
  const guestReachedLimit = !user && userMessagesCount >= GUEST_LIMIT;
  // For logged-in users with finite plan
  const planReachedLimit = !!user && remainingMessages !== null && remainingMessages <= 0;

  // Auto-show prompt when guest hits the message limit
  useEffect(() => {
    if (guestReachedLimit && !authPromptShown) {
      setAuthPromptOpen(true);
      setAuthPromptShown(true);
    }
  }, [guestReachedLimit, authPromptShown]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleConsent = () => {
    setConsented(true);
    setConsentOpen(false);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping || !consented) return;
    if (guestReachedLimit) {
      setAuthPromptOpen(true);
      return;
    }
    if (planReachedLimit) {
      setLimitPromptOpen(true);
      return;
    }
    setInputValue("");
    const isFirst = messages.length === 0;
    await sendMessage(text, isFirst ? { personalData: true, privacyPolicy: true } : undefined);
    if (user) {
      await consumeMessage();
    }
  };

  const handleQuickCategory = async (category: string) => {
    if (!consented || isTyping) return;
    if (guestReachedLimit) {
      setAuthPromptOpen(true);
      return;
    }
    if (planReachedLimit) {
      setLimitPromptOpen(true);
      return;
    }
    const isFirst = messages.length === 0;
    await sendMessage(
      `У меня проблема: ${category}`,
      isFirst ? { personalData: true, privacyPolicy: true } : undefined
    );
    if (user) {
      await consumeMessage();
    }
  };

  const handleShowResult = (id: string) => {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    onShowResult(id);
  };

  const reachedLimit = guestReachedLimit;

  const QUICK_CATEGORIES = ["ДТП", "Залив квартиры", "Развод", "Потребительский спор", "Трудовой спор", "Другое"];
  const WELCOME_TEXT =
    "Здравствуйте. Опишите ситуацию простыми словами: что случилось, когда, где и кто участвует. Я помогу оценить срочность, собрать важные факты и подготовить понятный план действий.";

  const isComplete = caseData?.is_fact_gathering_complete === true;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-hero">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">LexAdvice AI</p>
            <p className="text-xs text-muted-foreground">{isTyping ? "Печатает…" : "Онлайн"}</p>
          </div>
        </button>
        {user && remainingMessages !== null && (
          <Link
            to="/pricing"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-primary/10 transition-colors"
          >
            <Zap className="h-3 w-3 text-primary" />
            {remainingMessages} / {(plan.dailyAiMessages ?? 0)}
          </Link>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md surface-chat-ai px-4 py-2.5 text-sm leading-relaxed text-foreground">
              {consented
                ? WELCOME_TEXT
                : "Здравствуйте! Я ИИ-помощник LexAdvice. Подтвердите согласие, чтобы начать."}
            </div>
          </div>
        )}

        {messages.length === 0 && consented && (
          <div className="flex flex-wrap gap-2 pt-1 animate-fade-in">
            {QUICK_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => handleQuickCategory(c)}
                disabled={isTyping}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "surface-chat-ai text-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <TypingIndicator />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {(isComplete || messages.filter((m) => m.role === "assistant").length >= 3) && caseId && (
          <div className="flex justify-center pt-4 animate-fade-in">
            <Button variant="hero" className="rounded-xl" onClick={() => handleShowResult(caseId)}>
              {isComplete ? "Смотреть результаты →" : "Показать план действий →"}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <input
            type="text"
            placeholder={consented ? "Опишите проблему..." : "Подтвердите согласие выше"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={!consented || isTyping}
            className="flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
          />
          <button
            onClick={() => setIsRecording((r) => !r)}
            aria-label={isRecording ? "Остановить запись" : "Записать голосом"}
            disabled={!consented}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all ${
              isRecording
                ? "bg-primary text-primary-foreground shadow-button animate-pulse"
                : "text-muted-foreground hover:text-primary hover:bg-background"
            }`}
          >
            <Mic className="h-4 w-4" />
            {isRecording && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
          <button
            onClick={handleSend}
            disabled={!consented || isTyping || !inputValue.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-background transition-colors disabled:opacity-40"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ConsentSheet open={consentOpen} onAccept={handleConsent} onOpenChange={setConsentOpen} />

      <Dialog open={authPromptOpen} onOpenChange={(open) => { if (user) setAuthPromptOpen(open); }}>
        <DialogContent
          className="max-w-sm rounded-2xl [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {reachedLimit ? "Продолжите бесплатно" : "Сохраните ваш план"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {reachedLimit
                ? "Вы использовали 3 бесплатных сообщения. Зарегистрируйтесь, чтобы продолжить разбор ситуации и сохранить историю."
                : "Зарегистрируйтесь или войдите, чтобы открыть план действий, сохранить дело и получить персональные документы."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="hero" className="w-full rounded-xl">
              <Link to="/auth?tab=signup">Зарегистрироваться</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/auth?tab=signin">У меня уже есть аккаунт</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={limitPromptOpen} onOpenChange={setLimitPromptOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Дневной лимит исчерпан</DialogTitle>
            <DialogDescription className="text-center">
              На тарифе <b>{plan.name}</b> доступно {plan.dailyAiMessages} сообщений ИИ в день.
              Перейдите на Pro или Unlimited для расширенного лимита.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="hero" className="w-full rounded-xl" onClick={() => refreshPlan()}>
              <Link to="/pricing">Посмотреть тарифы</Link>
            </Button>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setLimitPromptOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;
