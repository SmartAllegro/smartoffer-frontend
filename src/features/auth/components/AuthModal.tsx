import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { fetchMe, loginUser, registerUser, type UserMe } from "@/api/auth";
import { setAuthToken } from "@/shared/utils/auth";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthed: (me: UserMe) => void;
};

export function AuthModal({ open, onOpenChange, onAuthed }: Props) {
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // register
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const canLogin = useMemo(
    () => loginEmail.trim().length > 0 && loginPassword.trim().length > 0,
    [loginEmail, loginPassword]
  );

  const canRegister = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      regEmail.trim().length > 0 &&
      regPassword.trim().length >= 8
    );
  }, [firstName, lastName, regEmail, regPassword]);

  async function doFetchMeAndClose() {
    const me = await fetchMe();
    onAuthed(me);
    onOpenChange(false);
  }

  async function handleLogin() {
    if (!canLogin) return;

    setLoading(true);
    try {
      const token = await loginUser({
        email: loginEmail,
        password: loginPassword,
      });
      setAuthToken(token.access_token);

      await doFetchMeAndClose();
      toast({ title: "Вход выполнен" });
    } catch (e) {
      toast({
        title: "Ошибка входа",
        description: e instanceof Error ? e.message : "Не удалось войти",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!canRegister) return;

    setLoading(true);
    try {
      await registerUser({
        first_name: firstName,
        last_name: lastName,
        email: regEmail,
        password: regPassword,
      });

      // Автовход после регистрации
      const token = await loginUser({
        email: regEmail,
        password: regPassword,
      });
      setAuthToken(token.access_token);

      await doFetchMeAndClose();
      toast({ title: "Аккаунт создан" });
    } catch (e) {
      toast({
        title: "Ошибка регистрации",
        description: e instanceof Error ? e.message : "Не удалось зарегистрироваться",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Аккаунт Smartoffer</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={mode === "login" ? "default" : "outline"}
            onClick={() => setMode("login")}
            className="flex-1"
            disabled={loading}
          >
            Вход
          </Button>
          <Button
            variant={mode === "register" ? "default" : "outline"}
            onClick={() => setMode("register")}
            className="flex-1"
            disabled={loading}
          >
            Регистрация
          </Button>
        </div>

        {mode === "login" ? (
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              placeholder="Пароль"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button className="w-full" disabled={!canLogin || loading} onClick={handleLogin}>
              Войти
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <Input
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <Input
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              placeholder="Пароль (минимум 8 символов)"
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button className="w-full" disabled={!canRegister || loading} onClick={handleRegister}>
              Создать аккаунт
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}