import * as React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { ChevronDown, Mail, FileText, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

import { fetchMe } from "@/api/auth";
import {
  listEmailProviders,
  verifyEmailSmtp,
  saveEmailSettings,
  getEmailSettings,
  type EmailProviderPreset,
} from "@/api/email";

export const STORAGE_KEY = "smartoffer.settings";
export const DEFAULT_TEMPLATE = `Добрый день!

Просьба прислать КП:
- Наименование: {{equipment}}
- Технические характеристики: {{specs}}

Также прошу прислать реквизиты компании.

С уважением,
{{user_name}}`;

export type SettingsState = {
  template: string;
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { template: DEFAULT_TEMPLATE };
    const parsed = JSON.parse(raw);
    return {
      template: typeof parsed.template === "string" ? parsed.template : DEFAULT_TEMPLATE,
    };
  } catch {
    return { template: DEFAULT_TEMPLATE };
  }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeSecurity(v: string): "ssl" | "starttls" {
  return v === "starttls" ? "starttls" : "ssl";
}

export function SettingsModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (state: SettingsState) => void;
}) {
  const { toast } = useToast();

  const [expanded, setExpanded] = React.useState<"auth" | "template" | null>("auth");
  const [state, setState] = React.useState<SettingsState>(() => loadSettings());

  const [providers, setProviders] = React.useState<EmailProviderPreset[]>([]);
  const [providerId, setProviderId] = React.useState<string>("");
  const [appPassword, setAppPassword] = React.useState<string>("");

  const [smtpConsentChecked, setSmtpConsentChecked] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const [smtpConsentLocked, setSmtpConsentLocked] = React.useState(false);
  const [termsAcceptedLocked, setTermsAcceptedLocked] = React.useState(false);

  const [meEmail, setMeEmail] = React.useState<string>("");

  const [loadingProviders, setLoadingProviders] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [smtpStatus, setSmtpStatus] = React.useState<
    { state: "idle" | "ok" | "error"; message?: string }
  >({ state: "idle" });

  const selectedProvider = React.useMemo(
    () => providers.find((p) => p.id === providerId) ?? null,
    [providers, providerId]
  );

  React.useEffect(() => {
    if (!open) return;

    setState(loadSettings());
    setAppPassword("");
    setSmtpConsentChecked(false);
    setTermsAccepted(false);
    setSmtpConsentLocked(false);
    setTermsAcceptedLocked(false);
    setSmtpStatus({ state: "idle" });

    fetchMe()
      .then((me) => setMeEmail(me.email))
      .catch(() => setMeEmail(""));

    setLoadingProviders(true);
    listEmailProviders()
      .then((list) => setProviders(list))
      .catch((e) => {
        toast({
          title: "Не удалось загрузить провайдеров",
          description: e instanceof Error ? e.message : "Ошибка",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingProviders(false));

    getEmailSettings()
      .then((s) => {
        if (s?.provider_id) setProviderId(s.provider_id);

        if (s.is_verified) {
          setSmtpStatus({ state: "ok", message: "SMTP настроен и подтверждён" });
        } else if (s.last_verified_error) {
          setSmtpStatus({ state: "error", message: s.last_verified_error });
        }

        const personalAccepted = Boolean(s.personal_data_consent_accepted);
        const termsAcceptedServer = Boolean(s.terms_accepted);

        setSmtpConsentChecked(personalAccepted);
        setTermsAccepted(termsAcceptedServer);

        setSmtpConsentLocked(personalAccepted);
        setTermsAcceptedLocked(termsAcceptedServer);
      })
      .catch(() => {
        // ok, если ещё не настроено
      });
  }, [open, toast]);

  const setTemplate = (template: string) => setState((s) => ({ ...s, template }));

  const handleResetTemplate = () => setTemplate(DEFAULT_TEMPLATE);

  async function handleSave() {
    saveSettings(state);
    onSaved?.(state);

    const wantsSaveSmtp = Boolean(providerId && appPassword.trim());

    if (!wantsSaveSmtp) {
      onOpenChange(false);
      toast({ title: "Настройки сохранены" });
      return;
    }

    if (!smtpConsentChecked) {
      setExpanded("auth");
      setSmtpStatus({
        state: "error",
        message:
          "Для сохранения SMTP-настроек необходимо подтвердить согласие на обработку персональных данных.",
      });
      toast({
        title: "Подтвердите согласие",
        description: "Без этой галочки SmartOffer не сохранит SMTP-настройки.",
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      setExpanded("auth");
      setSmtpStatus({
        state: "error",
        message:
          "Для сохранения SMTP-настроек необходимо принять пользовательское соглашение.",
      });
      toast({
        title: "Примите пользовательское соглашение",
        description: "Без этой галочки SmartOffer не сохранит SMTP-настройки.",
        variant: "destructive",
      });
      return;
    }

    if (!meEmail) {
      toast({
        title: "Не удалось определить email пользователя",
        description: "Выйдите и войдите заново, затем повторите настройку.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProvider) {
      toast({
        title: "Выберите провайдера",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setSmtpStatus({ state: "idle" });

    try {
      const verifyRes = await verifyEmailSmtp({
        provider_id: selectedProvider.id,
        smtp_host: selectedProvider.smtp_host,
        smtp_port: selectedProvider.smtp_port,
        smtp_security: normalizeSecurity(selectedProvider.smtp_security as string),

        smtp_username: meEmail,
        smtp_password: appPassword.trim(),

        from_email: meEmail,
        test_to_email: meEmail,

        subject: "Smartoffer: тестовое письмо",
        body: "Это тестовое письмо для проверки настроек SMTP в Smartoffer.",
      });

      if (!verifyRes.ok) {
        const msg =
          verifyRes.message ||
          verifyRes.hint ||
          "SMTP проверка не пройдена. Проверьте пароль приложения и настройки безопасности почты.";

        setSmtpStatus({ state: "error", message: msg });
        toast({
          title: "Ошибка проверки SMTP",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      await saveEmailSettings({
        provider_id: selectedProvider.id,
        smtp_host: selectedProvider.smtp_host,
        smtp_port: selectedProvider.smtp_port,
        smtp_security: normalizeSecurity(selectedProvider.smtp_security as string),

        smtp_username: meEmail,
        smtp_password: appPassword.trim(),
        from_email: meEmail,

        personal_data_consent_accepted: smtpConsentChecked,
        terms_accepted: termsAccepted,
      });

      setSmtpConsentChecked(true);
      setTermsAccepted(true);
      setSmtpConsentLocked(true);
      setTermsAcceptedLocked(true);

      setSmtpStatus({
        state: "ok",
        message: "Почта подтверждена. Тестовое письмо отправлено. Юридические подтверждения зафиксированы в аккаунте.",
      });

      toast({
        title: "Почта настроена",
        description: "Настройки SMTP и юридические подтверждения сохранены в аккаунте.",
      });

      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Произошла ошибка";
      setSmtpStatus({ state: "error", message: msg });
      toast({
        title: "Ошибка сохранения",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setExpanded((p) => (p === "auth" ? null : "auth"))}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Настройка почты (SMTP)
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded === "auth" ? "rotate-180" : ""}`}
            />
          </button>

          {expanded === "auth" && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="space-y-2">
                <Label>Ваш email</Label>
                <Input value={meEmail || "—"} readOnly disabled className="opacity-80" />
                <p className="text-xs text-muted-foreground">
                  Для проверки будет отправлено тестовое письмо на этот адрес.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Провайдер почты</Label>
                <select
                  id="provider"
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  disabled={loadingProviders || saving}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Выберите провайдера…</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>

                {selectedProvider?.app_password_url && (
                  <a
                    href={selectedProvider.app_password_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    Как получить пароль приложения
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <p className="text-xs text-muted-foreground">
                  Выберите провайдера, перейдите по инструкции, создайте пароль приложения и вставьте его ниже.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-pass">Пароль приложения</Label>
                <Input
                  id="app-pass"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="Вставьте пароль приложения"
                  type="password"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Пароль приложения не сохраняется в браузере. Он отправляется на сервер для
                  верификации и хранения в зашифрованном виде.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="smtp-personal-data-consent"
                    checked={smtpConsentChecked}
                    onCheckedChange={(checked) => setSmtpConsentChecked(checked === true)}
                    disabled={saving || smtpConsentLocked}
                    className="mt-0.5"
                  />

                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-personal-data-consent"
                      className="text-sm leading-5 cursor-pointer"
                    >
                      Я даю согласие на обработку персональных данных,
                      необходимых для настройки SMTP и отправки писем через SmartOffer.
                    </Label>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {smtpConsentLocked
                        ? "Согласие уже зафиксировано в аккаунте. Для отзыва напишите на support@smartoffer.pro."
                        : "Без этой галочки сервис не сохранит SMTP-настройки."}
                    </p>

                    <Link
                      to="/personal-data-consent"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      Открыть текст согласия
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="smtp-terms-acceptance"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={saving || termsAcceptedLocked}
                    className="mt-0.5"
                  />

                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-terms-acceptance"
                      className="text-sm leading-5 cursor-pointer"
                    >
                      Я принимаю пользовательское соглашение.
                    </Label>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {termsAcceptedLocked
                        ? "Принятие пользовательского соглашения уже зафиксировано в аккаунте. Для отзыва напишите на support@smartoffer.pro."
                        : "Без этой галочки сервис не сохранит SMTP-настройки."}
                    </p>

                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      Открыть пользовательское соглашение
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {smtpStatus.state !== "idle" && (
                <div
                  className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                    smtpStatus.state === "ok"
                      ? "border-success/40 bg-success/10 text-foreground"
                      : "border-destructive/40 bg-destructive/10 text-foreground"
                  }`}
                >
                  {smtpStatus.state === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium">
                      {smtpStatus.state === "ok" ? "Почта настроена" : "Проблема с настройкой"}
                    </div>
                    {smtpStatus.message && (
                      <div className="text-muted-foreground">{smtpStatus.message}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((p) => (p === "template" ? null : "template"))}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Настройка шаблона запроса
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded === "template" ? "rotate-180" : ""}`}
            />
          </button>

          {expanded === "template" && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="template">Шаблон письма</Label>
                <Textarea
                  id="template"
                  className="min-h-[160px]"
                  value={state.template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Доступные переменные: <code>{"{{equipment}}"}</code>,{" "}
                  <code>{"{{specs}}"}</code>, <code>{"{{user_name}}"}</code>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="secondary" onClick={handleResetTemplate}>
                  Сбросить шаблон
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
  <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
    Отмена
  </Button>
  <Button onClick={handleSave} disabled={saving}>
    {saving ? "Проверяем…" : "Сохранить"}
  </Button>
</div>
      </DialogContent>
    </Dialog>
  );
}