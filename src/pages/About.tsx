import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Brain,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Database,
  Inbox,
  LineChart,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquare,
  Minus,
  Network,
  PlugZap,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  FileText,
  ImageIcon,
  Paperclip,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { fetchMe, type UserMe } from "@/api/auth";
import { sendSupportRequest } from "@/api/support";
import {
  initTbankPayment,
  fetchMyPayment,
  fetchSbpBanks,
  fetchSbpDeeplink,
  type SbpBankItem,
} from "@/api/payments";
import { useToast } from "@/shared/hooks/use-toast";
import { clearAuthToken, getAuthToken } from "@/shared/utils/auth";
import { RadarLogo } from "@/shared/ui/RadarLogo";

type PaymentMethod = "card" | "sbp";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const PRICING = [
  {
    code: "free_50",
    name: "Пробный",
    price: "0 ₽",
    limit: "50 запросов",
    note: "Только для корпоративной почты",
    isFree: true,
  },
  {
    code: "start_200",
    name: "Старт",
    price: "3 000 ₽",
    limit: "200 запросов",
    note: "Старт для регулярных RFQ",
    isFree: false,
  },
  {
    code: "pro_500",
    name: "Профи",
    price: "5 500 ₽",
    limit: "500 запросов",
    note: "Оптимальный баланс",
    isFree: false,
  },
  {
    code: "max_1000",
    name: "Бизнес",
    price: "9 000 ₽",
    limit: "1000 запросов",
    note: "Для активных закупок",
    isFree: false,
  },
] as const;

type PricingPlan = (typeof PRICING)[number];

function planToCode(plan: PricingPlan | null): string | null {
  if (!plan || plan.isFree) return null;
  return plan.code;
}
function detectMobileOs(): "ios" | "android" | null {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return null;
}

function SbpQrDialog({
  open,
  onOpenChange,
  qrSvg,
  statusText,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  qrSvg: string;
  statusText: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-[420px]
          rounded-xl
          border border-white/10
          bg-card
          p-0
          text-white
          shadow-2xl
          [&_[data-radix-dialog-close]]:text-white/60
          [&_[data-radix-dialog-close]]:hover:text-white
        "
      >
        <div className="rounded-xl px-6 py-6">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-[22px] font-semibold text-white">
              Оплата по СБП
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 text-sm text-white/65">
            Отсканируйте QR-код в приложении банка.
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white p-4 flex items-center justify-center">
            {qrSvg ? (
              <div
                className="w-[260px] h-[260px] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="text-sm text-black/60">QR-код не получен</div>
            )}
          </div>

          <div className="mt-4 text-sm text-white/65">
            {statusText || "Ожидаем оплату..."}
          </div>

          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full border-white/15 text-white hover:bg-white/10"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SbpBanksDialog({
  open,
  onOpenChange,
  banks,
  loading,
  onSelectBank,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  banks: SbpBankItem[];
  loading: boolean;
  onSelectBank: (bank: SbpBankItem) => Promise<void> | void;
}) {
  const [submittingBankId, setSubmittingBankId] = useState<string | null>(null);

  async function handleClick(bank: SbpBankItem) {
    try {
      setSubmittingBankId(bank.bank_id);
      await onSelectBank(bank);
    } finally {
      setSubmittingBankId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-[420px]
          rounded-xl
          border border-white/10
          bg-card
          p-0
          text-white
          shadow-2xl
          [&_[data-radix-dialog-close]]:text-white/60
          [&_[data-radix-dialog-close]]:hover:text-white
        "
      >
        <div className="rounded-xl px-6 py-6">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-[22px] font-semibold text-white">
              Выберите банк
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 text-sm text-white/65">
            На телефоне оплата по СБП откроется через приложение выбранного банка.
          </div>

          <div className="mt-5 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70">
                Загружаем список банков...
              </div>
            ) : banks.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70">
                Список банков пока не получен.
              </div>
            ) : (
              banks.map((bank) => (
                <button
                  key={bank.bank_id}
                  type="button"
                  onClick={() => void handleClick(bank)}
                  disabled={submittingBankId !== null}
                  className="
                    w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left
                    transition hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed
                  "
                >
                  <div className="font-medium text-white">
                    {submittingBankId === bank.bank_id ? "Открываем..." : (bank.bank_name || "Банк")}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full border-white/15 text-white hover:bg-white/10"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const INVOICE_REQUISITES_TEMPLATE = `ООО / ИП
ИНН
КПП
ОГРН / ОГРНИП
Юридический адрес
Почта для документов
Банк
р/с
к/с
БИК`;

const INVOICE_REQUISITES_STORAGE_KEY = "SMARTOFFER_INVOICE_REQUISITES_V1";

function loadSavedInvoiceRequisites(): string {
  try {
    const raw = localStorage.getItem(INVOICE_REQUISITES_STORAGE_KEY)?.trim();
    return raw && raw.length > 0 ? raw : INVOICE_REQUISITES_TEMPLATE;
  } catch {
    return INVOICE_REQUISITES_TEMPLATE;
  }
}

function saveInvoiceRequisites(value: string) {
  try {
    const normalized = value.trim();
    if (!normalized) {
      localStorage.removeItem(INVOICE_REQUISITES_STORAGE_KEY);
      return;
    }
    localStorage.setItem(INVOICE_REQUISITES_STORAGE_KEY, value);
  } catch {
    // ignore localStorage errors
  }
}

function InvoiceRequestModal({
  open,
  onOpenChange,
  selectedPlan,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  selectedPlan: PricingPlan | null;
}) {
  const [me, setMe] = useState<UserMe | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [requisites, setRequisites] = useState(() => loadSavedInvoiceRequisites());
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;

    const token = getAuthToken();
    if (!token) {
      setMe(null);
      return;
    }

    setMeLoading(true);
    fetchMe()
      .then((user) => setMe(user))
      .catch(() => {
        clearAuthToken();
        setMe(null);
      })
      .finally(() => setMeLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (selectedPlan?.isFree) {
      setSubject('Запрос по тарифу "Пробный"');
      setComment('Интересует подключение тарифа "Пробный" для корпоративной почты.');
      return;
    }

    if (selectedPlan) {
      setSubject(`Счет на тариф ${selectedPlan.limit}`);
      setComment(`Интересует тариф ${selectedPlan.name} (${selectedPlan.limit}).`);
      return;
    }

    setSubject("");
    setComment("");
  }, [open, selectedPlan]);

  useEffect(() => {
    if (!open) return;
    setRequisites(loadSavedInvoiceRequisites());
  }, [open]);

  useEffect(() => {
    saveInvoiceRequisites(requisites);
  }, [requisites]);

  const canSubmit = useMemo(() => {
    return (
      !!me?.email &&
      subject.trim().length >= 3 &&
      requisites.trim().length >= 10 &&
      !loading
    );
  }, [me?.email, subject, requisites, loading]);

  function resetState() {
    setSubject("");
    setRequisites(loadSavedInvoiceRequisites());
    setComment("");
    setLoading(false);
    setSuccessText("");
    setErrorText("");
  }

  function closeModal(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        resetState();
      }, 150);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || loading || !me?.email) return;

    const message = [
      selectedPlan
        ? `Выбранный тариф: ${selectedPlan.name} / ${selectedPlan.price} / ${selectedPlan.limit}`
        : null,
      selectedPlan ? "Срок действия тарифа: 30 календарных дней." : null,
      "",
      "Реквизиты для выставления счета:",
      requisites.trim(),
      comment.trim() ? "" : null,
      comment.trim() ? "Комментарий:" : null,
      comment.trim() ? comment.trim() : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join("\n");

    try {
      setLoading(true);
      setErrorText("");
      setSuccessText("");

      const res = await sendSupportRequest({
        contact_email: me.email,
        subject: subject.trim(),
        message,
        source: "about_invoice_request",
        page_url: window.location.href,
      });

      setSuccessText(
        `Запрос отправлен. № обращения: ${res.ticket_number}. Мы ответим в течение рабочего дня.`
      );
      setComment("");
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Не удалось отправить запрос"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="
          w-[calc(100vw-16px)]
          sm:w-full
          max-w-[640px]
          max-h-[90vh]
          overflow-hidden
          rounded-xl
          border border-white/10
          bg-card
          p-0
          text-white
          shadow-2xl
          [&_[data-radix-dialog-close]]:text-white/60
          [&_[data-radix-dialog-close]]:hover:text-white
        "
      >
        <div className="max-h-[90vh] overflow-y-auto overscroll-contain rounded-xl px-4 py-5 sm:px-7 sm:py-6">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-[22px] font-semibold text-white">
              Запросить счет
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <p className="text-[15px] text-white/60">
              Укажите реквизиты компании для выставления счета. Сообщение будет
              отправлено от вашего авторизованного аккаунта на info@smartoffer.pro.
            </p>

            <div className="mt-5 space-y-4">
              {meLoading ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                  Загружаем профиль...
                </div>
              ) : me?.email ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                  Обращение будет отправлено от авторизованного аккаунта: {me.email}
                </div>
              ) : (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  Для отправки запроса нужно войти в аккаунт.
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-white/80">Тема</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Например: Счет на тариф 500 запросов"
                  className="h-11 border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Реквизиты для счета
                </label>
                <Textarea
                  value={requisites}
                  onChange={(e) => setRequisites(e.target.value)}
                  placeholder="Укажите реквизиты компании"
                  className="min-h-[210px] resize-y border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/80">
                  Комментарий
                  <span className="ml-1 text-white/45">(необязательно)</span>
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Можно указать нужный тариф, количество запросов или дополнительные пожелания"
                  className="min-h-[110px] border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
              </div>

              {errorText ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {errorText}
                </div>
              ) : null}

              {successText ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {successText}
                </div>
              ) : null}

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading || meLoading}
                  className="h-11 min-w-[220px] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Отправить запрос
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-white/55">
                Мы ответим в течение рабочего дня и подготовим счет по указанным
                реквизитам.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function PlanPaymentModal({
  open,
  onOpenChange,
  selectedPlan,
  onRequestInvoice,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  selectedPlan: PricingPlan | null;
  onRequestInvoice: (plan: PricingPlan | null) => void;
}) {
  const { toast } = useToast();
  const [paymentNotice, setPaymentNotice] = useState("");
  const [payingMethod, setPayingMethod] = useState<PaymentMethod | null>(null);

  const [sbpOpen, setSbpOpen] = useState(false);
  const [sbpQrSvg, setSbpQrSvg] = useState("");
  const [sbpOrderId, setSbpOrderId] = useState<number | null>(null);
  const [sbpStatusText, setSbpStatusText] = useState("");

  const [sbpBanksOpen, setSbpBanksOpen] = useState(false);
  const [sbpBanks, setSbpBanks] = useState<SbpBankItem[]>([]);
  const [sbpBanksLoading, setSbpBanksLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPaymentNotice("");
      setPayingMethod(null);
      setSbpOpen(false);
      setSbpQrSvg("");
      setSbpOrderId(null);
      setSbpStatusText("");
      setSbpBanksOpen(false);
      setSbpBanks([]);
      setSbpBanksLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!sbpOrderId || (!sbpOpen && !sbpBanksOpen)) return;

    let cancelled = false;
    let timer: number | null = null;

    async function poll() {
      try {
        const payment = await fetchMyPayment(sbpOrderId);
        if (cancelled) return;

        if (payment.status === "confirmed") {
          setSbpStatusText("Оплата подтверждена. Тариф активирован.");
          timer = window.setTimeout(() => {
            setSbpOpen(false);
            setSbpBanksOpen(false);
            window.location.reload();
          }, 1200);
          return;
        }

        if (payment.status === "failed" || payment.status === "canceled") {
          setSbpStatusText("Оплата не завершена.");
          return;
        }

        setSbpStatusText("Ожидаем оплату по СБП...");
      } catch {
        if (!cancelled) {
          setSbpStatusText("Проверяем статус оплаты...");
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(poll, 3000);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sbpOrderId, sbpOpen, sbpBanksOpen]);

  async function handleHostedPayment(method: PaymentMethod) {
    if (!selectedPlan) return;

    const planCode = planToCode(selectedPlan);
    if (!planCode) {
  setPaymentNotice(
    'Для тарифа "Пробный" оплата не требуется. Этот тариф подключается отдельно по правилам сервиса.'
  );
  return;
}

    try {
      setPaymentNotice("");
      setPayingMethod(method);

      const result = await initTbankPayment({
        plan_code: planCode,
        preferred_method: method,
      });

      if (result.mode === "redirect" && result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }

      if (result.mode === "sbp_qr" && result.order_id) {
        setSbpOrderId(result.order_id);

        const mobileOs = detectMobileOs();
        if (mobileOs) {
          setSbpBanksLoading(true);
          try {
            const banks = await fetchSbpBanks({
              payment_order_id: result.order_id,
              os: mobileOs,
            });

            const items = Array.isArray(banks.items) ? banks.items : [];
            if (items.length > 0) {
              setSbpBanks(items);
              setSbpStatusText("Выберите банк для оплаты.");
              setSbpBanksOpen(true);
              return;
            }

            if (result.sbp_qr_svg) {
              setSbpQrSvg(result.sbp_qr_svg);
              setSbpStatusText("Список банков недоступен. Используйте QR-код для оплаты.");
              setSbpOpen(true);
              return;
            }

            throw new Error("Т-Банк не вернул список банков СБП.");
          } catch (error) {
            if (result.sbp_qr_svg) {
              setSbpQrSvg(result.sbp_qr_svg);
              setSbpStatusText("Список банков недоступен. Используйте QR-код для оплаты.");
              setSbpOpen(true);
              return;
            }
            throw error;
          } finally {
            setSbpBanksLoading(false);
          }
        }

        if (result.sbp_qr_svg) {
          setSbpQrSvg(result.sbp_qr_svg);
          setSbpStatusText("Ожидаем оплату по СБП...");
          setSbpOpen(true);
          return;
        }
      }

      throw new Error("Банк не вернул данные для оплаты");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось создать платёж";

      setPaymentNotice(message);
      toast({
        title: "Ошибка оплаты",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPayingMethod(null);
    }
  }

  async function handleSelectBank(bank: SbpBankItem) {
    if (!sbpOrderId) return;

    const res = await fetchSbpDeeplink({
      payment_order_id: sbpOrderId,
      bank_id: bank.bank_id,
    });

    window.location.href = res.deeplink;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="
            max-w-[760px]
            rounded-xl
            border border-white/10
            bg-card
            p-0
            text-white
            shadow-2xl
            [&_[data-radix-dialog-close]]:text-white/60
            [&_[data-radix-dialog-close]]:hover:text-white
          "
        >
          <div className="rounded-xl px-7 py-6">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-[22px] font-semibold text-white">
                Цены
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад к тарифам
              </button>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-lg font-semibold text-white">
                  Выбран тариф: {selectedPlan?.name}
                </div>
                <div className="mt-2 text-sm text-white/70">
                  {selectedPlan?.price} · {selectedPlan?.limit}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  Срок действия тарифа: 30 календарных дней с момента активации.
                </div>
              </div>

              <div className="mt-5">
                <div className="text-base font-semibold text-white mb-3">
                  Выберите способ оплаты
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => void handleHostedPayment("card")}
                    disabled={payingMethod !== null}
                    className="
                      rounded-xl border border-white/10 bg-white/5
                      px-5 py-5 text-left transition hover:border-primary/60 hover:bg-white/10
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                  >
                    <div className="text-base font-semibold text-white">
                      {payingMethod === "card" ? "Переход..." : "Карта онлайн"}
                    </div>
                    <div className="mt-2 text-sm text-white/65">
                      Быстрое подключение тарифа после подтверждения оплаты.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleHostedPayment("sbp")}
                    disabled={payingMethod !== null}
                    className="
                      rounded-xl border border-white/10 bg-white/5
                      px-5 py-5 text-left transition hover:border-primary/60 hover:bg-white/10
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                  >
                    <div className="text-base font-semibold text-white">
                      {payingMethod === "sbp" ? "Подготовка..." : "СБП"}
                    </div>
                    <div className="mt-2 text-sm text-white/65">
                      На компьютере — QR-код, на телефоне — переход в банковское приложение.
                    </div>
                  </button>

                  <div
                    className="
                      rounded-xl border border-white/10 bg-white/5
                      px-5 py-5 text-left
                    "
                  >
                    <div className="text-base font-semibold text-white">
                      Счёт для юр. лиц
                    </div>
                    <div className="mt-2 text-sm text-white/65">
                      Для компаний и ИП. Реквизиты указываются в форме запроса
                      счёта.
                    </div>

                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onRequestInvoice(selectedPlan)}
                        className="w-full border-white/15 text-white hover:bg-white/10"
                      >
                        Запросить счёт
                      </Button>
                    </div>
                  </div>
                </div>

                {paymentNotice ? (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    {paymentNotice}
                  </div>
                ) : null}

                <div className="mt-5 text-sm text-white/55">
                  После выбора способа оплаты откроется защищённая платёжная форма банка.
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SbpQrDialog
        open={sbpOpen}
        onOpenChange={setSbpOpen}
        qrSvg={sbpQrSvg}
        statusText={sbpStatusText}
      />

      <SbpBanksDialog
        open={sbpBanksOpen}
        onOpenChange={setSbpBanksOpen}
        banks={sbpBanks}
        loading={sbpBanksLoading}
        onSelectBank={handleSelectBank}
      />
    </>
  );
}

function AvailabilityMark({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
      <Check className="h-4 w-4" />
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.025] text-white/25">
      <Minus className="h-4 w-4" />
    </span>
  );
}

function AnalyticsShowcase() {
  const funnel = [
    { label: "Найдено поставщиков", value: 1240, width: "100%" },
    { label: "RFQ отправлено", value: 836, width: "67%" },
    { label: "Ответы поставщиков", value: 519, width: "45%" },
    { label: "КП получено", value: 273, width: "28%" },
    { label: "Сделки", value: 38, width: "13%" },
  ];

  return (
    <figure className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b111b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            Аналитика закупок
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            Эффективность RFQ за 7 дней
          </div>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          Демонстрационные данные
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        {[
          ["Запросов", "124", "+18%"],
          ["RFQ отправлено", "836", "+23%"],
          ["КП получено", "147", "+31%"],
          ["Конверсия в сделку", "14,5%", "+2,8 п.п."],
        ].map(([label, value, trend]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="text-xs text-white/45">{label}</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-2xl font-semibold text-white">{value}</div>
              <div className="text-xs font-medium text-emerald-300">{trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[1.25fr_0.75fr] md:px-6 md:pb-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Воронка закупки</div>
              <div className="mt-1 text-xs text-white/40">От найденного контакта до сделки</div>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {funnel.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-white/60">{item.label}</span>
                  <span className="font-medium text-white">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="text-sm font-medium text-white">Результат команды</div>
          <div className="mt-1 text-xs text-white/40">Сравнение по менеджерам</div>

          <div className="mt-5 space-y-4">
            {[
              ["Анна", 42, "16 Сделок"],
              ["Михаил", 31, "12 Сделок"],
              ["Давид", 27, "10 Сделок"],
            ].map(([name, score, detail]) => (
              <div key={String(name)}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-white/70">{name}</span>
                  <span className="text-white/45">{detail}</span>
                </div>
                <div className="mt-2 h-8 overflow-hidden rounded-lg bg-white/[0.04]">
                  <div
                    className="flex h-full items-center justify-end rounded-lg bg-white/[0.08] px-2 text-[11px] font-medium text-white/70"
                    style={{ width: `${score}%` }}
                  >
                    {score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="border-t border-white/10 px-5 py-3 text-[11px] text-white/35 md:px-6">
        Концепт расширенной аналитики на базе уже сохраняемых данных SmartOffer: запросы, отправки, ответы, КП, сделки и поставки.
      </figcaption>
    </figure>
  );
}

function AiShowcase() {
  return (
    <figure className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b111b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            AI-контур SmartOffer
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            Оборудование и поставщик в одном экране
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2 md:p-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Анализ оборудования</div>
              <div className="text-xs text-white/40">Насос центробежный морского исполнения</div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.1em] text-white/35">Что проверить в RFQ</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Подача и напор", "Материал корпуса", "Морской регистр", "Тип уплотнения"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/65">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/[0.055] p-4">
              <div className="text-xs font-medium text-primary">Подходящие направления аналогов</div>
              <div className="mt-2 text-sm leading-relaxed text-white/65">
                Морские центробежные насосы аналогичной гидравлической точки; исполнение из бронзы или нержавеющей стали; подтверждение класса РМРС/РКО.
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.1em] text-white/35">Риски подбора</div>
              <div className="mt-2 space-y-2 text-sm text-white/60">
                <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Несовпадение рабочей точки и кавитационного запаса.</div>
                <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Неуказанное климатическое или взрывозащищённое исполнение.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">ООО «СеверПромСнаб»</div>
                <div className="text-xs text-white/40">ИНН 7800000000 · sales@severprom.example</div>
              </div>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              Риск: низкий
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Контакт", "Корпоративный email"],
              ["Домен", "Требует сверки"],
              ["Статус RFQ", "Отправлено"],
              ["Ответ", "КП получено"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <div className="text-[11px] text-white/35">{label}</div>
                <div className="mt-1 text-xs font-medium text-white/75">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="text-xs font-medium uppercase tracking-[0.1em] text-white/35">Предварительная справка</div>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              <div className="flex justify-between gap-4"><span>Статус</span><span className="text-white/80">Действующая организация</span></div>
              <div className="flex justify-between gap-4"><span>Основная деятельность</span><span className="text-right text-white/80">Оптовая торговля оборудованием</span></div>
              <div className="flex justify-between gap-4"><span>Выручка</span><span className="text-white/80">89,1 млн ₽</span></div>
              <div className="flex justify-between gap-4"><span>Чистая прибыль</span><span className="text-white/80">16,0 млн ₽</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-relaxed text-amber-100/70">
            Справка носит предварительный характер. Реквизиты и юридически значимые сведения необходимо сверять по официальным источникам.
          </div>
        </div>
      </div>

      <figcaption className="border-t border-white/10 px-5 py-3 text-[11px] text-white/35 md:px-6">
        Демонстрационный макет. Фактический AI-анализ формируется из данных конкретного запроса, коммуникации и указанного ИНН.
      </figcaption>
    </figure>
  );
}

function TeamShowcase() {
  const stats = [
    {
      icon: FileText,
      value: "124",
      label: "Запроса",
      sub: "Всего запросов",
      tone: "blue",
    },
    {
      icon: Send,
      value: "110",
      label: "Отправлено",
      sub: "С отправкой писем",
      tone: "amber",
    },
    {
      icon: Mail,
      value: "273",
      label: "КП получено",
      sub: "Получены ответы",
      tone: "emerald",
    },
    {
      icon: CheckCircle2,
      value: "38",
      label: "Сделок",
      sub: "Успешно завершены",
      tone: "teal",
    },
    {
      icon: MessageSquare,
      value: "519",
      label: "Ответов",
      sub: "Всего в переписке",
      tone: "violet",
    },
  ];

  const rows = [
    {
      title: "Запрос КП — SSD A-DATA Ultimate SU650 256GB",
      date: "01 июля 2026, 11:20",
      employee: "Анна Петрова",
      results: 16,
      sent: 1,
      kp: 1,
      replies: 3,
      status: "Сделка",
      statusTone: "emerald",
      delivery: "Поставка: 4 июля",
      stripe: "amber",
    },
    {
      title: "Запрос КП — Судовой насос 80 м³/ч",
      date: "30 июня 2026, 14:05",
      employee: "Михаил Орлов",
      results: 12,
      sent: 1,
      kp: 1,
      replies: 4,
      status: "КП получено",
      statusTone: "sky",
      delivery: "Поставка: 8 июля",
      stripe: "sky",
    },
    {
      title: "Запрос КП — Арматура DN150",
      date: "29 июня 2026, 10:42",
      employee: "Давид Дзусов",
      results: 18,
      sent: 1,
      kp: 1,
      replies: 2,
      status: "В работе",
      statusTone: "amber",
      delivery: "Ожидаем решение",
      stripe: "emerald",
    },
    {
      title: "Запрос КП — Контроллер PLC для линии",
      date: "28 июня 2026, 16:28",
      employee: "Анна Петрова",
      results: 9,
      sent: 1,
      kp: 0,
      replies: 2,
      status: "Отправлено",
      statusTone: "blue",
      delivery: "Ответы собираются",
      stripe: "violet",
    },
  ];

  const dayCells = [
    ["30", false],
    ["1", true],
    ["2", false],
    ["3", false],
    ["4", true],
    ["5", false],
    ["6", false],
    ["7", false],
    ["8", true],
    ["9", false],
    ["10", false],
    ["11", false],
    ["12", false],
    ["13", false],
  ] as const;

  return (
    <figure className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b111b]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            Тариф Бизнес
          </div>

          <div className="mt-1 text-base font-semibold text-white">
            История сотрудников
          </div>

          <div className="mt-1 text-[11px] text-white/40">
            Запросы, отправки, КП и сделки менеджеров вашей команды
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/65 transition hover:bg-white/[0.06] hover:text-white"
        >
          Обновить
        </button>
      </div>

      <div className="p-4 md:p-5">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/65">
            Моя история
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary text-[11px] text-primary-foreground px-4 py-2 font-medium">
            История сотрудников
          </div>
        </div>

        {/* Analytics */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1420] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">
              Статистика сотрудников
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
                7 дней
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60">
                30 дней
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60">
                90 дней
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60">
                Всё время
              </div>
            </div>
          </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
  {stats.map((item) => {
    const Icon = item.icon;

    const toneClass =
      item.tone === "blue"
        ? "from-[#1a2745] to-[#13203a] border-sky-500/15"
        : item.tone === "amber"
          ? "from-[#2b2210] to-[#1d1820] border-primary/15"
          : item.tone === "emerald"
            ? "from-[#112720] to-[#10231b] border-emerald-500/15"
            : item.tone === "teal"
              ? "from-[#0d2a2c] to-[#102129] border-teal-500/15"
              : "from-[#241438] to-[#1c1730] border-violet-500/15";

    const iconTone =
      item.tone === "blue"
        ? "text-sky-300"
        : item.tone === "amber"
          ? "text-primary"
          : item.tone === "emerald"
            ? "text-emerald-300"
            : item.tone === "teal"
              ? "text-teal-300"
              : "text-violet-300";

    return (
      <div
        key={item.label}
        className={`flex min-w-0 flex-col rounded-2xl border bg-gradient-to-br ${toneClass} p-3`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon className={`h-4 w-4 ${iconTone}`} />
        </div>

        <div className="mt-3 min-w-0">
          <div className="text-2xl font-semibold leading-none text-white">
            {item.value}
          </div>

          <div className="mt-2 min-h-[32px] break-words text-[10px] font-semibold leading-4 text-white">
            {item.label}
          </div>

          <div className="mt-2 break-words text-[9px] leading-4 text-white/40">
            {item.sub}
          </div>
        </div>
      </div>
    );
  })}
</div>

<div className="mt-4 rounded-xl border border-white/10 bg-[#0a1320] px-4 py-3 text-sm">
  <span className="font-medium text-white">
    Конверсия отправка → сделка
  </span>

  <span className="ml-3 text-lg font-semibold text-emerald-300">
    14.5%
  </span>

  <span className="ml-2 text-white/45">
    38 сделок из 263 запросов с отправкой
  </span>
</div>
</div>

{/* Фильтры истории */}
<div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
  <div className="flex flex-wrap gap-2">
    <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] text-primary">
      Все <span className="ml-1 text-white/70">124</span>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/70">
      Сделка <span className="ml-1 text-emerald-300">38</span>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/70">
      Отправлено <span className="ml-1 text-primary">110</span>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/70">
      Без отправки <span className="ml-1 text-rose-300">14</span>
    </div>
  </div>

  <div className="flex flex-col gap-2 sm:flex-row">
    <div className="rounded-xl border border-white/10 bg-[#0a1320] px-4 py-2 text-[10px] text-white/70">
      Все сотрудники
    </div>

    <div className="rounded-xl border border-white/10 bg-[#0a1320] px-4 py-2 text-[10px] text-white/35">
      Поиск по теме запроса...
    </div>
  </div>
</div>

{/* История запросов */}
<div className="mt-4 space-y-2">
  {rows.map((row) => {
    const stripeClass =
      row.stripe === "amber"
        ? "bg-primary"
        : row.stripe === "sky"
          ? "bg-sky-400"
          : row.stripe === "emerald"
            ? "bg-emerald-400"
            : "bg-violet-400";

    const statusClass =
      row.statusTone === "emerald"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
        : row.statusTone === "sky"
          ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
          : row.statusTone === "amber"
            ? "border-primary/25 bg-primary/10 text-primary"
            : "border-blue-400/25 bg-blue-400/10 text-blue-300";

    return (
      <div
        key={row.title}
        className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1420]"
      >
        <div
          className={`absolute inset-y-0 left-0 w-1 ${stripeClass}`}
        />

        <div className="grid min-h-[72px] gap-3 px-4 py-2.5 pl-5 xl:grid-cols-[minmax(230px,1.45fr)_auto_auto] xl:items-center">
          {/* Запрос */}
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold leading-5 text-white">
              {row.title}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] text-white/40">
              <span>{row.date}</span>
              <span className="text-white/20">•</span>
              <span className="text-sky-300">{row.employee}</span>
            </div>
          </div>

          {/* Показатели */}
          <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
            <div className="min-w-[40px] text-center">
              <div className="text-[11px] font-semibold leading-none text-white">
                {row.results}
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] text-white/40">
                результатов
              </div>
            </div>

            <div className="min-w-[40px] text-center">
              <div className="text-[11px] font-semibold leading-none text-white">
                {row.sent}
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] text-white/40">
                отправлено
              </div>
            </div>

            <div className="min-w-[44px] text-center">
              <div className="text-[11px] font-semibold leading-none text-white">
                {row.kp}
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] text-white/40">
                КП получено
              </div>
            </div>

            <div className="min-w-[36px] text-center">
              <div className="text-[11px] font-semibold leading-none text-white">
                {row.replies}
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] text-white/40">
                ответов
              </div>
            </div>
          </div>

          {/* Статус */}
          <div className="flex min-w-[160px] items-center justify-between gap-3 xl:justify-end">
            <div className="text-right">
              <div
                className={`inline-flex whitespace-nowrap rounded-lg border px-3 py-1.5 text-[9px] font-medium ${statusClass}`}
              >
                {row.status}
              </div>

              <div className="mt-1 whitespace-nowrap text-[7px] text-white/40">
                {row.delivery}
              </div>
            </div>

            <div className="hidden min-w-[72px] xl:block">
              <div className="flex items-center gap-1.5 text-[8px] text-white/65">
                <div
                  className={`h-3 w-3 rounded-[3px] border ${
                    row.status === "Сделка"
                      ? "border-emerald-400 bg-emerald-400/20"
                      : "border-white/25 bg-transparent"
                  }`}
                />

                <span className="whitespace-nowrap">
                  Сделка
                </span>
              </div>

              <div className="mt-1.5 whitespace-nowrap text-[7px] text-white/30">
                Дата поставки
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>
        {/* Calendar + notes below */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.52fr_0.48fr]">
          {/* Calendar */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Календарь поставок
                </div>

                <div className="mt-1 text-[11px] text-white/40">
                  Дни с поставками подсвечены
                </div>
              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
                3
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60"
              >
                ‹
              </button>

              <div className="text-sm font-semibold text-white">
                Июль 2026
              </div>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60"
              >
                ›
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div key={day} className="text-[10px] text-white/30">
                  {day}
                </div>
              ))}

              {dayCells.map(([day, active], idx) => (
                <div
                  key={`${day}-${idx}`}
                  className={`flex h-10 items-center justify-center rounded-lg border text-[11px] ${
                    active
                      ? "border-primary/30 bg-primary/12 text-primary"
                      : "border-white/10 bg-white/[0.02] text-white/65"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <div className="text-[10px] text-white/35">4 июля</div>
                <div className="mt-1 text-[11px] font-medium text-white">
                  Поставка SSD — Анна
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <div className="text-[10px] text-white/35">8 июля</div>
                <div className="mt-1 text-[11px] font-medium text-white">
                  Насосы — Михаил
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Заметки
                </div>

                <div className="mt-1 text-[11px] text-white/40">
                  01.07.2026
                </div>
              </div>

              <div className="flex gap-2">
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] text-primary">
                  День
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/60">
                  Все
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#0a1320] p-4">
              <div className="text-sm leading-7 text-white/65">
                Например: уточнить срок поставки, проверить оплату,
                связаться с поставщиком по обновлённому КП и подтвердить
                дату отгрузки.
              </div>
            </div>

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] text-white/40"
            >
              Сохранить заметку
            </button>
          </div>
        </div>
      </div>

      <figcaption className="border-t border-white/10 px-5 py-3 text-[11px] text-white/35 md:px-6">
        Демонстрационный интерфейс истории сотрудников за 7 дней:
        руководитель видит общую статистику, запросы команды, поставки
        и заметки в одном рабочем контуре.
      </figcaption>
    </figure>
  );
}
function TeamChatShowcase() {
  const demoMembers = [
    {
      initials: "АП",
      name: "Анна Петрова",
      role: "Менеджер по закупкам",
      preview: "Прикладываю обновлённое КП",
      time: "14:32",
      unread: 1,
      active: true,
    },
    {
      initials: "МО",
      name: "Михаил Орлов",
      role: "Инженер",
      preview: "Срок поставки подтверждён",
      time: "13:18",
      unread: 0,
      active: false,
    },
    {
      initials: "ДД",
      name: "Давид Дзусов",
      role: "Руководитель",
      preview: "Проверьте исполнение сроков",
      time: "11:47",
      unread: 0,
      active: false,
    },
  ];

  return (
    <figure className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b111b]">
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            Командная работа
          </div>

          <div className="mt-1 text-base font-semibold text-white">
            Внутренний чат отдела снабжения
          </div>
        </div>

        <MessageSquare className="h-5 w-5 text-primary" />
      </div>

      <div className="grid min-h-[520px] md:grid-cols-[0.37fr_0.63fr]">
        {/* Список сотрудников */}
        <div className="border-b border-white/10 bg-white/[0.018] md:border-b-0 md:border-r">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Сотрудники
                </div>

                <div className="mt-1 text-[11px] text-white/40">
                  Диалоги команды
                </div>
              </div>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />

              <div className="h-9 rounded-lg border border-white/10 bg-[#0a1320] pl-9 pr-3 text-[11px] leading-9 text-white/35">
                Поиск по сотрудникам...
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {demoMembers.map((member) => (
              <div
                key={member.name}
                className={`relative rounded-xl border p-3 transition ${
                  member.active
                    ? "border-primary/45 bg-primary/[0.09]"
                    : "border-transparent bg-white/[0.018]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                      member.active
                        ? "border-primary/30 bg-primary text-primary-foreground"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    {member.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-white">
                        {member.name}
                      </div>

                      <div className="shrink-0 text-[9px] text-white/35">
                        {member.time}
                      </div>
                    </div>

                    <div className="mt-1 truncate text-[9px] text-white/35">
                      {member.role}
                    </div>

                    <div className="mt-1 truncate text-[10px] text-white/55">
                      {member.preview}
                    </div>
                  </div>
                </div>

                {member.unread > 0 && (
                  <div className="absolute right-3 top-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-semibold text-white">
                    {member.unread}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-white/10 px-4 py-3 text-[10px] text-white/35">
            3 сотрудника доступны
          </div>
        </div>

        {/* Окно диалога */}
        <div className="flex min-h-[520px] min-w-0 flex-col">
          {/* Шапка диалога */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                АП
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  Анна Петрова
                </div>

                <div className="mt-0.5 text-[10px] text-white/40">
                  Менеджер по закупкам · в сети
                </div>
              </div>
            </div>

            <div className="hidden min-w-[190px] items-center gap-2 rounded-lg border border-white/10 bg-[#0a1320] px-3 py-2 text-[10px] text-white/35 sm:flex">
              <Search className="h-3.5 w-3.5" />
              Поиск в диалоге...
            </div>
          </div>

          {/* Сообщения */}
          <div className="min-h-0 flex-1 space-y-5 overflow-hidden p-4 md:p-5">
            <div className="flex justify-center">
              <div className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] text-white/35">
                Сегодня
              </div>
            </div>

            {/* Входящее сообщение */}
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.055] px-4 py-3">
                <div className="text-[9px] font-medium text-sky-300">
                  Анна Петрова
                </div>

                <div className="mt-1 text-[11px] leading-5 text-white/80">
                  По запросу на судовые насосы получили два коммерческих
                  предложения. У «Вектор Сторидж» цена ниже бюджета на 7%,
                  но срок поставки составляет 45 дней.
                </div>

                <div className="mt-2 text-right text-[8px] text-white/30">
                  14:18
                </div>
              </div>
            </div>

            {/* Исходящее сообщение */}
            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-tr-md border border-primary/35 bg-primary/[0.09] px-4 py-3">
                <div className="text-[11px] leading-5 text-white/85">
                  Сверь установочные размеры, условия гарантии и наличие
                  сертификатов морского регистра.
                </div>

                <div className="mt-2 text-right text-[8px] text-primary/70">
                  14:22
                </div>
              </div>
            </div>

            {/* Входящее сообщение */}
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.055] px-4 py-3">
                <div className="text-[9px] font-medium text-sky-300">
                  Анна Петрова
                </div>

                <div className="mt-1 text-[11px] leading-5 text-white/80">
                  Размеры в допуске, гарантия 18 месяцев.
                  Поставщик подтвердил документы и прислал обновлённое КП.
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] font-medium text-white">
                      КП_насосы_Вектор_Сторидж.pdf
                    </div>

                    <div className="mt-1 text-[9px] text-white/35">
                      684 КБ
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-right text-[8px] text-white/30">
                  14:31
                </div>
              </div>
            </div>

            {/* Демонстрационное изображение */}
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.055] p-3">
                <div className="flex h-[92px] items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-sky-400/[0.08] via-white/[0.025] to-primary/[0.08]">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-primary" />

                    <div className="mt-2 text-[9px] text-white/45">
                      Анализ поставщика и статусы RFQ
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-medium text-white/75">
                  Скриншот_анализа_поставщика.png
                </div>

                <div className="mt-2 text-right text-[8px] text-white/30">
                  14:32
                </div>
              </div>
            </div>

            {/* Последнее сообщение руководителя */}
            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-tr-md border border-primary/35 bg-primary/[0.09] px-4 py-3">
                <div className="text-[11px] leading-5 text-white/85">
                  Принято. Добавил поставку на 17 июля.
                </div>

                <div className="mt-2 text-right text-[8px] text-primary">
  14:35
</div>
              </div>
            </div>
          </div>

          {/* Поле ввода */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-white/55"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <div className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a1320] px-3 text-[10px] leading-10 text-white/35">
                Введите сообщение...
              </div>

              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 text-[9px] text-white/30">
              Enter — отправить · Shift+Enter — новая строка · Файлы до 20 МБ
            </div>
          </div>
        </div>
      </div>

      <figcaption className="border-t border-white/10 px-5 py-3 text-[11px] text-white/35 md:px-6">
        Демонстрационный чат. Сотрудники могут обсуждать запросы, передавать
        документы, изображения и результаты анализа внутри команды.
      </figcaption>
    </figure>
  );
}

const PLAN_DETAILS: Record<string, { accent?: boolean; features: string[] }> = {
  free_50: {
    features: [
      "Для знакомства с сервисом на реальных закупочных задачах",
      "Подходит для нерегулярных запросов одного специалиста",
      "50 запросов однократно после подключения корпоративной почты",
    ],
  },
  start_200: {
    features: [
  "Для регулярной работы одного специалиста по закупкам",
  "Подходит для небольшого объёма текущих RFQ",
  "Базовый платный тариф для самостоятельной работы",
    ],
  },
  pro_500: {
    accent: true,
    features: [
  "Для активной закупочной работы и постоянного потока запросов",
  "Подходит для нескольких категорий оборудования и поставщиков",
  "Оптимальный баланс лимита, стоимости и возможностей",
    ],
  },
  max_1000: {
    features: [
  "Для отдела снабжения с руководителем и несколькими менеджерами",
  "Единое рабочее пространство для всей закупочной команды",
  "Общий лимит, контроль результатов и координация сотрудников",
    ],
  },
};

const PLAN_MATRIX = [
  { label: "Поиск поставщиков по СНГ", values: [true, true, true, true] },
  { label: "Международный поиск", values: [true, false, true, true] },
  { label: "Адресная книга поставщиков", values: [true, true, true, true] },
  { label: "Отправка RFQ через собственную почту", values: [true, true, true, true] },
  { label: "Синхронизация ответов, диалоги и вложения", values: [true, true, true, true] },
  { label: "История и аналитика", values: [true, true, true, true] },
  { label: "Календарь поставок и заметки", values: [true, true, true, true] },
  { label: "AI-анализ оборудования и поставщиков", values: [true, true, true, true] },
  { label: "Команда и общий лимит", values: [false, false, false, true] },
  { label: "Командная история и фильтр по сотруднику", values: [false, false, false, true] },
  { label: "Внутренний чат с вложениями", values: [false, false, false, true] },
];

export default function About() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  function handleChoosePlan(plan: PricingPlan) {
    setSelectedPlan(plan);
    setPaymentOpen(true);
  }

  function handleOpenInvoiceDirectly() {
    setSelectedPlan(null);
    setInvoiceOpen(true);
  }

  function handleRequestInvoiceFromPayment(plan: PricingPlan | null) {
    setSelectedPlan(plan);
    setPaymentOpen(false);

    setTimeout(() => {
      setInvoiceOpen(true);
    }, 150);
  }

  return (
    <>
      <div className="min-h-screen overflow-hidden bg-background">
        <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-10">

          <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-7">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                На главную
              </Link>
            </Button>


          </div>

          <section className="relative overflow-hidden rounded-[24px] border border-border bg-card px-4 py-5 sm:rounded-[30px] sm:px-6 sm:py-8 md:px-10 md:py-12 lg:px-12">
        
            <div className="pointer-events-none absolute bottom-[-220px] left-[25%] h-96 w-96 rounded-full bg-sky-400/[0.06] blur-[100px]" />

            <div className="relative">
              {/* Верхняя часть hero: логотип, текст и основные действия */}
              <div className="grid gap-4 sm:gap-7 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pl-6">
                <div className="flex items-center justify-center">
  <div className="relative flex h-[250px] w-[250px] shrink-0 items-center justify-center sm:h-[320px] sm:w-[320px] lg:h-[430px] lg:w-[430px]">
    {/* Тёмная заливка внутри внешнего круга радара */}
    <div className="pointer-events-none absolute inset-[24px] rounded-full bg-background sm:inset-[30px] lg:inset-[35px]" />

    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="origin-center scale-[0.56] sm:scale-[0.72] lg:scale-100">
        <RadarLogo isActive={true} size={450} />
      </div>
    </div>
  </div>
</div>

                <div className="min-w-0">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-medium leading-4 text-primary sm:text-xs">
  <BadgeCheck className="h-4 w-4 shrink-0" />

  <span className="sm:hidden">
    SmartOffer.pro · система для закупок
  </span>

  <span className="hidden sm:inline">
    SmartOffer.pro · операционная система для ваших закупок
  </span>
</div>

                  <h1 className="mt-4 max-w-[980px] break-words text-[27px] font-semibold leading-[1.12] text-foreground sm:mt-5 sm:text-[38px] md:text-[44px] lg:text-[50px]">
                    От запроса оборудования до сделки и поставки — в одном рабочем контуре
                  </h1>

                  <p className="mt-4 max-w-[920px] text-[13px] leading-6 text-muted-foreground sm:mt-5 sm:text-base sm:leading-7 md:text-[17px]">
                    SmartOffer.pro находит поставщиков, извлекает контакты, отправляет
                    запросы КП с вашей почты, собирает ответы и файлы, анализирует
                    оборудование и контрагентов, ведёт историю, сделки и календарь
                    поставок.
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleOpenInvoiceDirectly}
                      className="h-11 w-full bg-primary px-4 text-primary-foreground hover:bg-primary/90 sm:w-auto sm:px-6"
                    >
                      Подключить SmartOffer.pro
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={scrollToPricing}
                      className="h-11 w-full px-4 sm:w-auto sm:px-6"
                    >
                      Сравнить тарифы
                    </Button>
                  </div>
                </div>
              </div>

              {/* Демонстрационная страница запроса на всю ширину */}
              <div className="relative mt-4 w-full sm:mt-5">
                <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-background">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                        Запрос КП — демо
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-white">
                        SSD НАКОПИТЕЛЬ A-DATA ULTIMATE SU650 256ГБ, 2.5", SATA III
                      </div>
                    </div>

                    <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] text-sky-300">
                      Страница запроса
                    </div>
                  </div>

                  <div className="grid gap-3 p-3 lg:grid-cols-[0.78fr_1.9fr_0.92fr]">
                    <div className="space-y-3">
  <div className="rounded-2xl border border-white/10 bg-[#0b1725] p-3">
    <div className="flex items-center gap-2 text-xs font-medium text-white">
      
      AI-справка
    </div>

    <div className="text-[10px] text-white/45">
      по оборудованию
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[10px] text-white/40">Запрос</div>
      <div className="mt-1 text-[11px] font-medium leading-5 text-white">
        SSD НАКОПИТЕЛЬ A-DATA ULTIMATE SU650 256ГБ, 2.5", SATA III
      </div>
      <div className="mt-2 text-[10px] text-white/40">
        Сохранённая AI-справка
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[11px] font-medium text-white">
        Кратко
      </div>
      <div className="mt-2 text-[10px] leading-5 text-white/70">
        SSD-накопитель A-DATA Ultimate SU650 объемом 256 ГБ в
        форм-факторе 2.5 дюйма с интерфейсом SATA III. Подходит для
        модернизации ноутбуков и настольных ПК, обеспечивая ускорение
        загрузки системы и приложений. Использует 3D NAND флэш-память и
        контроллер, поддерживающий технологию SLC-кэширования.
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[11px] font-medium text-white">
        Ключевые особенности
      </div>
      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/70">
        <li>• Объем 256 ГБ</li>
        <li>• Форм-фактор 2.5 дюйма, толщина 7 мм</li>
        <li>• Интерфейс SATA III 6 Гбит/с</li>
        <li>• 3D NAND флэш-память</li>
        <li>
          • Технология SLC-кэширования для повышения скорости записи
        </li>
      </ul>
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[11px] font-medium text-white">
        Модификации и отличия
      </div>
      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/70">
        <li>
          • Возможны разные версии контроллера (например, Silicon Motion
          SM2258XT или другие) — уточнить у поставщика
        </li>
        <li>
          • Толщина корпуса может варьироваться (7 мм или 9.5 мм) —
          проверить совместимость с отсеком
        </li>
      </ul>
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[11px] font-medium text-white">
        Аналоги / альтернативы
      </div>
      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/70">
        <li>• Kingston A400 256GB</li>
        <li>• Crucial BX500 256GB</li>
        <li>• Samsung 870 EVO 250GB</li>
        <li>• WD Green 240GB</li>
      </ul>
    </div>
  </div>
</div>

                    <div className="space-y-3">
  {/* Шапка центральной части */}
  <div className="rounded-xl border border-white/10 bg-[#0b1725] p-3">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="text-sm font-semibold text-white">
          Поставщики
        </div>

        <div className="mt-1 text-[10px] text-white/45">
          Найдено: 8
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] text-emerald-300">
          КП: 2
        </div>

        <div className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] text-primary">
          Отправлено: 8
        </div>

        <div className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[9px] text-sky-300">
          Ответов: 5
        </div>
      </div>
    </div>

    <button
      type="button"
      className="mt-3 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-[#0a1320] px-3 py-2 text-left text-[10px] font-medium text-white/80 transition hover:bg-white/[0.04]"
    >
      
      Показать исходный запрос
    </button>
  </div>

  {/* Таблица поставщиков */}
  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1725]">
    {/* Заголовки таблицы */}
<div className="hidden grid-cols-[1.3fr_1fr_0.86fr_1.25fr] gap-3 border-b border-white/10 bg-white/[0.025] px-3 py-3 text-[9px] uppercase tracking-[0.08em] text-white/40 lg:grid">
  <div>Контакты и домен</div>
  <div>ИНН / Индекс риска</div>
  <div>Статус</div>
  <div>Обратная связь</div>
</div>

    {[
      {
        name: 'ООО "Вектор Сторидж"',
        email: "sales@vector-storage.example",
        domain: "vector-storage.example",
        inn: "7701842635",
        innNote: "ИНН сохранён вручную",
        risk: "Индекс риска: 88/100",
        feedback: "Уточнение",
        feedbackTone: "sky",
        quoteText: "КП пока не получено",
        quoteTone: "muted",
        quoteReceived: false,
        hasDialog: true,
        unreadCount: 0,
        rowTone: "emerald",
      },
      {
        name: 'ООО "Норд Дата Системс"',
        email: "rfq@nord-data.example",
        domain: "nord-data.example",
        inn: "",
        innNote: "ИНН не указан",
        risk: "Индекс риска: -/100",
        feedback: "В работе",
        feedbackTone: "amber",
        quoteText: "Ожидаем КП",
        quoteTone: "amber",
        quoteReceived: false,
        hasDialog: false,
        rowTone: "emerald",
      },
      {
  name: 'ООО "Техно Диск Про"',
  email: "info@technodisk-pro.example",
  domain: "technodisk-pro.example",
  inn: "7812463057",
  innNote: "ИНН сохранён вручную",
  risk: "Индекс риска: 95/100",
  feedback: "КП получено",
  feedbackTone: "emerald",
  quoteText: "Файлов: 1",
  quoteTone: "emerald",
  quoteReceived: true,
  hasDialog: true,
  unreadCount: 1,
  rowTone: "emerald",
},
{
  name: 'ООО "Солид Мемори"',
  email: "procurement@solid-memory.example",
  domain: "solid-memory.example",
  inn: "",
  innNote: "ИНН не указан",
  risk: "Индекс риска: —/100",
  feedback: "КП получено",
  feedbackTone: "emerald",
  quoteText: "Файлов: 1",
  quoteTone: "emerald",
  quoteReceived: true,
  hasDialog: true,
  unreadCount: 1,
  rowTone: "emerald",
},
      {
        name: 'ООО "Прайм Компонент"',
        email: "orders@prime-component.example",
        domain: "prime-component.example",
        inn: "",
        innNote: "ИНН не указан",
        risk: "Индекс риска: —/100",
        feedback: "Проверить",
        feedbackTone: "violet",
        quoteText: "КП пока не получено",
        quoteTone: "muted",
        quoteReceived: false,
        hasDialog: true,
        rowTone: "emerald",
      },
      {
        name: 'ООО "Интегра Системс"',
        email: "sale@integra-systems.example",
        domain: "integra-systems.example",
        inn: "",
        innNote: "ИНН не указан",
        risk: "Индекс риска: —/100",
        feedback: "В работе",
        feedbackTone: "amber",
        quoteText: "Ожидаем КП",
        quoteTone: "amber",
        quoteReceived: false,
        hasDialog: false,
        rowTone: "emerald",
      },
      {
        name: 'ООО "Северные Технологии"',
        email: "zakaz@north-tech.example",
        domain: "north-tech.example",
        inn: "",
        innNote: "ИНН не указан",
        risk: "Индекс риска: —/100",
        feedback: "Отказ",
        feedbackTone: "rose",
        quoteText: "КП не получено",
        quoteTone: "rose",
        quoteReceived: false,
        hasDialog: true,
        rowTone: "emerald",
      },
      {
        name: 'ООО "Дата Лайн Комплект"',
        email: "info@dataline-kit.example",
        domain: "dataline-kit.example",
        inn: "",
        innNote: "ИНН не указан",
        risk: "Индекс риска: —/100",
        feedback: "В работе",
        feedbackTone: "amber",
        quoteText: "Ожидаем КП",
        quoteTone: "amber",
        quoteReceived: false,
        hasDialog: false,
        rowTone: "emerald",
      },
    ].map((supplier) => (
      <div
        key={supplier.email}
        className={`grid grid-cols-2 gap-x-3 gap-y-4 border-b border-white/10 px-3 py-4 last:border-b-0 lg:grid-cols-[1.3fr_1fr_0.86fr_1.25fr] lg:gap-3 lg:py-3 ${
          supplier.rowTone === "emerald"
            ? "bg-emerald-400/[0.035]"
            : "bg-white/[0.015]"
        }`}
      >
        {/* Контакты и домен */}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
  {supplier.quoteReceived && (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[8px] font-medium text-emerald-300 transition hover:bg-emerald-400/15"
    >
      <CheckCircle2 className="h-2.5 w-2.5" />
      Открыть КП
    </button>
  )}

  {supplier.hasDialog && (
    <button
      type="button"
      className="relative inline-flex items-center gap-1 rounded border border-sky-400/25 bg-sky-400/10 px-2 py-1 text-[8px] font-medium text-sky-300 transition hover:bg-sky-400/15"
    >
      <MessageSquare className="h-2.5 w-2.5" />
      Диалог

      {supplier.unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[7px] font-semibold leading-none text-white">
          {supplier.unreadCount}
        </span>
      )}
    </button>
  )}
</div>

          <div className="truncate text-[9px] text-white/45">
            {supplier.email}
          </div>

          <div className="mt-1 truncate text-[10px] font-semibold text-white">
            {supplier.domain}
          </div>

          <div className="mt-1 truncate text-[8px] text-white/35">
            {supplier.name}
          </div>
        </div>

        {/* ИНН и риск */}
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <div
              className={`min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 text-[9px] ${
                supplier.inn
                  ? "border-sky-400/20 bg-[#0a1422] text-white"
                  : "border-white/10 bg-[#0a1422] text-white/40"
              }`}
            >
              {supplier.inn || "10 или 12 цифр"}
            </div>

            <div className="shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1.5 text-[8px] text-white/45">
              OK
            </div>
          </div>

          <div
            className={`mt-1 text-[8px] ${
              supplier.inn
                ? "text-emerald-300"
                : "text-white/35"
            }`}
          >
            {supplier.innNote}
          </div>

          <div className="mt-1 inline-flex rounded border border-primary/25 bg-primary/10 px-2 py-1 text-[8px] font-medium text-primary">
            {supplier.risk}
          </div>
        </div>

{/* Статус */}
<div className="min-w-0">
  <div className="mb-2 text-[8px] font-medium uppercase tracking-[0.1em] text-white/35 lg:hidden">
    Статус
  </div>
          <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-300">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            Отправлено
          </div>

          <div
  className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[8px] font-medium ${
    supplier.feedbackTone === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
      : supplier.feedbackTone === "rose"
        ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
        : supplier.feedbackTone === "amber"
          ? "border-primary/25 bg-primary/10 text-primary"
          : supplier.feedbackTone === "violet"
            ? "border-violet-400/25 bg-violet-400/10 text-violet-300"
            : supplier.feedbackTone === "sky"
              ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
              : "border-white/15 bg-white/[0.05] text-white/60"
  }`}
>
            {supplier.feedback}
            <span className="text-[9px] opacity-70">⌄</span>
          </div>
        </div>

        {/* Обратная связь */}
        <div className="min-w-0">
          <div
            className={`text-[8px] font-medium ${
              supplier.quoteTone === "emerald"
  ? "text-emerald-300"
  : supplier.quoteTone === "rose"
    ? "text-rose-300"
    : supplier.quoteTone === "amber"
      ? "text-primary"
      : "text-white/45"
            }`}
          >
            {supplier.quoteText}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[8px] text-white/45">
              <div
                className={`h-3 w-3 rounded-[3px] border ${
                  supplier.quoteReceived
                    ? "border-emerald-400 bg-emerald-400/20"
                    : "border-primary"
                }`}
              />

              КП получено
            </div>

            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[8px] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              ↥ Загрузить
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
                              

                        <div className="space-y-3">
  <div className="rounded-2xl border border-white/10 bg-[#0b1725] p-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-white">
      <ShieldCheck className="h-4 w-4 text-sky-300" />
      Анализ поставщика
    </div>

    <div className="mt-1 text-[11px] text-white/45">
      Демонстрационный анализ по ИНН
    </div>

    <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium text-sky-200">
        <Database className="h-3.5 w-3.5" />
        AI-анализ
      </div>

      <div className="mt-2 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-medium text-amber-200">
        Средний риск
      </div>

      <div className="mt-3 text-[10px] leading-5 text-sky-100/85">
        Поставщик ООО "Вектор Сторидж" (ИНН 7701842635) — действующая
        компания с 2016 года, производитель компьютеров. Email 
        совпадает с доменом сайта. Коммуникация
        активна, но коммерческое предложение не получено.
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a1320] p-3">
      <div className="text-[11px] font-medium text-white">
        AI-справка по ИНН
      </div>

      <div className="mt-3 space-y-3 text-[10px] leading-5 text-white/75">
        <div>
          <div className="text-white/40">Компания</div>
          <div className="mt-1 font-medium text-white">
            ООО "Вектор Сторидж"
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-white/40">ИНН</div>
            <div className="mt-1 font-medium text-white">
              7701842635
            </div>
          </div>

          <div>
            <div className="text-white/40">Статус</div>
            <div className="mt-1 font-medium text-white">
              действующее
            </div>
          </div>
        </div>

        <div>
          <div className="text-white/40">Дата регистрации</div>
          <div className="mt-1 font-medium text-white">
            22.01.2016
          </div>
        </div>

        <div>
          <div className="text-white/40">Юридический адрес</div>
          <div className="mt-1 font-medium text-white">
            422624, Республика Татарстан, Лаишевский р-н,
            с. Столбище, Советская ул., зд. 278, офис 18(1005)
          </div>
        </div>

        <div>
          <div className="text-white/40">Руководитель</div>
          <div className="mt-1 font-medium text-white">
            Петров Евгений Павлович (ранее)
          </div>
        </div>

        <div>
          <div className="text-white/40">Основной вид деятельности</div>
          <div className="mt-1 font-medium text-white">
            Производство компьютеров
          </div>
        </div>

        <div>
          <div className="text-white/40">Финансовые показатели</div>
          <ul className="mt-1 space-y-1 text-white/80">
            <li>• Выручка за 2024 год: 13,8 млрд ₽</li>
            <li>• Чистая прибыль за 2024 год: 793 млн ₽</li>
            <li>• Выручка за 2025 год: 12,0 млрд ₽</li>
            <li>• Чистая прибыль за 2025 год: 346 млн ₽</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
                          <div className="text-[10px] leading-5 text-amber-100/85">
                            Справка сформирована AI по ИНН и может быть
                            неактуальной. После подключения официального
                            источника данных здесь будет платная проверка и
                            индекс риска.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                            </div>

              {/* Термины */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                  Термины
                </div>

                <div className="mt-3 space-y-2 text-[11px] leading-5 text-white/55">
                  <p>
                    <span className="font-semibold text-white">
                      Запрос
                    </span>
                    {" — "}
                    один поиск поставщиков под один RFQ с формированием
                    результатов и возможностью отправки письма.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      RFQ
                    </span>
                    {" "}
                    <span className="text-white/35">
                      (Request for Quotation)
                    </span>
                    {" — "}
                    запрос на предложение, который организация отправляет
                    потенциальным поставщикам, чтобы получить предложения
                    по цене на продукт или услугу.
                  </p>
                </div>
              </div>
            </div>
          </section>

<section className="mt-8 grid gap-4 lg:grid-cols-3">
  {/* Почему пользователь получил письмо */}
  <div className="rounded-[24px] border border-border bg-card p-6">
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-foreground" />

      <h2 className="text-base font-semibold text-foreground">
        Почему вы получили письмо
      </h2>
    </div>

    <p className="mt-4 text-sm leading-7 text-muted-foreground">
      Ваш рабочий email найден в открытом источнике, на официальном
      сайте организации или сохранён пользователем в адресной книге
      SmartOffer.
    </p>

    <p className="mt-3 text-sm leading-7 text-muted-foreground">
      Запрос отправлен конкретным пользователем через его подтверждённую
      корпоративную почту. SmartOffer помогает подготовить RFQ, найти
      подходящих поставщиков и сохранить историю коммуникации.
    </p>

    <div className="mt-6">
      <h3 className="text-sm font-semibold text-foreground">
        Для кого создан SmartOffer
      </h3>

      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {[
          "Закупочные отделы и службы снабжения",
          "Инженерные и производственные компании",
          "Дистрибьюторы промышленного оборудования",
          "B2B-продажи и тендерные отделы",
          "Руководители закупочных команд",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="my-6 h-px bg-border" />

    <div>
      <h3 className="text-sm font-semibold text-foreground">
        Один рабочий контур
      </h3>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Поиск поставщиков, отправка RFQ, ответы, файлы КП, статусы,
        диалоги, анализ контрагентов и календарь поставок находятся
        внутри одного сервиса.
      </p>
    </div>
  </div>

  {/* Эффект для бизнеса */}
  <div className="rounded-[24px] border border-border bg-card p-6">
    <div className="flex items-center gap-2">
      <Activity className="h-4 w-4 text-foreground" />

      <h2 className="text-base font-semibold text-foreground">
        Эффект от использования SmartOffer.pro
      </h2>
    </div>

    <p className="mt-4 text-sm leading-7 text-muted-foreground">
      SmartOffer сокращает ручные операции между получением заявки,
      поиском поставщиков, отправкой запросов и обработкой ответов.
    </p>

    <div className="mt-6">
      <h3 className="text-sm font-semibold text-foreground">
        Что получает бизнес
      </h3>

      <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {[
          "Больше обработанных запросов без расширения штата",
          "Единая история отправок, ответов, КП и сделок",
          "Меньше потерянных писем и забытых поставщиков",
          "Быстрый повторный поиск через адресную книгу",
          "Контроль сроков сделки и ожидаемой поставки",
          "Общая картина по работе закупочной команды",
        ].map((item) => (
          <li key={item} className="flex gap-3">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="my-6 h-px bg-border" />

    <div>
      <h3 className="text-sm font-semibold text-foreground">
        AI-поддержка закупки
      </h3>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        AI-справка структурирует характеристики оборудования, предлагает
        аналоги, формирует вопросы поставщику и подсвечивает риски
        ошибочного подбора.
      </p>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Анализ поставщика объединяет email, домен, историю коммуникации,
        ИНН, сведения о компании и предварительную оценку рисков.
      </p>
    </div>
  </div>

  {/* Безопасность */}
  <div className="rounded-[24px] border border-border bg-card p-6">
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-foreground" />

      <h2 className="text-base font-semibold text-foreground">
        Безопасность и контроль
      </h2>
    </div>

    <p className="mt-4 text-sm leading-7 text-muted-foreground">
      Письма отправляются через подтверждённый SMTP пользователя, а
      ответы синхронизируются через его IMAP-подключение.
    </p>

    <p className="mt-3 text-sm leading-7 text-muted-foreground">
      SmartOffer не продаёт базы email и не публикует контакты
      пользователей. Почтовые пароли хранятся в зашифрованном виде,
      а файлы коммерческих предложений — в приватном хранилище.
    </p>

    <div className="mt-6">
      <h3 className="text-sm font-semibold text-foreground">
        Чем SmartOffer отличается от обычного поиска
      </h3>

      <div className="mt-3 space-y-4 text-sm leading-6">
        <div>
          <div className="font-medium text-foreground">
            Поисковая система
          </div>

          <div className="mt-1 text-muted-foreground">
            Находит страницы и сайты, но не ведёт дальнейшую работу
            с найденными компаниями.
          </div>
        </div>

        <div>
          <div className="font-medium text-foreground">
            SmartOffer.pro
          </div>

          <div className="mt-1 text-muted-foreground">
            Находит и квалифицирует поставщиков, извлекает контакты,
            удаляет дубли, отправляет RFQ, собирает ответы и КП,
            анализирует результаты и сохраняет историю.
          </div>
        </div>
      </div>
    </div>

    <div className="my-6 h-px bg-border" />

    <div>
      <h3 className="text-sm font-semibold text-foreground">
        Почему это удобно поставщику
      </h3>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Поставщик получает структурированный запрос с понятным
        оборудованием, характеристиками и конкретной потребностью.
        Ответ можно отправить обычным письмом, а коммерческое
        предложение будет связано с исходным RFQ.
      </p>
    </div>
  </div>
</section>

          <section className="mt-16">
  <div className="mb-8">
    <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
      Возможности платформы
    </div>

    <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
      Функции SmartOffer.pro
    </h2>

    <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
      Инструменты для поиска поставщиков, отправки запросов, обработки
      ответов, анализа контрагентов и управления закупочной работой.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { icon: Search, title: "Поиск СНГ/Международный", text: "SmartOffer помогает быстро находить подходящих поставщиков под конкретную потребность." },
                { icon: Mail, title: "RFQ с вашей почты", text: "Письма отправляются через подтверждённый SMTP пользователя. Сохраняются тема, текст, получатели и фактические статусы отправки." },
                { icon: Inbox, title: "Ответы и коммерческие предложения", text: "IMAP-синхронизация собирает входящие и исходящие письма в диалог. Ответы классифицируются, файлы КП хранятся приватно." },
                { icon: Brain, title: "AI-помощник инженера и закупщика", text: "Краткое описание оборудования, модификации, аналоги, чек-лист RFQ, вопросы поставщику и риски ошибочного подбора." },
                { icon: ShieldAlert, title: "Анализ поставщика", text: "Оценка качества контакта, домена, истории коммуникации и рисков. При указанном ИНН — предварительная справка и финансовые показатели." },
                { icon: BookOpen, title: "Адресная книга", text: "Собственная база проверенных контактов с заметками и привязкой доменов. Контакты можно быстро добавлять в новый запрос." },
                { icon: BarChart3, title: "История и аналитика", text: "Запросы, отправки, ошибки, ответы, КП, сделки и конверсия. Фильтры по периоду, результату и сотруднику." },
                { icon: CalendarDays, title: "Календарь поставок", text: "Дата поставки, отметка исполнения, просроченные события и заметки — рядом с исходным запросом и перепиской." },
                { icon: MessageSquare, title: "Команда и внутренний чат", text: "На тарифе Бизнес руководитель объединяет менеджеров, общий лимит, командную историю, календарь и рабочие диалоги с файлами." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="group rounded-[24px] border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 grid items-start gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="lg:sticky lg:top-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Управление по данным</div>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">Аналитика показывает не активность, а движение к коммерческому результату</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Уже сейчас SmartOffer хранит ключевые события RFQ. На их основе интерфейс может показывать воронку закупки, конверсию в КП и сделку, нагрузку сотрудников, качество поставщиков и сроки поставок.
              </p>
              <div className="mt-6 space-y-3">
                {["Сколько запросов реально доведено до отправки", "Какой процент поставщиков отвечает и присылает КП", "Какие менеджеры и категории дают лучший результат", "Где закупка остановилась и требует действия"].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <AnalyticsShowcase />
          </section>

          <section className="mt-16 grid items-start gap-8 lg:grid-cols-[1.25fr_0.75fr]">
            <AiShowcase />
            <div className="lg:sticky lg:top-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">AI без отрыва от процесса</div>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">Анализ появляется рядом с исходным запросом и конкретным поставщиком</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                AI не заменяет инженера или службу безопасности. Он структурирует данные, подсвечивает недостающие параметры и формирует список вопросов, которые следует проверить до заказа.
              </p>
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.055] p-4 text-sm leading-relaxed text-muted-foreground">
                Юридически значимые сведения, реквизиты, технические характеристики и совместимость оборудования всегда требуют проверки по официальным документам.
              </div>
            </div>
          </section>

          <section className="mt-16 grid items-start gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="lg:sticky lg:top-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Для отдела снабжения</div>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">Руководитель получает картину по всей команде, не вмешиваясь в каждую переписку</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Тариф Бизнес объединяет личную работу менеджеров в организацию: общий лимит, роли, история команды, фильтр по сотруднику, календарь поставок и внутренний чат.
              </p>
            </div>
            <TeamShowcase />
          </section>

<section className="mt-10 grid items-start gap-8 lg:grid-cols-[1.28fr_0.72fr]">
  {/* Чат слева */}
  <TeamChatShowcase />

  {/* Описание справа */}
  <div className="lg:sticky lg:top-8">
    <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
      Внутренняя коммуникация
    </div>

    <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
      Обсуждение закупок остаётся внутри рабочего контура
    </h2>

    <p className="mt-4 text-sm leading-7 text-muted-foreground">
      Сотрудники могут обсуждать запросы, передавать коммерческие
      предложения, изображения и другие документы без перехода
      в сторонние мессенджеры.
    </p>

    <div className="mt-6 space-y-4">
      {[
        {
          title: "Личные рабочие диалоги",
          text: "Каждый сотрудник общается с коллегами в отдельных диалогах, не смешивая разные задачи и закупки.",
        },
        {
          title: "Документы и изображения",
          text: "В чат можно отправлять коммерческие предложения, договоры, технические файлы и скриншоты анализа.",
        },
        {
          title: "Быстрый поиск сообщений",
          text: "Поиск по диалогу помогает быстро вернуться к согласованным условиям, срокам и решениям.",
        },
        {
          title: "Единая рабочая среда",
          text: "История запросов, поставщики, календарь поставок и обсуждение команды находятся в одном сервисе.",
        },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {item.title}
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
      <div className="text-sm font-semibold text-foreground">
        Доступно на тарифе «Бизнес»
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Внутренний чат работает для сотрудников одной команды вместе
        с общей историей, лимитом запросов и календарём поставок.
      </p>
    </div>
  </div>
</section>
          <section className="mt-16 rounded-[28px] border border-border bg-card p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Потенциал платформы</div>
                <h2 className="mt-3 text-3xl font-semibold text-foreground">Из инструмента поиска — в систему управления промышленными закупками</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  SmartOffer.pro накапливает структурированные данные о потребностях рынка, поставщиках и результатах сделок. Это создаёт основу для развития полноценной цифровой экосистемы промышленной торговли.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: LineChart, title: "Сравнение КП и динамика цен", text: "Сопоставление стоимости, сроков и условий поставки для выбора наиболее выгодного предложения в автоматическом режиме." },
                  { icon: ShieldCheck, title: "Карточка надёжности поставщика", text: "Интеграция с базой данных официальных источников." },
                  { icon: Network, title: "Корпоративная база поставщиков", text: "Централизованная база проверенных контактов, специализаций и истории взаимодействия, которая пополняется в процессе работы с сервисом." },
                  { icon: Database, title: "Аналитика спроса", text: "Повторяющиеся позиции, категории, сезонность и консолидация потребности." },
                  { icon: Workflow, title: "Автоматизированная система торговли", text: "Развитие SmartOffer в сторону торговой платформы: запросы, поставщики, коммерческие предложения, сделки и повторные продажи в едином цифровом контуре." },
                  { icon: PlugZap, title: "Интеграции с 1С, ERP и API", text: "Передача заявок, поставщиков, статусов и результатов в корпоративные системы." },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl border border-border bg-background/25 p-5">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
                    <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Эти направления показывают потенциал развития и не заявляются как уже доступные функции текущей версии.
            </div>
          </section>

          <section id="pricing" className="mt-16 scroll-mt-20">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Тарифы</div>
              <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">Выберите объём работы и необходимый контур</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Один запрос — один поиск поставщиков под конкретный RFQ. Платные тарифы действуют 30 календарных дней с момента активации.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PRICING.map((plan) => {
                const details = PLAN_DETAILS[plan.code];
                const accent = Boolean(details?.accent);

                return (
                  <div
                    key={plan.code}
                    className={`relative flex min-h-[440px] flex-col rounded-[24px] border p-6 ${
                      accent
                        ? "border-primary/50 bg-primary/[0.055] shadow-[0_20px_70px_rgba(255,191,0,0.08)]"
                        : "border-border bg-card"
                    }`}
                  >
                    {accent ? (
                      <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground">
                        Оптимальный
                      </div>
                    ) : null}

                    <div className="text-sm text-muted-foreground">{plan.name}</div>
                    <div className="mt-3 text-3xl font-semibold text-foreground">{plan.price}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{plan.isFree ? "однократно" : "на 30 дней"}</div>
                    <div className="mt-4 rounded-xl border border-border bg-background/25 px-3 py-2 text-sm font-medium text-foreground">{plan.limit}</div>
                    <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{plan.note}</div>

                    <div className="mt-6 space-y-3">
                      {(details?.features || []).map((feature) => (
                        <div key={feature} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-7">
                      <Button
                        type="button"
                        onClick={() => handleChoosePlan(plan)}
                        className={`w-full ${accent ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                        variant={accent ? "default" : "outline"}
                      >
                        {plan.isFree ? "Условия подключения" : "Выбрать тариф"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-background/25">
                      <th className="px-5 py-4 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Функция</th>
                      {PRICING.map((plan) => (
                        <th key={plan.code} className="px-4 py-4 text-center text-sm font-semibold text-foreground">{plan.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_MATRIX.map((row) => (
                      <tr key={row.label} className="border-b border-border/70 last:border-b-0">
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.label}</td>
                        {row.values.map((enabled, index) => (
                          <td key={`${row.label}-${index}`} className="px-4 py-3.5 text-center">
                            <AvailabilityMark enabled={enabled} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Пробный тариф:</span> доступен после подтверждения корпоративной почты. Это ограничивает злоупотребления и повышает качество деловой коммуникации.
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Тариф Бизнес:</span> лимит принадлежит руководителю и расходуется сотрудниками команды совместно.
              </div>
            </div>
          </section>
          
          <section className="mt-16 overflow-hidden rounded-[30px] border border-primary/25 bg-[linear-gradient(135deg,rgba(255,191,0,0.10),rgba(255,255,255,0.025)_52%,rgba(56,189,248,0.05))] p-7 md:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Следующий шаг</div>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-foreground md:text-4xl">Соберите поиск, подбор аналога, переписку, аналитику и поставки в одном сервисе</h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Начните с пробного тарифа на корпоративной почте или подключите платный план через карту, СБП либо счёт для юридического лица.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button type="button" onClick={handleOpenInvoiceDirectly} className="h-11 bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                  Запросить счёт
                </Button>
                <Button asChild variant="outline" className="h-11 px-6">
                  <Link to="/">Открыть SmartOffer</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-10 pb-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Это спам-рассылка?", "Нет. Письмо — запрос КП от пользователя сервиса SmartOffer.pro, который ищет поставщика под свою задачу. Сервис помогает компаниям быстро находить поставщиков по запросу оборудования, извлекать контакты и отправлять RFQ-письма."],
                ["SmartOffer отправляет письма от своего имени?", "Нет. Отправка выполняется через подтверждённую почту пользователя, поэтому поставщик видит реального отправителя."],
                ["AI принимает решение за пользователя?", "Нет. AI структурирует сведения и подсвечивает риски; инженерные, коммерческие и юридические решения принимает пользователь."],
              ].map(([question, answer]) => (
                <div key={question} className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-sm font-semibold text-foreground">{question}</div>
                  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{answer}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <PlanPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedPlan={selectedPlan}
        onRequestInvoice={handleRequestInvoiceFromPayment}
      />

      <InvoiceRequestModal
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        selectedPlan={selectedPlan}
      />
    </>
  );
}
