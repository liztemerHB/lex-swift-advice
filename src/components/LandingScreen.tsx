import { Sparkles, Shield, Scale, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const CHIPS = [
  { emoji: "🚗", label: "ДТП" },
  { emoji: "💔", label: "Развод" },
  { emoji: "💧", label: "Залив квартиры" },
  { emoji: "👷", label: "Трудовой спор" },
];

interface LandingScreenProps {
  onStartChat: (topic?: string) => void;
}

const LandingScreen = ({ onStartChat }: LandingScreenProps) => {
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email ||
    "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">LexAdvice</span>
        </Link>
        {user ? (
          <nav className="flex items-center gap-2">
            <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline">
              {displayName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg px-3 text-sm"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="h-9 rounded-lg px-3 text-sm">
              <Link to="/auth?tab=signin">Войти</Link>
            </Button>
            <Button asChild variant="hero" size="sm" className="h-9 rounded-lg px-3 text-sm">
              <Link to="/auth?tab=signup">Регистрация</Link>
            </Button>
          </nav>
        )}
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-12">
        <div className="w-full max-w-app text-center">
          {/* Badge */}
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full glow-blue px-3.5 py-1.5 text-xs font-medium text-primary opacity-0 animate-fade-up">
            <Sparkles className="h-3.5 w-3.5" />
            Твой юридический советник
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-[2rem] font-extrabold leading-[1.15] tracking-tight text-foreground opacity-0 animate-fade-up-delay-1">
            Не знаете, что делать? Начните с{" "}
            <span className="text-gradient-hero">LexAdvice.</span>
          </h1>

          {/* Subheadline */}
          <p className="mb-8 text-base leading-relaxed text-muted-foreground opacity-0 animate-fade-up-delay-2">
            Опишите, что случилось. Мы разберём ситуацию, подскажем первые шаги и поможем передать дело профильному юристу.
          </p>

          {/* CTA */}
          <div className="opacity-0 animate-fade-up-delay-3">
            <Button
              variant="hero"
              size="lg"
              className="mb-6 h-13 w-full max-w-xs rounded-xl text-base font-semibold"
              onClick={() => onStartChat()}
            >
              <Sparkles className="h-4 w-4" />
              Разобрать ситуацию бесплатно
            </Button>
          </div>

          {/* Chips */}
          <div className="mb-10 flex flex-wrap justify-center gap-2 opacity-0 animate-fade-up-delay-4">
            {CHIPS.map((chip) => (
              <Button
                key={chip.label}
                variant="chip"
                size="sm"
                className="rounded-full px-4 text-sm"
                onClick={() => onStartChat(chip.label)}
              >
                {chip.emoji} {chip.label}
              </Button>
            ))}
          </div>

          {/* Trust */}
          <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground opacity-0 animate-fade-up-delay-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Конфиденциально
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                На базе актуального закона РФ
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingScreen;
