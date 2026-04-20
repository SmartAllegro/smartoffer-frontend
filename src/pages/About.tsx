import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Mail,
  Shield,
  Zap,
  ArrowLeft,
  ChevronLeft,
  Loader2,
  Send,
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
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-6">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                На главную
              </Link>
            </Button>
          </div>

          <section className="border border-border rounded-2xl bg-card p-7">
            <div className="flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheck className="w-4 h-4" />
                SmartOffer.pro — автоматизация RFQ
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                  SmartOffer ускоряет поиск поставщиков и отправку запросов КП
                </h1>

                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  Сервис помогает компаниям быстро находить поставщиков по запросу
                  оборудования, извлекать контакты и отправлять RFQ-письма. Тарификация
                  не “за пользователя”, а за объём ценности: готовые контакты поставщиков
                  под конкретный RFQ.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleOpenInvoiceDirectly}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                >
                  Запросить счет
                </Button>
                <Button variant="outline" onClick={scrollToPricing}>
                  Посмотреть тарифы
                </Button>
              </div>

              <div className="text-xs text-muted-foreground max-w-2xl">
                “Запрос” — один поиск поставщиков под один RFQ с формированием результатов и
                возможностью отправки письма.
              </div>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-2xl bg-card p-6 flex flex-col">
              <div>
                <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                  <Mail className="w-4 h-4" />
                  Почему вы получили письмо
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Ваш email найден в открытых источниках (сайт/каталоги/страницы “Контакты”).
                  Письмо отправлено пользователем сервиса SmartOffer.pro — он в данный момент
                  ищет поставщика для поставки оборудования, а SmartOffer лишь ускоряет
                  поиск и подготовку запроса RFQ.
                </p>

                <div className="mt-4">
                  <div className="text-foreground font-medium mb-2">
                    Для кого создан SmartOffer
                  </div>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Закупочные отделы</li>
                    <li>Инженерные компании</li>
                    <li>Дистрибьюторы оборудования</li>
                    <li>B2B-продажи</li>
                    <li>Производственные предприятия</li>
                  </ul>
                </div>

                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-foreground font-medium mb-2">
                    Пример в цифрах
                  </div>

                  <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                    <p>Менеджер тратит 20–30 минут на поиск 1 позиции оборудования вручную.</p>
                    <p>Через SmartOffer — 1 минуту.</p>
                    <p>
                      При большом объёме закупочного оборудования — экономия до 40 часов в месяц.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-2xl bg-card p-6">
              <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                <Zap className="w-4 h-4" />
                Эффект от использования SmartOffer.pro
              </div>

              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  SmartOffer сокращает до 30% рабочего времени, которое сотрудники тратят
                  на поиск оборудования и контактов поставщиков.
                </p>

                <div>
                  <p className="text-foreground font-medium mb-2">Что это даёт бизнесу:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Больше обработанных запросов за тот же день</li>
                    <li>Рост количества отправленных RFQ</li>
                    <li>Увеличение числа сделок без расширения штата</li>
                    <li>Снижение операционной нагрузки на менеджеров</li>
                    <li>Освобождение времени для переговоров и закрытия контрактов</li>
                  </ul>
                </div>

                <p>
                  SmartOffer автоматизирует рутинный этап поиска и подготовки запроса —
                  команда концентрируется на коммерческой работе, а не на ручном сборе контактов.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-2xl bg-card p-6 flex flex-col">
              <div>
                <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                  <Shield className="w-4 h-4" />
                  Безопасность и контроль
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Письма отправляются от имени пользователя через его корпоративную почту (SMTP).
                  SmartOffer не продаёт базы и не публикует контакты —
                  фиксируется история и статусы отправки для прозрачности.
                </p>

                <div className="mt-4">
                  <div className="text-foreground font-medium mb-2">
                    Чем SmartOffer отличается от обычного поиска
                  </div>

                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>
                      <span className="text-foreground">Google</span> ищет сайты. <br />
                      <span className="text-foreground">SmartOffer</span> ищет контакты и готовит RFQ.
                    </div>

                    <div>
                      <span className="text-foreground">Google</span> не хранит историю запросов. <br />
                      <span className="text-foreground">SmartOffer</span> фиксирует статусы и результат.
                    </div>

                    <div>
                      <span className="text-foreground">Google</span> не отправляет письма. <br />
                      <span className="text-foreground">SmartOffer</span> отправляет в 1 клик.
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-foreground font-medium mb-2">
                    Почему это выгодно поставщику
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Поставщик получает структурированный запрос
                    с понятной спецификацией и конкретной потребностью.
                    Это не холодная рассылка — это входящий RFQ.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Как работает SmartOffer
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  step: "Шаг 1",
                  title: "Поиск поставщиков",
                  text: "Введите запрос оборудования — получите список релевантных компаний.",
                },
                {
                  step: "Шаг 2",
                  title: "Контакты",
                  text: "SmartOffer извлекает email и готовит список для рассылки.",
                },
                {
                  step: "Шаг 3",
                  title: "Отправка RFQ",
                  text: "Вы выбираете поставщиков и отправляете письмо в 1 клик.",
                },
                {
                  step: "Шаг 4",
                  title: "История",
                  text: "Результаты, статусы отправки и текст письма сохраняются.",
                },
              ].map((c) => (
                <div
                  key={c.step}
                  className="border border-border rounded-2xl bg-card p-6"
                >
                  <div className="text-xs text-muted-foreground mb-2">{c.step}</div>
                  <div className="font-medium text-foreground mb-2">{c.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="pricing" className="mt-12 scroll-mt-24">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">Тарифы и лимиты</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Оплата за объём реальной ценности — готовые контакты поставщиков под ваши RFQ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {PRICING.map((p) => (
                <div
                  key={p.name}
                  className="border border-border rounded-2xl bg-card p-6 flex flex-col min-h-[230px]"
                >
                  <div>
                    <div className="text-sm text-muted-foreground">{p.name}</div>
                    <div className="text-2xl font-semibold text-foreground mt-2">
                      {p.price}
                    </div>
                    <div className="mt-2 text-sm text-foreground">{p.limit}</div>
                    <div className="mt-3 text-xs text-muted-foreground">{p.note}</div>
                  </div>

                  <div className="mt-auto pt-5">
                    <Button
                      type="button"
                      onClick={() => handleChoosePlan(p)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Выбрать
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-muted-foreground max-w-2xl">
              Free доступен для корпоративной почты — это снижает злоупотребления и повышает качество коммуникаций.
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">FAQ</h2>

            <div className="space-y-3">
              <div className="border border-border rounded-2xl bg-card p-6">
                <div className="font-medium text-foreground">Это спам-рассылка?</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Нет. Письмо — запрос КП от пользователя сервиса SmartOffer.pro, который ищет поставщика.
                  SmartOffer лишь ускоряет поиск контакта и оформление RFQ.
                </p>
              </div>

              <div className="border border-border rounded-2xl bg-card p-6">
                <div className="font-medium text-foreground">Откуда взяли мой email?</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Из открытых источников: сайт компании, каталоги, страницы “Контакты”.
                </p>
              </div>

              <div className="border border-border rounded-2xl bg-card p-6">
                <div className="font-medium text-foreground">SmartOffer хранит базы поставщиков?</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Нет. Сервис фиксирует историю запросов пользователя и результаты поиска для его работы.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 border border-border rounded-2xl bg-card p-7">
            <h2 className="text-xl font-semibold text-foreground">
              Хотите ускорить запросы КП в вашей компании?
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
              Подключайтесь к SmartOffer и сокращайте время на поиск поставщиков и подготовку RFQ.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={handleOpenInvoiceDirectly}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              >
                Запросить счет
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/">Вернуться на главную</Link>
              </Button>
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