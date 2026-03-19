import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { confirmPasswordReset } from "@/api/auth";
import { clearAuthToken } from "@/shared/utils/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const token = (searchParams.get("token") || "").trim();

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);

  const validationError = useMemo(() => {
    if (!token) return "Ссылка для сброса пароля недействительна или неполная.";
    if (password.length > 0 && password.length < 8) {
      return "Пароль должен содержать минимум 8 символов.";
    }
    if (passwordRepeat.length > 0 && password !== passwordRepeat) {
      return "Пароли не совпадают.";
    }
    return "";
  }, [token, password, passwordRepeat]);

  const canSubmit =
    token.length > 0 &&
    password.trim().length >= 8 &&
    passwordRepeat.trim().length >= 8 &&
    password === passwordRepeat;

  async function handleSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const result = await confirmPasswordReset({
        token,
        new_password: password,
      });

      clearAuthToken();

      toast({
        title: "Пароль обновлён",
        description: result.message,
      });

      navigate("/");
    } catch (e) {
      toast({
        title: "Ошибка сброса пароля",
        description: e instanceof Error ? e.message : "Не удалось обновить пароль",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 space-y-2">
            <div className="text-2xl font-semibold">Сброс пароля</div>
            <p className="text-sm text-muted-foreground">
              Задайте новый пароль для аккаунта SmartOffer.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Новый пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              placeholder="Повторите новый пароль"
              type="password"
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              autoComplete="new-password"
            />

            {validationError ? (
              <div className="text-sm text-destructive">{validationError}</div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Минимальная длина пароля — 8 символов.
              </div>
            )}

            <Button className="w-full" disabled={!canSubmit || loading} onClick={handleSubmit}>
              Сохранить новый пароль
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link to="/">Вернуться на главную</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}