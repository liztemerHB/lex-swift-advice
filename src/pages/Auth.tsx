import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Scale, Loader2, Send, ArrowLeft, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const { user, role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgWaiting, setTgWaiting] = useState(false);
  const tgCancelRef = useRef(false);
  const tgPollTimeoutRef = useRef<number | null>(null);
  const tgRunRef = useRef(0);

  const clearTelegramPolling = (resetState = true) => {
    tgCancelRef.current = true;
    tgRunRef.current += 1;
    if (tgPollTimeoutRef.current !== null) {
      window.clearTimeout(tgPollTimeoutRef.current);
      tgPollTimeoutRef.current = null;
    }
    if (resetState) {
      setTgWaiting(false);
      setTgLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      clearTelegramPolling(false);
      const dest = role === "admin" ? "/admin" : role === "lawyer" ? "/lawyer" : "/";
      navigate(dest, { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    return () => {
      clearTelegramPolling(false);
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Добро пожаловать!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Аккаунт создан. Вы вошли в систему.");
  };

  const handleTelegramLogin = async () => {
    clearTelegramPolling();
    setTgLoading(true);
    try {
      const { data: activeSession } = await supabase.auth.getSession();
      if (activeSession.session) {
        setTgLoading(false);
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase.functions.invoke("telegram-start-login");
      if (error || !data?.deeplink || !data?.token) {
        toast.error("Не удалось начать вход через Telegram");
        setTgLoading(false);
        return;
      }
      window.open(data.deeplink, "_blank", "noopener");
      setTgWaiting(true);
      tgCancelRef.current = false;
      const runId = tgRunRef.current;
      const token: string = data.token;
      const started = Date.now();
      let transientErrors = 0;

      const scheduleTick = (delay: number) => {
        if (tgCancelRef.current || tgRunRef.current !== runId) return;
        if (tgPollTimeoutRef.current !== null) window.clearTimeout(tgPollTimeoutRef.current);
        tgPollTimeoutRef.current = window.setTimeout(tick, delay);
      };

      const tick = async () => {
        if (tgCancelRef.current || tgRunRef.current !== runId) return;
        if (Date.now() - started > 10 * 60 * 1000) {
          clearTelegramPolling();
          toast.error("Время ожидания истекло. Попробуйте снова.");
          return;
        }
        // If session already exists (e.g. confirmed in a previous tick), stop polling.
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          clearTelegramPolling();
          navigate("/", { replace: true });
          return;
        }
        try {
          const { data: st, error: pollError } = await supabase.functions.invoke("telegram-check-login", {
            body: { token },
          });
          if (tgCancelRef.current || tgRunRef.current !== runId) return;
          if (pollError || st?.fallback) {
            transientErrors += 1;
            if (transientErrors >= 2) {
              clearTelegramPolling();
              toast.error("Сервис входа через Telegram временно недоступен. Попробуйте ещё раз.");
              return;
            }
            scheduleTick(10000);
            return;
          }
          transientErrors = 0;
          if (st?.status === "confirmed" && st.access_token && st.refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: st.access_token,
              refresh_token: st.refresh_token,
            });
            if (setErr) toast.error(setErr.message);
            else toast.success("Вход через Telegram выполнен");
            clearTelegramPolling();
            navigate("/", { replace: true });
            return;
          }
          if (st?.status === "expired" || st?.status === "used" || st?.status === "not_found") {
            clearTelegramPolling();
            if (st.status === "expired") toast.error("Ссылка истекла. Попробуйте снова.");
            return;
          }
        } catch (e) {
          console.error("tg poll error:", e);
          transientErrors += 1;
          if (transientErrors >= 2) {
            clearTelegramPolling();
            toast.error("Сервис входа через Telegram временно недоступен. Попробуйте ещё раз.");
            return;
          }
          scheduleTick(10000);
          return;
        }
        scheduleTick(7000);
      };
      scheduleTick(2500);
    } catch (e) {
      console.error(e);
      setTgLoading(false);
    }
  };

  const handleBack = () => {
    clearTelegramPolling();
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const cancelTelegram = () => {
    clearTelegramPolling();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-start">
          <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2 h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </div>
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero shadow-button">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">LexAdvice</h1>
            <p className="mt-1 text-sm text-muted-foreground">ИИ-помощник для юридических вопросов</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Вход</TabsTrigger>
            <TabsTrigger value="signup">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-in">Пароль</Label>
                <Input id="pwd-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Продолжить"}
              </Button>
              <button type="button" className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                Забыли пароль?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-up">Имя</Label>
                <Input id="name-up" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иван Иванов" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-up">Пароль</Label>
                <Input id="pwd-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать аккаунт"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">или</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={handleTelegramLogin}
          disabled={tgLoading}
        >
          {tgLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              {tgWaiting ? "Ожидаем подтверждения в Telegram…" : "Войти через Telegram"}
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Откроется бот @LexAdvice_bot. Нажмите Start — мы войдём автоматически.
        </p>
        {tgWaiting && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-xs text-muted-foreground"
            onClick={cancelTelegram}
          >
            Отменить ожидание
          </Button>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
