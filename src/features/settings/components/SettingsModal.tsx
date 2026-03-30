import * as React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  ChevronDown,
  Mail,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Wallet,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

import { fetchMe, deleteCurrentUser } from "@/api/auth";
import {
  listEmailProviders,
  verifyEmailSmtp,
  saveEmailSettings,
  getEmailSettings,
  type EmailProviderPreset,
} from "@/api/email";
import {
  fetchBillingMe,
  fetchBillingPlans,
  type BillingMe,
  type BillingPlanItem,
} from "@/api/billing";
import { clearAuthToken } from "@/shared/utils/auth";

export const STORAGE_KEY = "smartoffer.settings";
export const DEFAULT_TEMPLATE = `Добрый день!
Просьба прислать КП:

- Наименование: 

- Технические характеристики: 

- Колличество:


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

function getBillingStatusLabel(status?: string) {
  if (status === "active") return "Поиск доступен";
  if (status === "exhausted") return "Лимит исчерпан";
  return "Поиск заблокирован";
}

function getDomainTypeLabel(domainType?: string) {
  if (domainType === "corporate") return "Корпоративная почта";
  if (domainType === "public") return "Личная почта";
  return "Почта не подтверждена";
}

function getBillingTone(status?: string, remaining?: number) {
  if (status !== "active" || (remaining ?? 0) <= 0) {
    return "border-destructive/30 bg-destructive/10";
  }
  if ((remaining ?? 0) <= 10) {
    return "border-yellow-500/30 bg-yellow-500/10";
  }
  return "border-primary/20 bg-primary/5";
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

  const [expanded, setExpanded] = React.useState<
    "auth" | "billing" | "template" | "danger" | null
  >("auth");

  const [state, setState] = React.useState<SettingsState>(() => loadSettings());

  const [providers, setProviders] = React.useState<EmailProviderPreset[]>([]);
  const [providerId, setProviderId] = React.useState<string>("");
  const [appPassword, setAppPassword] = React.useState<string>("");

  const [smtpConsentChecked, setSmtpConsentChecked] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const [smtpConsentLocked, setSmtpConsentLocked] = React.useState(false);
  const [termsAcceptedLocked, setTermsAcceptedLocked] = React.useState(false);
  const [offerAccepted, setOfferAccepted] = React.useState(false);
  const [offerAcceptedLocked, setOfferAcceptedLocked] = React.useState(false);

  const [meEmail, setMeEmail] = React.useState<string>("");

  const [deleteConfirmEmail, setDeleteConfirmEmail] = React.useState("");
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deletingAccount, setDeletingAccount] = React.useState(false);

  const [loadingProviders, setLoadingProviders] = React.useState(false);
  const [loadingBilling, setLoadingBilling] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [billing, setBilling] = React.useState<BillingMe | null>(null);
  const [billingPlans, setBillingPlans] = React.useState<BillingPlanItem[]>([]);

  const [smtpStatus, setSmtpStatus] = React.useState<
    { state: "idle" | "ok" | "error"; message?: string }
  >({ state: "idle" });

  const selectedProvider = React.useMemo(
    () => providers.find((p) => p.id === providerId) ?? null,
    [providers, providerId]
  );

  const canDeleteAccount =
    meEmail.trim().length > 0 &&
    deleteConfirmEmail.trim().toLowerCase() === meEmail.trim().toLowerCase() &&
    deletePassword.trim().length > 0;

  const currentPlanCode = billing?.current_plan_code ?? null;
  const requestsRemaining = Math.max(Number(billing?.requests_remaining ?? 0), 0);
  const requestsLimit = Math.max(Number(billing?.requests_limit ?? 0), 0);

  const refreshBilling = React.useCallback(async () => {
    try {
      setLoadingBilling(true);
      const [billingMe, plansRes] = await Promise.all([
        fetchBillingMe(),
        fetchBillingPlans(),
      ]);
      setBilling(billingMe);
      setBillingPlans(Array.isArray(plansRes?.items) ? plansRes.items : []);
    } catch {
      setBilling(null);
      setBillingPlans([]);
    } finally {
      setLoadingBilling(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;

    setState(loadSettings());
    setAppPassword("");
    setDeleteConfirmEmail("");
    setDeletePassword("");

    setSmtpConsentChecked(false);
    setTermsAccepted(false);
    setSmtpConsentLocked(false);
    setTermsAcceptedLocked(false);
    setOfferAccepted(false);
    setOfferAcceptedLocked(false);
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
      .then((s: any) => {
        if (s?.provider_id) setProviderId(s.provider_id);

        if (s.is_verified) {
          setSmtpStatus({ state: "ok", message: "SMTP настроен и подтверждён" });
        } else if (s.last_verified_error) {
          setSmtpStatus({ state: "error", message: s.last_verified_error });
        }

        const personalAccepted = Boolean(s.personal_data_consent_accepted);
        const termsAcceptedServer = Boolean(s.terms_accepted);
        const offerAcceptedServer = Boolean(s.offer_accepted);

        setSmtpConsentChecked(personalAccepted);
        setTermsAccepted(termsAcceptedServer);
        setOfferAccepted(offerAcceptedServer);

        setSmtpConsentLocked(personalAccepted);
        setTermsAcceptedLocked(termsAcceptedServer);
        setOfferAcceptedLocked(offerAcceptedServer);
      })
      .catch(() => {
        // ок, если ещё не настроено
      });

    void refreshBilling();
  }, [open, toast, refreshBilling]);

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

if (!offerAccepted) {
  setExpanded("auth");
  setSmtpStatus({
    state: "error",
    message:
      "Для сохранения SMTP-настроек необходимо принять публичную оферту.",
  });
  toast({
    title: "Примите публичную оферту",
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
        offer_accepted: offerAccepted,
      } as any);

      setSmtpConsentChecked(true);
      setTermsAccepted(true);
      setSmtpConsentLocked(true);
      setTermsAcceptedLocked(true);
      setOfferAccepted(true);
      setOfferAcceptedLocked(true);

      setSmtpStatus({
        state: "ok",
        message: "SMTP настроен и подтверждён",
      });

      await refreshBilling();
      setExpanded("billing");

      toast({
        title: "Почта настроена",
        description: "Настройки SMTP и юридические подтверждения сохранены.",
      });
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

  async function handleDeleteAccount() {
    if (!canDeleteAccount || deletingAccount) return;

    const confirmed = window.confirm(
      "Удаление аккаунта необратимо. Будут удалены аккаунт, SMTP-настройки, история поисков и связанные данные. Продолжить?"
    );
    if (!confirmed) return;

    setDeletingAccount(true);

    try {
      const result = await deleteCurrentUser({
        confirm_email: deleteConfirmEmail.trim(),
        password: deletePassword.trim(),
      });

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}

      clearAuthToken();
      onOpenChange(false);

      toast({
        title: "Аккаунт удалён",
        description: result.message,
      });

      window.location.reload();
    } catch (e) {
      toast({
        title: "Не удалось удалить аккаунт",
        description: e instanceof Error ? e.message : "Ошибка удаления аккаунта",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="px-6 pt-6 pb-0 shrink-0">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
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

  <div className="h-px bg-border" />

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

  <div className="h-px bg-border" />

  <div className="flex items-start gap-3">
    <Checkbox
      id="smtp-offer-acceptance"
      checked={offerAccepted}
      onCheckedChange={(checked) => setOfferAccepted(checked === true)}
      disabled={saving || offerAcceptedLocked}
      className="mt-0.5"
    />

    <div className="space-y-2">
      <Label
        htmlFor="smtp-offer-acceptance"
        className="text-sm leading-5 cursor-pointer"
      >
        Я принимаю публичную оферту.
      </Label>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {offerAcceptedLocked
          ? "Принятие публичной оферты уже зафиксировано в аккаунте. Для отзыва напишите на support@smartoffer.pro."
          : "Без этой галочки сервис не сохранит SMTP-настройки."}
      </p>

      <Link
        to="/offer"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
      >
        Открыть публичную оферту
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
</div>

                {smtpStatus.state !== "idle" && (
                  <div
                    className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                      smtpStatus.state === "ok"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                        : "border-destructive/40 bg-destructive/10 text-foreground"
                    }`}
                  >
                    {smtpStatus.state === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" />
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
              onClick={() => setExpanded((p) => (p === "billing" ? null : "billing"))}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Тариф и лимиты
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded === "billing" ? "rotate-180" : ""}`}
              />
            </button>

            {expanded === "billing" && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                {loadingBilling ? (
                  <div className="text-sm text-muted-foreground">Загрузка данных по тарифу...</div>
                ) : !billing ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-muted-foreground">
                    Не удалось загрузить данные по тарифу. Попробуйте открыть окно заново.
                  </div>
                ) : (
                  <>
                    <div className={`rounded-lg border p-4 ${getBillingTone(billing.status, billing.requests_remaining)}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Текущий тариф
                          </div>
                          <div className="text-lg font-semibold text-foreground">
                            {billing.current_plan_name || "Не активирован"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Остаток запросов
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {requestsRemaining} / {requestsLimit}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Статус доступа
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                            <Clock3 className="h-4 w-4 text-primary" />
                            {getBillingStatusLabel(billing.status)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Почта
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            {getDomainTypeLabel(billing.email_domain_type)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {billing.has_verified_email ? (
                          <>
                            Подтвержденный email:{" "}
                            <span className="text-foreground">{billing.verified_from_email}</span>
                          </>
                        ) : (
                          "Чтобы получить Free 50, подключите и подтвердите корпоративную почту в блоке SMTP."
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-foreground">Доступные тарифы</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {billingPlans.map((plan) => {
                          const isCurrent = currentPlanCode === plan.code;
                          const isDisabled = plan.corporate_only && billing?.email_domain_type !== "corporate";

                          return (
                            <div
                              key={plan.code}
                              className={`rounded-lg border p-4 ${
                                isCurrent
                                  ? "border-primary/40 bg-primary/10"
                                  : "border-border bg-background"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-foreground">
                                    {plan.name}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {plan.requests_limit} запросов
                                  </div>
                                </div>

                                {isCurrent ? (
                                  <span className="text-[11px] rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                                    Текущий
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-4 text-lg font-bold text-foreground">
                                {plan.is_free ? "0 ₽" : `${plan.price_rub.toLocaleString("ru-RU")} ₽`}
                              </div>

                              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {plan.corporate_only
                                  ? "Доступен только после подтверждения корпоративной почты."
                                  : "Платный тариф. Подключение оплаты будет доступно на следующем этапе."}
                              </div>

                              {isDisabled ? (
                                <div className="mt-3 text-xs text-yellow-300/80">
                                  Для этого тарифа требуется подходящий тип доступа.
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
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
                    className="min-h-[180px] resize-y bg-background text-foreground leading-6 font-normal tracking-normal [text-shadow:none] [filter:none]"
                    style={{
                      WebkitFontSmoothing: "antialiased",
                      MozOsxFontSmoothing: "grayscale",
                      textShadow: "none",
                      filter: "none",
                    }}
                    value={state.template}
                    onChange={(e) => setTemplate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Для ускорения коммуникации советуем указать реквизиты компании в подписи к письму при необходимости.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={handleResetTemplate}>
                    Сбросить шаблон
                  </Button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setExpanded((p) => (p === "danger" ? null : "danger"))}
              className="w-full flex items-center justify-between rounded-lg border border-destructive/30 bg-card px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 font-medium text-destructive">
                <Trash2 className="h-4 w-4" />
                Удаление аккаунта
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded === "danger" ? "rotate-180" : ""}`}
              />
            </button>

            {expanded === "danger" && (
              <div className="rounded-lg border border-destructive/30 bg-card p-4 space-y-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground leading-relaxed">
                  Это необратимое действие. Будут удалены аккаунт, SMTP-настройки, история поисков и связанные данные.
                  Для операционных резервных копий и иных обязательных исключений ориентируйтесь на политику хранения данных и обращения в поддержку.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm-email">Введите email аккаунта для подтверждения</Label>
                  <Input
                    id="delete-confirm-email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder={meEmail || "email аккаунта"}
                    autoComplete="email"
                    disabled={deletingAccount}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-password">Введите пароль аккаунта</Label>
                  <Input
                    id="delete-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Пароль аккаунта"
                    type="password"
                    autoComplete="current-password"
                    disabled={deletingAccount}
                  />
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed">
                  Для соответствия 152-ФЗ пользователь может инициировать удаление аккаунта самостоятельно.
                  Если нужен отдельный запрос по данным без удаления аккаунта, используйте{" "}
                  <a href="mailto:support@smartoffer.pro" className="text-primary hover:underline">
                    support@smartoffer.pro
                  </a>.
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteAccount}
                  disabled={!canDeleteAccount || deletingAccount}
                >
                  {deletingAccount ? "Удаляем аккаунт…" : "Удалить аккаунт"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-6 py-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving || deletingAccount}
          >
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || deletingAccount}>
            {saving ? "Проверяем…" : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}