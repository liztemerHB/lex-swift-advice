import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // 1) New-style link: ?token_hash=...&type=recovery
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "recovery",
          });
          if (error) {
            setErrorMsg("Ссылка недействительна или истекла. Запросите сброс пароля снова.");
            setChecking(false);
            return;
          }
          setReady(true);
          setChecking(false);
          return;
        }

        // 2) Old-style link: #access_token=...&type=recovery — handled automatically by supabase-js
        // Wait briefly for detectSessionInUrl to run.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          setChecking(false);
          return;
        }

        // 3) Listen for PASSWORD_RECOVERY event in case it lands asynchronously
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
            setReady(true);
            setChecking(false);
          }
        });
        // Give it a moment, then stop "checking"
        setTimeout(() => {
          setChecking((c) => {
            if (c) setErrorMsg("Откройте ссылку из письма для сброса пароля.");
            return false;
          });
        }, 1500);
        return () => sub.subscription.unsubscribe();
      } catch (e) {
        console.error(e);
        setErrorMsg("Не удалось обработать ссылку сброса пароля.");
        setChecking(false);
      }
    };
    init();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Минимум 6 символов");
      return;
    }
    if (password !== confirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Пароль обновлён");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero shadow-button">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Новый пароль</h1>
            <p className="mt-1 text-sm text-muted-foreground">Введите новый пароль для входа</p>
          </div>
        </div>

        {checking ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">Новый пароль</Label>
              <Input
                id="new-pwd"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd-2">Повторите пароль</Label>
              <Input
                id="new-pwd-2"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить пароль"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {errorMsg ?? "Откройте ссылку из письма для сброса пароля."}
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
              На страницу входа
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
