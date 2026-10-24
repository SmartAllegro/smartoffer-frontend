import { AlertCircle, CheckCircle2, ChevronDown, Inbox, Mail, XCircle } from "lucide-react";
import { useState } from "react";

import type { AdminUserDetailResponse } from "@/api/admin";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/utils/utils";

import { formatDateTime, formatNumber } from "../adminUtils";

type AdminMailPanelProps = {
  user: AdminUserDetailResponse;
};

export function AdminMailPanel({ user }: AdminMailPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <SmtpCard user={user} />
      <ImapCard user={user} />
    </div>
  );
}

function SmtpCard({ user }: AdminMailPanelProps) {
  const smtp = user.smtp;

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-white">
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            SMTP
          </span>
          <StateBadge active={smtp.configured} verified={smtp.is_verified} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!smtp.configured ? (
          <div className="rounded-md border border-white/10 bg-background/45 p-4 text-white/45">SMTP не настроен</div>
        ) : (
          <>
            <Field label="Настроен" value="Да" />
            <Field label="Провайдер" value={smtp.provider || "—"} />
            <Field label="From email" value={smtp.from_email || "—"} />
            <Field label="Проверен" value={smtp.is_verified ? "Да" : "Нет"} />
            <Field label="Дата проверки" value={formatDateTime(smtp.verified_at)} />
            <Separator className="bg-white/10" />
            <Field label="Host" value={smtp.smtp_host || "—"} />
            <Field label="Port / Security" value={`${smtp.smtp_port || "—"} / ${smtp.smtp_security || "—"}`} />
            <Field label="Username" value={smtp.smtp_username || "—"} />
            {smtp.last_verified_error ? <Warning text={smtp.last_verified_error} /> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ImapCard({ user }: AdminMailPanelProps) {
  const [open, setOpen] = useState(false);
  const imap = user.imap;

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-white">
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            IMAP
          </span>
          <StateBadge active={imap.configured && imap.enabled} verified={imap.verified} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!imap.configured ? (
          <div className="rounded-md border border-white/10 bg-background/45 p-4 text-white/45">IMAP не настроен</div>
        ) : (
          <>
            <Field label="Настроен" value="Да" />
            <Field label="Включён" value={imap.enabled ? "Да" : "Нет"} />
            <Field label="Проверен" value={imap.verified ? "Да" : "Нет"} />
            <Field label="Провайдер" value={imap.provider || "—"} />
            <Field label="Inbox" value={imap.inbox_folder || "—"} />
            <Field label="Sent" value={imap.sent_folder || "—"} />
            <Field label="Sync inbox / sent" value={`${imap.sync_inbox_enabled ? "Да" : "Нет"} / ${imap.sync_sent_enabled ? "Да" : "Нет"}`} />
            <Field label="Последняя синхронизация" value={formatDateTime(imap.last_sync_at)} />
            {imap.last_sync_error || imap.last_verified_error ? <Warning text={imap.last_sync_error || imap.last_verified_error || ""} /> : null}

            {imap.sync_states.length > 0 ? (
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between border-white/10 bg-background/45 text-white hover:bg-white/10 hover:text-white"
                  >
                    Состояние синхронизации
                    <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {imap.sync_states.map((state) => (
                    <div key={state.folder} className="rounded-md border border-white/10 bg-background/45 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white">{state.folder}</div>
                        <Badge className="border border-white/10 bg-white/5 text-white/70">
                          {formatNumber(state.consecutive_errors)} ошибок
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-white/55">
                        <div>Успешно: {formatDateTime(state.last_success_at)}</div>
                        <div>Следующая: {formatDateTime(state.next_sync_at)}</div>
                        {state.last_error ? <div className="text-red-300">Ошибка: {state.last_error}</div> : null}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-white/45">{label}</div>
      <div className="max-w-[58%] break-words text-right font-semibold text-white">{value}</div>
    </div>
  );
}

function StateBadge({ active, verified }: { active: boolean; verified: boolean }) {
  if (verified) {
    return (
      <Badge className="border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Проверен
      </Badge>
    );
  }
  if (active) {
    return (
      <Badge className="border border-blue-400/20 bg-blue-500/10 text-blue-300">
        <Mail className="mr-1 h-3 w-3" />
        Подключён
      </Badge>
    );
  }
  return (
    <Badge className="border border-white/10 bg-white/5 text-white/55">
      <XCircle className="mr-1 h-3 w-3" />
      Нет
    </Badge>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
      <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
      {text}
    </div>
  );
}
