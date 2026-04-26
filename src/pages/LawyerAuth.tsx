import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const LawyerAuth = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (role === "lawyer") navigate("/lawyer", { replace: true });
      else if (role === "admin") navigate("/admin", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Вход выполнен");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/lawyer-auth`,
        data: { full_name: fullName, requested_role: "lawyer" },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Заявка отправлена. После подтверждения администратором вы получите доступ.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-app">
        <div className="mb-6">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            К обычному входу
          </Link>
        </div>

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero shadow-button">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Кабинет юриста</h1>
            <p className="mt-1 text-sm text-muted-foreground">B2B-вход для работы с заявками</p>
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
                <Label htmlFor="l-email-in">Email</Label>
                <Input
                  id="l-email-in"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-pwd-in">Пароль</Label>
                <Input
                  id="l-pwd-in"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Войти в кабинет"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="l-name-up">ФИО</Label>
                <Input
                  id="l-name-up"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-email-up">Email</Label>
                <Input
                  id="l-email-up"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-pwd-up">Пароль</Label>
                <Input
                  id="l-pwd-up"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подать заявку"}
              </Button>
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                Доступ открывается после проверки администратором.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LawyerAuth;
