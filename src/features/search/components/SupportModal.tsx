import * as React from "react";
import {
  Send,
  Mail,
  MessageCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { sendSupportRequest } from "@/api/support";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";

const TELEGRAM_URL =
  import.meta.env.VITE_SUPPORT_TELEGRAM_URL || "https://t.me/REPLACE_ME";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meEmail?: string;
  searchJobId?: number | null;
};

export function SupportModal({
  open,
  onOpenChange,
  meEmail = "",
  searchJobId = null,
}: Props) {
  const { toast } = useToast();

  const [step, setStep] = React.useState<"chooser" | "email">("chooser");
  const [contactEmail, setContactEmail] = React.useState(meEmail || "");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("chooser");
      setSubject("");
      setMessage("");
      setSending(false);
      return;
    }

    setContactEmail(meEmail || "");
  }, [open, meEmail]);

  const canSubmit =
    contactEmail.trim().length > 3 &&
    subject.trim().length >= 3 &&
    message.trim().length >= 10 &&
    !sending;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setSending(true);

      const res = await sendSupportRequest({
        contact_email: contactEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        search_job_id: searchJobId ?? null,
        page_url: window.location.href,
        source: "footer_modal",
      });

      toast({
        title: "Обращение отправлено",
        description: res.message,
      });

      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Не удалось отправить обращение",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl">Поддержка</DialogTitle>
        </DialogHeader>

        {step === "chooser" ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Выберите удобный способ связи. Для быстрого вопроса используйте Telegram,
              для формального обращения — форму на сайте.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border bg-background/40 p-5 transition hover:border-primary hover:bg-background/70"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-lg font-semibold text-foreground">Telegram</div>
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed">
                  Быстрый контакт для оперативных вопросов.
                </div>
              </a>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-left rounded-2xl border border-border bg-background/40 p-5 transition hover:border-primary hover:bg-background/70"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    Написать на почту
                  </div>
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed">
                  Отправить обращение через SmartOffer на support@smartoffer.pro.
                </div>
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              Ответим в течение рабочего дня.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Обращение будет отправлено на support@smartoffer.pro
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Email для ответа</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Тема</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Кратко опишите проблему"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Сообщение</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Опишите проблему, ожидаемое поведение и что произошло фактически"
                className="min-h-[160px]"
              />
            </div>

            {searchJobId ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                ID поиска будет приложен автоматически: #{searchJobId}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                ID поиска не приложен
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("chooser")}
                disabled={sending}
                className="sm:w-auto"
              >
                Назад
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="sm:w-auto"
              >
                {sending ? (
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}