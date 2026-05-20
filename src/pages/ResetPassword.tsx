import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash and creates a temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Fallback: if already signed in via recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    navigate("/", { replace: true });
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

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Откройте ссылку из письма для сброса пароля.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
