import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import {
  fetchMe,
  loginUser,
  registerUser,
  requestPasswordReset,
  type UserMe,
} from "@/api/auth";
import { setAuthToken } from "@/shared/utils/auth";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthed: (me: UserMe) => void;
};

const BLOCKED_REGISTRATION_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "google.com",

  "outlook.com",
  "outlook.ru",
  "hotmail.com",
  "live.com",
  "msn.com",

  "icloud.com",
  "me.com",
  "mac.com",

  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.de",

  "proton.me",
  "protonmail.com",

  "zoho.com",
  "aol.com",

  "gmx.com",
  "gmx.de",

  "qq.com",
]);

function getEmailDomain(email: string): string {
  const value = email.trim().toLowerCase();

  if (!value.includes("@")) {
    return "";
  }

  return value.split("@").pop()?.trim().replace(/\.$/, "") || "";
}

export function AuthModal({ open, onOpenChange, onAuthed }: Props) {
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const regEmailDomain = getEmailDomain(regEmail);

  const regEmailBlocked =
    regEmailDomain.length > 0 &&
    BLOCKED_REGISTRATION_EMAIL_DOMAINS.has(regEmailDomain);

  const canLogin = useMemo(
    () => loginEmail.trim().length > 0 && loginPassword.trim().length > 0,
    [loginEmail, loginPassword]
  );

  const canForgot = useMemo(() => forgotEmail.trim().length > 0, [forgotEmail]);

  const canRegister = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      regEmail.trim().length > 0 &&
      !regEmailBlocked &&
      regPassword.trim().length >= 8 &&
      privacyAccepted &&
      termsAccepted
    );
  }, [
    firstName,
    lastName,
    regEmail,
    regPassword,
    privacyAccepted,
    termsAccepted,
    regEmailBlocked,
  ]);

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

  async function handleForgotPassword() {
    if (!canForgot) return;

    setLoading(true);
    try {
      const result = await requestPasswordReset(forgotEmail.trim());

      toast({
        title: "Письмо отправлено",
        description: result.message,
      });

      setLoginEmail(forgotEmail.trim());
      setMode("login");
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось отправить письмо",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (regEmailBlocked) {
      toast({
        title: "Регистрация недоступна",
        description:
          "Используйте Mail.ru, Яндекс, Rambler или корпоративный email.",
        variant: "destructive",
      });

      return;
    }

    if (!canRegister) return;

    setLoading(true);
    try {
      await registerUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        privacy_accepted: privacyAccepted,
        terms_accepted: termsAccepted,
      });

      const token = await loginUser({
        email: regEmail.trim(),
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setMode("login");
          setPrivacyAccepted(false);
          setTermsAccepted(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "forgot" ? "Восстановление доступа" : "Аккаунт Smartoffer"}
          </DialogTitle>
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

            <button
              type="button"
              onClick={() => {
                setForgotEmail(loginEmail.trim());
                setMode("forgot");
              }}
              disabled={loading}
              className="block w-fit px-1 -mt-1 text-sm font-medium text-primary hover:opacity-90 disabled:opacity-50"
            >
              Забыли пароль
            </button>

            <Button className="w-full" disabled={!canLogin || loading} onClick={handleLogin}>
              Войти
            </Button>
          </div>
        ) : mode === "forgot" ? (
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Email аккаунта"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              autoComplete="email"
            />

            <div className="text-sm text-muted-foreground leading-relaxed">
              Мы отправим ссылку для сброса пароля на ваш email.
            </div>

            <Button
              className="w-full"
              disabled={!canForgot || loading}
              onClick={handleForgotPassword}
            >
              Отправить ссылку
            </Button>

            <button
              type="button"
              onClick={() => setMode("login")}
              disabled={loading}
              className="block w-fit px-1 text-sm font-medium text-primary hover:opacity-90 disabled:opacity-50"
            >
              Назад ко входу
            </button>
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
            {regEmailBlocked && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
                Регистрация через зарубежные почтовые сервисы недоступна. Используйте Mail.ru,
                Яндекс, Rambler или корпоративный email.
              </div>
            )}

            <Input
              placeholder="Пароль (минимум 8 символов)"
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              autoComplete="new-password"
            />

            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-4">
              <div className="flex items-start gap-3">
  <Checkbox
    id="register-privacy-acceptance"
    checked={privacyAccepted}
    onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
    disabled={loading}
    className="mt-0.5"
  />

  <div className="space-y-2">
    <Label
      htmlFor="register-privacy-acceptance"
      className="text-sm leading-5 cursor-pointer"
    >
      Я ознакомлен(а) с Политикой конфиденциальности и Политикой хранения данных
      SmartOffer и соглашаюсь с обработкой персональных данных в рамках регистрации
      и использования сервиса.
    </Label>

    <div className="flex flex-wrap gap-3">
      <Link
        to="/privacy"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
      >
        Политика конфиденциальности
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>

      <Link
        to="/data-retention"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
      >
        Политика хранения данных
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
</div>

              <div className="h-px bg-border" />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="register-terms-acceptance"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  disabled={loading}
                  className="mt-0.5"
                />

                <div className="space-y-2">
                  <Label
                    htmlFor="register-terms-acceptance"
                    className="text-sm leading-5 cursor-pointer"
                  >
                    Я принимаю Пользовательское соглашение.
                  </Label>

                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    Открыть Пользовательское соглашение
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={!canRegister || loading} onClick={handleRegister}>
              Создать аккаунт
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}