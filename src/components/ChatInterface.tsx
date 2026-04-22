import { useState, useEffect, useRef } from "react";
import { ArrowLeft, SendHorizontal, Scale, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "ai" | "user";
  text: string;
}

const CONVERSATION: Message[] = [
  { id: 1, role: "ai", text: "Здравствуйте! Я ИИ-помощник LexTriage. Опишите вашу проблему в свободной форме." },
  { id: 2, role: "user", text: "Меня затопили соседи сверху, что делать?" },
  { id: 3, role: "ai", text: "Понял, ситуация с заливом квартиры. Уточню несколько деталей:\n\n1. Когда произошёл залив?\n2. Вы уже составляли акт осмотра с управляющей компанией?\n3. Есть ли оценка ущерба?" },
  { id: 4, role: "user", text: "Вчера вечером. Акт пока не составляли. Ущерб примерно 150 000 руб." },
  { id: 5, role: "ai", text: "Спасибо, я собрал достаточно информации для анализа. Подготовил для вас алгоритм действий и могу сгенерировать претензию. Перейдите к результатам." },
];

interface ChatInterfaceProps {
  onBack: () => void;
  onShowResult: () => void;
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
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [chatComplete, setChatComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentIdx = useRef(0);

  useEffect(() => {
    const showNext = () => {
      if (currentIdx.current >= CONVERSATION.length) {
        setChatComplete(true);
        return;
      }

      const msg = CONVERSATION[currentIdx.current];

      if (msg.role === "ai") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, msg]);
          currentIdx.current++;
          setTimeout(showNext, 800);
        }, 1200);
      } else {
        setVisibleMessages((prev) => [...prev, msg]);
        currentIdx.current++;
        setTimeout(showNext, 600);
      }
    };

    setTimeout(showNext, 500);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages, isTyping]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
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
            <p className="text-xs text-muted-foreground">Онлайн</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {visibleMessages.map((msg) => (
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
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <TypingIndicator />
          </div>
        )}

        {chatComplete && (
          <div className="flex justify-center pt-4 animate-fade-in">
            <Button variant="hero" className="rounded-xl" onClick={onShowResult}>
              Смотреть результаты →
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <input
            type="text"
            placeholder="Опишите проблему..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => setIsRecording((r) => !r)}
            aria-label={isRecording ? "Остановить запись" : "Записать голосом"}
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
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-background transition-colors">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
