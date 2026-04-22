import { useState, useEffect, useRef } from "react";
import { ArrowLeft, SendHorizontal, Scale, Mic, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import ConsentSheet from "@/components/ConsentSheet";

interface ChatInterfaceProps {
  onBack: () => void;
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

const ChatInterface = ({ onBack, onShowResult, initialTopic }: ChatInterfaceProps) => {
  const { messages, isTyping, error, caseId, caseData, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState(initialTopic ?? "");
  const [isRecording, setIsRecording] = useState(false);
  const [consentOpen, setConsentOpen] = useState(true);
  const [consented, setConsented] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    setInputValue("");
    const isFirst = messages.length === 0;
    await sendMessage(text, isFirst ? { personalData: true, privacyPolicy: true } : undefined);
  };

  const handleQuickCategory = async (category: string) => {
    if (!consented || isTyping) return;
    const isFirst = messages.length === 0;
    await sendMessage(
      `У меня проблема: ${category}`,
      isFirst ? { personalData: true, privacyPolicy: true } : undefined
    );
  };

  const QUICK_CATEGORIES = ["ДТП", "Залив квартиры", "Развод", "Потребительский спор", "Трудовой спор", "Другое"];
  const WELCOME_TEXT =
    "Здравствуйте. Опишите вашу юридическую проблему простыми словами: что случилось, когда, где и кто участвует. Я помогу понять срочность, собрать факты и подготовить план действий.";

  const isComplete = caseData?.is_fact_gathering_complete === true;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-hero">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">LexTriage AI</p>
            <p className="text-xs text-muted-foreground">{isTyping ? "Печатает…" : "Онлайн"}</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!consented && messages.length === 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md surface-chat-ai px-4 py-2.5 text-sm text-foreground">
              Здравствуйте! Я ИИ-помощник LexTriage. Подтвердите согласие, чтобы начать.
            </div>
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
            <Button variant="hero" className="rounded-xl" onClick={() => onShowResult(caseId)}>
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
    </div>
  );
};

export default ChatInterface;
