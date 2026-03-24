import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

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
import { clearAuthToken, getAuthToken } from "@/shared/utils/auth";

type SupportStep = "chooser" | "email";

const TELEGRAM_URL =
  import.meta.env.VITE_SUPPORT_TELEGRAM_URL ||
  "https://t.me/smartoffer_support?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21%20%D0%A3%20%D0%BC%D0%B5%D0%BD%D1%8F%20%D0%B2%D0%BE%D0%BF%D1%80%D0%BE%D1%81%20%D0%BF%D0%BE%20SmartOffer.";

function TelegramIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <circle cx="120" cy="120" r="120" fill="url(#telegramGradient)" />
      <path
        d="M54.6 118.7c34.7-15.1 57.9-25.1 69.4-30 33-13.7 39.9-16.1 44.4-16.2 1 0 3.2.2 4.7 1.4 1.2 1 1.6 2.4 1.8 3.4.2 1 .4 3.3.2 5.1-2 21.3-10.8 73.1-15.3 97-1.9 10.1-5.6 13.5-9.2 13.8-7.8.7-13.7-5.2-21.3-10.2-12-8-18.8-13-30.5-20.8-13.5-8.9-4.7-13.8 2.9-21.9 2-2.1 35.9-32.9 36.6-35.8.1-.4.2-1.8-.6-2.5s-2-.5-2.8-.3c-1.2.3-19.6 12.4-55.1 36.2-5.2 3.6-9.9 5.3-14 5.2-4.6-.1-13.4-2.6-19.9-4.7-8-2.6-14.4-4-13.8-8.4.3-2.3 3.4-4.7 9.5-7.1Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="telegramGradient"
          x1="120"
          y1="0"
          x2="120"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#37BBFE" />
          <stop offset="1" stopColor="#1E96F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SupportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [step, setStep] = useState<SupportStep>("chooser");
  const [me, setMe] = useState<UserMe | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
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

  const canSubmit = useMemo(() => {
    return !!me?.email && subject.trim().length >= 3 && message.trim().length >= 10;
  }, [me?.email, subject, message]);

  function resetState() {
    setStep("chooser");
    setSubject("");
    setMessage("");
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

    try {
      setLoading(true);
      setErrorText("");
      setSuccessText("");

      const res = await sendSupportRequest({
  contact_email: me.email,
  subject: subject.trim(),
  message: message.trim(),
  source: "footer_modal",
  page_url: window.location.href,
});

setSuccessText(
  `Сообщение отправлено. № обращения: ${res.ticket_number}. Мы ответим в течение рабочего дня.`
);
setSubject("");
setMessage("");
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Не удалось отправить обращение"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="
          max-w-[620px]
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
              Поддержка
            </DialogTitle>
          </DialogHeader>

          {step === "chooser" ? (
            <div className="mt-4">
              <p className="text-[15px] text-white/60">
                Как вам будет удобно связаться с нами?
              </p>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      group rounded-xl border border-[#2b6ee7]
                      bg-[radial-gradient(circle_at_top,rgba(52,122,255,0.22),rgba(28,40,69,0.78))]
                      px-6 py-7 text-center transition
                      hover:scale-[1.01] hover:border-[#4f8fff]
                    "
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-[0_0_24px_rgba(61,147,255,0.35)]">
                      <TelegramIcon className="h-16 w-16" />
                    </div>

                    <div className="mt-5 text-[21px] font-semibold text-white">
                      Telegram
                    </div>

                    <div className="mt-2 text-[15px] text-white/75">
                      Чат поддержки в Telegram
                    </div>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorText("");
                      setSuccessText("");
                      setStep("email");
                    }}
                    className="
                      rounded-xl border border-[#d2a11c]
                      bg-[radial-gradient(circle_at_top,rgba(255,191,0,0.14),rgba(44,37,19,0.82))]
                      px-6 py-7 text-center transition
                      hover:scale-[1.01] hover:border-[#f1be2d]
                    "
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffd347,#d59a00)] shadow-[0_0_24px_rgba(255,191,0,0.28)]">
                      <Mail className="h-8 w-8 text-[#533800]" />
                    </div>

                    <div className="mt-5 text-[21px] font-semibold text-white">
                      Через Email
                    </div>

                    <div className="mt-2 text-[15px] text-white/75">
                      Оставить заявку на почту
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-7 text-center text-[15px] text-white/60">
                Ответим в течение рабочего дня.
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setErrorText("");
                  setSuccessText("");
                  setStep("chooser");
                }}
                className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>

              <p className="text-[15px] text-white/60">
                Опишите вопрос, и сообщение будет отправлено в поддержку.
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
                    Для отправки обращения нужно войти в аккаунт.
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm text-white/80">Тема</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Кратко укажите тему обращения"
                    className="h-11 border-white/10 bg-white/5 text-white placeholder:text-white/35"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Сообщение
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Опишите проблему или вопрос"
                    className="min-h-[140px] border-white/10 bg-white/5 text-white placeholder:text-white/35"
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
                    className="h-11 min-w-[180px] bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Отправить
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-sm text-white/55">
                  Ответим в течение рабочего дня.
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Footer() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border bg-background/50 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Инструмент
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Автоматизация поиска поставщиков и отправки запросов коммерческих
                предложений.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Быстрые ссылки
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => setSupportOpen(true)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Поддержка
                  </button>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-muted-foreground hover:text-primary"
                  >
                    Цены
                  </a>
                </li>
                <li>
                  <Link
                    to="/email-verification"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Верификация почты
                  </Link>
                </li>
              </ul>

              <div className="mt-4">
                <Button
                  asChild
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-auto"
                >
                  <Link to="/about">О проекте</Link>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Полезное
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/terms"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Условия использования
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Политика конфиденциальности
                  </Link>
                </li>
                <li>
                  <Link
                    to="/offer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Публичная оферта
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Справка и документы
                  </Link>
                </li>
                <li>
                  <Link
                    to="/data-retention"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Политика хранения данных
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Контакты
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  info@smartoffer.pro
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  +7 (999) 2131 015
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  195027, г. Санкт-Петербург,
                  <br />
                  ул. Магнитогорская, д. 51, лит. Е
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
            © {new Date().getFullYear()} SmartOffer. Все права защищены.
          </div>
        </div>
      </footer>

      <SupportModal open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}