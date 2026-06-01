import { useMemo, useState } from "react";
import type { Supplier, SupplierReplyStatus } from "@/shared/types/rfq";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  CheckSquare2,
  Square,
  Upload,
  Clock3,
  HelpCircle,
  Ban,
  MessageSquareText,
  FileCheck2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/shared/utils/utils";

import {
  downloadQuoteFile,
  getResultReplies,
  type ReplyAttachmentItem,
  type SupplierReplyItem,
} from "@/api/history";

interface SupplierTableProps {
  suppliers: Supplier[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (email: string) => void;
  disabled?: boolean;
  readOnly?: boolean;

  onToggleQuote?: (
    supplierId: string,
    backendResultId: number,
    next: boolean
  ) => void | Promise<void>;

  onSetReplyStatus?: (
    supplierId: string,
    backendResultId: number,
    status: SupplierReplyStatus
  ) => void | Promise<void>;

  onUploadQuoteFile?: (
    supplierId: string,
    backendResultId: number,
    file: File
  ) => void | Promise<void>;

  onOpenQuoteFile?: (
    supplierId: string,
    backendResultId: number
  ) => void | Promise<void>;

  onMarkSupplierDialogRead?: (
    supplierId: string,
    backendResultId: number
  ) => void | Promise<void>;
}

 function safeHostLabel(rawUrl?: string): string {
  const u = (rawUrl ?? "").trim();
  if (!u || u === "#") return "—";

  if (!/^https?:\/\//i.test(u)) {
    return u.replace(/^\/+/, "").split("/")[0] || "—";
  }

  try {
    return new URL(u).hostname || "—";
  } catch {
    return u.replace(/^https?:\/\//i, "").split("/")[0] || "—";
  }
}

function safeHref(rawUrl?: string): string {
  const u = (rawUrl ?? "").trim();
  if (!u) return "#";
  return u;
}

function isValidEmail(email: string): boolean {
  const v = (email || "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function formatDialogDate(value?: string | null): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function replyDirectionLabel(reply: SupplierReplyItem): string {
  const direction = String(reply.direction || "").toLowerCase();

  if (direction === "user") return "Вы написали поставщику";
  if (direction === "system") return "Системное событие";

  if (reply.message_type === "quote" || reply.status === "quote_received") {
    return "Поставщик прислал КП";
  }

  if (reply.message_type === "invoice") {
    return "Поставщик прислал счёт";
  }

  if (reply.status === "clarification_requested") {
    return "Поставщик запросил уточнение";
  }

  if (reply.status === "declined") {
    return "Поставщик отказал";
  }

  return "Поставщик ответил";
}

function replyCardClass(reply: SupplierReplyItem): string {
  const direction = String(reply.direction || "").toLowerCase();

  if (direction === "user") {
    return "border-blue-500/30 bg-blue-500/5";
  }

  if (direction === "system") {
    return "border-muted-foreground/25 bg-muted/20";
  }

  if (reply.message_type === "quote" || reply.status === "quote_received") {
    return "border-emerald-500/30 bg-emerald-500/5";
  }

  if (reply.status === "clarification_requested") {
    return "border-blue-500/30 bg-blue-500/5";
  }

  if (reply.status === "declined") {
    return "border-red-500/30 bg-red-500/5";
  }

  return "border-border bg-card/40";
}

function fileSizeLabel(sizeBytes?: number | null): string {
  const value = Number(sizeBytes || 0);

  if (!value) return "—";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;

  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function supplierDialogCount(supplier: Supplier): number {
  const value = Number(supplier.supplier_replies_count || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function unreadSupplierDialogCount(supplier: Supplier): number {
  const value = Number(supplier.unread_supplier_replies_count || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function hasSupplierDialog(supplier: Supplier): boolean {
  return Boolean(supplier.backend_result_id && supplierDialogCount(supplier) > 0);
}

function supplierDialogBadgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function SupplierStatusBadge({
  status,
  onShowError,
}: {
  status: Supplier["status"];
  onShowError?: () => void;
}) {
  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 text-success text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Отправлено
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          Ошибка
          {onShowError && (
            <button
              onClick={onShowError}
              className="ml-1 p-0.5 rounded hover:bg-destructive/20 transition-colors"
              title="Показать причину ошибки"
              type="button"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-success text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Найден
        </span>
      );
  }
}

function ErrorModal({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!supplier) return null;

  const hasError = supplier.error_message || supplier.error_details;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Причина ошибки</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Поставщик</p>
            <p className="text-foreground font-medium">
              {supplier.supplier_name || "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {supplier.contact || "—"}
            </p>
          </div>

          {supplier.error_code && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Код ошибки</p>
              <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                {supplier.error_code}
              </code>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">Описание</p>
            <p className="text-foreground">
              {supplier.error_message || "Причина не указана"}
            </p>
          </div>

          {supplier.error_details && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    detailsOpen && "rotate-180"
                  )}
                />
                Показать детали
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {supplier.error_details}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {!hasError && (
            <p className="text-muted-foreground italic">Причина не указана</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddManualEmailModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const normalized = email.trim();
  const ok = isValidEmail(normalized);

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setEmail("");
      setTouched(false);
    }
  };

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    onConfirm(normalized);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Добавить поставщика вручную
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Введите email поставщика</p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="example@company.ru"
              className={cn(
                "bg-muted/30",
                touched &&
                  !ok &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              autoFocus
              inputMode="email"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            {touched && !ok && (
              <p className="text-xs text-destructive">
                Укажите корректный email (например, name@company.ru)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => close(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={!ok}>
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const REPLY_STATUS_OPTIONS: Array<{
  value: SupplierReplyStatus;
  label: string;
  shortLabel: string;
}> = [
  { value: "no_reply", label: "Нет ответа", shortLabel: "Нет ответа" },
  { value: "in_progress", label: "В работе", shortLabel: "В работе" },
  { value: "quote_received", label: "КП получено", shortLabel: "КП" },
  { value: "clarification_requested", label: "Нужны уточнения", shortLabel: "Уточнение" },
  { value: "declined", label: "Отказ", shortLabel: "Отказ" },
  { value: "manual_review", label: "Проверить вручную", shortLabel: "Проверить" },
];

function replyStatusLabel(status?: string | null): string {
  const found = REPLY_STATUS_OPTIONS.find((x) => x.value === status);
  return found?.label || "Нет ответа";
}

function quoteSourceLabel(source?: string | null): string {
  if (source === "manual") return "вручную";
  if (source === "text") return "текст";
  if (source === "attachment") return "файл";
  if (source === "link") return "ссылка";
  return "";
}

function quoteStatusText(supplier: Supplier): string {
  const fileCount = Number(supplier.quote_file_count || 0);

  if (
    supplier.quote_received ||
    supplier.reply_status === "quote_received"
  ) {
    return `Файлов: ${fileCount}`;
  }

  if (supplier.reply_status === "declined") {
    return "КП не получено";
  }

  if (supplier.reply_status === "in_progress") {
    return "Ожидаем КП";
  }

  if (supplier.reply_status === "clarification_requested") {
    return "КП пока не получено";
  }

  return "КП пока не получено";
}

function ReplyStatusIcon({ status }: { status?: string | null }) {
  if (status === "quote_received") {
    return <FileCheck2 className="h-3.5 w-3.5" />;
  }

  if (status === "in_progress") {
    return <Clock3 className="h-3.5 w-3.5" />;
  }

  if (status === "clarification_requested") {
    return <HelpCircle className="h-3.5 w-3.5" />;
  }

  if (status === "declined") {
    return <Ban className="h-3.5 w-3.5" />;
  }

  if (status === "manual_review") {
    return <AlertCircle className="h-3.5 w-3.5" />;
  }

  return <MessageSquareText className="h-3.5 w-3.5" />;
}

function replyStatusBadgeClass(status?: string | null) {
  if (status === "quote_received") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "in_progress") {
    return "border-[#ffbf00]/30 bg-[#ffbf00]/10 text-[#ffbf00]";
  }

  if (status === "clarification_requested") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (status === "declined") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (status === "manual_review") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  return "border-white/10 bg-white/5 text-white/60";
}

function hasSupplierReply(supplier: Supplier): boolean {
  const reply = supplier.latest_reply;

  if (!reply) return false;
  if (reply.source === "system") return false;

  return Boolean(
    String(reply.body_text || "").trim() ||
      String(reply.subject || "").trim() ||
      String(reply.from_email || "").trim()
  );
}



export function SupplierTable({
  suppliers,
  onToggleSelect,
  onDelete,
  onAdd,
  disabled = false,
  readOnly = false,
  onToggleQuote,
  onSetReplyStatus,
  onUploadQuoteFile,
  onOpenQuoteFile,
  onMarkSupplierDialogRead,
}: SupplierTableProps) {
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedErrorSupplier, setSelectedErrorSupplier] =
    useState<Supplier | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSupplier, setDialogSupplier] = useState<Supplier | null>(null);
  const [dialogReplies, setDialogReplies] = useState<SupplierReplyItem[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleShowError = (supplier: Supplier) => {
    setSelectedErrorSupplier(supplier);
    setErrorModalOpen(true);
  };

  // ===== toggle all checkboxes (header button) =====
  const selectableSuppliers = useMemo(() => {
  return suppliers.filter(
    (s) => s.status !== "sent" && Boolean(s.contact?.trim())
  );
}, [suppliers]);

  const allSelected = useMemo(() => {
    if (selectableSuppliers.length === 0) return false;
    return selectableSuppliers.every((s) => !!s.selected);
  }, [selectableSuppliers]);

  const handleToggleAll = () => {
    if (disabled || readOnly) return;

    const next = !allSelected;

    for (const s of selectableSuppliers) {
      const cur = !!s.selected;
      if (cur !== next) onToggleSelect(s.id);
    }
  };

  if (!suppliers.length) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Введите наименование оборудования и нажмите "Найти поставщиков".
      </div>
    );
  }

  const toggleAllDisabled =
    disabled || readOnly || selectableSuppliers.length === 0;

  const showQuoteColumn = readOnly;
  const canToggleQuote = typeof onToggleQuote === "function" && !disabled;

  const quoteActionButtonBase =
  "inline-flex h-6 items-center justify-center rounded-md border px-2 text-[10px] font-semibold leading-none transition";

async function openSupplierDialog(supplier: Supplier) {
  if (!supplier.backend_result_id) return;

  setDialogSupplier(supplier);
  setDialogOpen(true);
  setDialogLoading(true);
  setDialogError(null);
  setDialogReplies([]);

  try {
    const response = await getResultReplies(supplier.backend_result_id);
    setDialogReplies(Array.isArray(response.items) ? response.items : []);

    if (Number(supplier.unread_supplier_replies_count || 0) > 0) {
      await onMarkSupplierDialogRead?.(supplier.id, supplier.backend_result_id);
    }
  } catch (e) {
    setDialogError(
      e instanceof Error ? e.message : "Не удалось загрузить диалог"
    );
  } finally {
    setDialogLoading(false);
  }
}

async function openDialogAttachment(file: ReplyAttachmentItem) {
  try {
    const result = await downloadQuoteFile(file.id);

    const url = URL.createObjectURL(result.blob);
    window.open(url, "_blank", "noopener,noreferrer");

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    setDialogError(
      e instanceof Error ? e.message : "Не удалось открыть файл"
    );
  }
}

  return (
    <div className="space-y-4">
      <div
  className={cn(
    "border border-border rounded-lg bg-card",
    readOnly ? "overflow-x-auto" : "overflow-hidden"
  )}
>
  <Table className={cn(readOnly && "table-fixed")}>
    {readOnly ? (
      <colgroup>
        <col style={{ width: "15%" }} />
        <col style={{ width: "17%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "42%" }} />
      </colgroup>
    ) : (
      <colgroup>
        <col style={{ width: "44px" }} />
        <col style={{ width: "25%" }} />
        <col style={{ width: "27%" }} />
        <col style={{ width: "24%" }} />
        <col style={{ width: "18%" }} />
        <col style={{ width: "44px" }} />
      </colgroup>
    )}
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {!readOnly && (
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleAll}
                    disabled={toggleAllDisabled}
                    className="h-8 w-8"
                    title={allSelected ? "Снять все галочки" : "Выбрать всех"}
                    aria-label={allSelected ? "Снять все" : "Выбрать всех"}
                  >
                    {allSelected ? (
                      <CheckSquare2 className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </Button>
                </TableHead>
              )}

              <TableHead className="text-center text-muted-foreground font-normal">
  Поставщик
</TableHead>

<TableHead className="text-center text-muted-foreground font-normal">
  Контакт
</TableHead>

<TableHead className="text-center text-muted-foreground font-normal">
  Источник
</TableHead>

<TableHead className="w-[100px] min-w-[100px] px-2 text-center text-muted-foreground font-normal">
  Статус
</TableHead>

{showQuoteColumn && (
  <TableHead className="w-[420px] min-w-[420px] px-3 text-center text-muted-foreground font-normal">
    Обратная связь
  </TableHead>
)}

              {!readOnly && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {suppliers.map((supplier) => {
              const href = safeHref(supplier.source_url);
              const hostLabel = safeHostLabel(supplier.source_url);
              const hasEmail = Boolean(supplier.contact?.trim());
              const contactLabel = supplier.contact_label || (hasEmail ? supplier.contact : "Контакт через сайт");
              const backendId = supplier.backend_result_id;
              const quoteChecked = !!supplier.quote_received;
              const quoteFileCount = Number(supplier.quote_file_count || 0);
              const replyDialogCount = supplierDialogCount(supplier);
              const unreadReplyDialogCount = unreadSupplierDialogCount(supplier);

const quoteToggleDisabled =
  !backendId || !canToggleQuote;

const replyStatusDisabled =
  !backendId || typeof onSetReplyStatus !== "function";

const uploadQuoteDisabled =
  !backendId || typeof onUploadQuoteFile !== "function";

              return (
                <TableRow
                  key={supplier.id}
                  className={cn(
                    "border-border hover:bg-muted/30",
                    supplier.status === "sent" && "table-row-success",
                    supplier.status === "error" && "table-row-error"
                  )}
                >
                  {!readOnly && (
                    <TableCell>
                      <Checkbox
  checked={!!supplier.selected && hasEmail}
  onCheckedChange={() => {
    if (!hasEmail) return;
    onToggleSelect(supplier.id);
  }}
  disabled={disabled || supplier.status === "sent" || !hasEmail}
  className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
  title={
    hasEmail
      ? "Выбрать для отправки КП"
      : "Email не найден. Откройте сайт поставщика вручную."
  }
/>
                    </TableCell>
                  )}

                  <TableCell className="align-middle px-3 py-3 font-medium text-foreground">
  <div
    className={cn(
      "max-w-full break-words leading-snug",
      readOnly &&
        "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
    )}
    title={supplier.supplier_name || "—"}
  >
    {supplier.supplier_name || "—"}
  </div>
</TableCell>

                  <TableCell className="align-middle px-3 py-3">
  {hasEmail ? (
    <span
      className={cn(
        "block max-w-full text-muted-foreground",
        readOnly ? "truncate text-[13px]" : "break-all whitespace-normal"
      )}
      title={supplier.contact}
    >
      {supplier.contact}
    </span>
  ) : (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-sm text-yellow-300" title={contactLabel}>
        {contactLabel}
      </span>
      <span className="text-[11px] text-muted-foreground">
        Email не найден
      </span>
    </div>
  )}
</TableCell>

                  <TableCell className="align-middle px-3 py-3">
  {href !== "#" ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-block max-w-full text-primary hover:underline",
        readOnly ? "truncate text-[13px]" : "break-all whitespace-normal"
      )}
      title={hostLabel}
    >
      {hostLabel}
    </a>
  ) : (
    <span
      className={cn(
        "inline-block max-w-full text-muted-foreground",
        readOnly ? "truncate text-[13px]" : "break-all whitespace-normal"
      )}
      title={hostLabel}
    >
      {hostLabel}
    </span>
  )}
</TableCell>

                  <TableCell className="w-[100px] min-w-[100px] px-2 text-center align-middle">
  <SupplierStatusBadge
                      status={supplier.status}
                      onShowError={
                        supplier.status === "error"
                          ? () => handleShowError(supplier)
                          : undefined
                      }
                    />
                  </TableCell>

{showQuoteColumn && (
  <TableCell className="w-[420px] min-w-[420px] px-3 align-middle">
    <div className="flex min-w-0 flex-col gap-1.5">
      {/* 1. Верхняя строка: текущий статус + подпись */}
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold leading-none",
            replyStatusBadgeClass(supplier.reply_status)
          )}
        >
          <ReplyStatusIcon status={supplier.reply_status} />
          <span>{replyStatusLabel(supplier.reply_status)}</span>
        </div>

        <div
          className={cn(
            "min-w-0 truncate text-[11px]",
            supplier.quote_received || supplier.reply_status === "quote_received"
              ? "text-emerald-300"
              : supplier.reply_status === "in_progress"
                ? "text-[#ffbf00]"
                : supplier.reply_status === "declined"
                  ? "text-red-300"
                  : "text-muted-foreground"
          )}
          title={quoteStatusText(supplier)}
        >
          {quoteStatusText(supplier)}
        </div>
      </div>

      {/* 2. Средняя строка: ручные статусы */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={replyStatusDisabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!backendId || typeof onSetReplyStatus !== "function") return;
            void onSetReplyStatus(supplier.id, backendId, "in_progress");
          }}
          className={cn(
            quoteActionButtonBase,
            "border-[#ffbf00]/30 bg-[#ffbf00]/10 text-[#ffbf00] hover:bg-[#ffbf00] hover:text-[#2b2100]",
            replyStatusDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Поставщик сообщил, что запрос в работе"
        >
          В работе
        </button>

        <button
          type="button"
          disabled={replyStatusDisabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!backendId || typeof onSetReplyStatus !== "function") return;
            void onSetReplyStatus(supplier.id, backendId, "quote_received");
          }}
          className={cn(
            quoteActionButtonBase,
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white",
            replyStatusDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Поставщик прислал КП"
        >
          КП
        </button>

        <button
          type="button"
          disabled={replyStatusDisabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!backendId || typeof onSetReplyStatus !== "function") return;
            void onSetReplyStatus(
              supplier.id,
              backendId,
              "clarification_requested"
            );
          }}
          className={cn(
            quoteActionButtonBase,
            "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white",
            replyStatusDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Поставщик запросил уточнение"
        >
          Уточнение
        </button>

        <button
          type="button"
          disabled={replyStatusDisabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!backendId || typeof onSetReplyStatus !== "function") return;
            void onSetReplyStatus(supplier.id, backendId, "declined");
          }}
          className={cn(
            quoteActionButtonBase,
            "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white",
            replyStatusDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Поставщик отказал или нет возможности поставить"
        >
          Отказ
        </button>
      </div>

      {/* 3. Нижняя строка: фиксированная отметка КП + действия */}
      <div className="flex w-full items-center justify-start gap-2">
        <div className="flex w-[102px] shrink-0 items-center justify-start">
          <label
            className={cn(
              "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-muted-foreground transition hover:text-white",
              quoteToggleDisabled && "cursor-not-allowed opacity-50"
            )}
            title="Подтвердить получение КП"
          >
            <Checkbox
              checked={quoteChecked}
              disabled={quoteToggleDisabled}
              onCheckedChange={() => {
                if (!backendId || !onToggleQuote) return;
                void onToggleQuote(supplier.id, backendId, !quoteChecked);
              }}
              className="h-3.5 w-3.5"
            />
            <span>КП получено</span>
          </label>
        </div>

        <div className="flex min-w-0 flex-nowrap items-center justify-start gap-1.5 whitespace-nowrap">
          {backendId && quoteFileCount > 0 && onOpenQuoteFile ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!backendId || typeof onOpenQuoteFile !== "function") return;
                void onOpenQuoteFile(supplier.id, backendId);
              }}
              className="
                inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md
                border border-emerald-500/25 bg-emerald-500/10 px-2
                text-[10px] font-semibold text-emerald-300
                transition hover:bg-emerald-500 hover:text-white
              "
              title="Открыть файл КП"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Открыть КП
            </button>
          ) : null}

          {replyDialogCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openSupplierDialog(supplier);
              }}
              className="
                relative inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md
                border border-sky-500/25 bg-sky-500/10 px-2
                text-[10px] font-semibold text-sky-200
                transition hover:bg-sky-500 hover:text-white
              "
              title={
                unreadReplyDialogCount > 0
                  ? `Открыть диалог с поставщиком · новых сообщений: ${unreadReplyDialogCount} · всего сообщений: ${replyDialogCount}`
                  : `Открыть диалог с поставщиком · всего сообщений: ${replyDialogCount}`
              }
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Диалог

              {unreadReplyDialogCount > 0 ? (
                <span
                  className="
                    absolute -right-1.5 -top-1.5
                    inline-flex h-4 min-w-4 items-center justify-center rounded-full
                    border border-card bg-red-500 px-1
                    text-[9px] font-bold leading-none text-white
                    shadow-[0_0_0_1px_rgba(0,0,0,0.25)]
                  "
                >
                  {supplierDialogBadgeText(unreadReplyDialogCount)}
                </span>
              ) : null}
            </button>
          ) : null}

          {backendId && onUploadQuoteFile ? (
            <>
              <input
                id={`quote-file-${supplier.id}`}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ods,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  event.target.value = "";

                  if (!selectedFile || !backendId || !onUploadQuoteFile) return;
                  void onUploadQuoteFile(supplier.id, backendId, selectedFile);
                }}
              />

              <label
                htmlFor={`quote-file-${supplier.id}`}
                className={cn(
                  "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-semibold text-white/70 transition hover:border-[#ffbf00]/50 hover:bg-[#ffbf00]/10 hover:text-[#ffbf00]",
                  uploadQuoteDisabled && "pointer-events-none opacity-50"
                )}
                title="Загрузить файл КП"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                Загрузить
              </label>
            </>
          ) : null}
        </div>
      </div>
    </div>
  </TableCell>
)}                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(supplier.id)}
                        disabled={disabled}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Удалить"
                        aria-label="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddModalOpen(true)}
            disabled={disabled}
            className="border-border text-foreground hover:bg-muted"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить вручную
          </Button>
        </div>
      )}

      <AddManualEmailModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onConfirm={(email) => onAdd(email)}
      />

      <ErrorModal
        open={errorModalOpen}
        onOpenChange={setErrorModalOpen}
        supplier={selectedErrorSupplier}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card border-border text-foreground [&_[data-radix-dialog-close]]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Диалог с поставщиком</DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Поставщик</div>
                <div className="mt-1 font-medium text-foreground">
                  {dialogSupplier?.supplier_name || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Контакт</div>
                <div className="mt-1 font-medium text-foreground break-all">
                  {dialogSupplier?.contact || "—"}
                </div>
              </div>
            </div>
          </div>

          {dialogError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {dialogError}
            </div>
          )}

          <div className="flex-1 overflow-auto space-y-3 pr-1">
            {dialogLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Загружаем диалог...
              </div>
            ) : dialogReplies.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                По этому поставщику пока нет сообщений.
              </div>
            ) : (
              dialogReplies.map((reply) => {
                const attachments = Array.isArray(reply.attachments)
                  ? reply.attachments
                  : [];

                return (
                  <div
                    key={reply.id}
                    className={cn(
                      "rounded-xl border p-4",
                      replyCardClass(reply)
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <MessageSquareText className="w-4 h-4 text-muted-foreground" />
                          <div className="font-semibold text-sm">
                            {replyDirectionLabel(reply)}
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDialogDate(reply.received_at || reply.created_at)}
                        </div>
                      </div>

                      {attachments.length > 0 && (
                        <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                          <FileCheck2 className="w-3 h-3 mr-1" />
                          Файлов: {attachments.length}
                        </div>
                      )}
                    </div>

                    {reply.from_email && (
                      <div className="mt-3 text-xs text-muted-foreground break-all">
                        От: {reply.from_name ? `${reply.from_name} · ` : ""}
                        {reply.from_email}
                      </div>
                    )}

                    {reply.subject && (
                      <div className="mt-2 rounded-md border border-border/70 bg-background/30 px-3 py-2 text-xs text-muted-foreground break-all">
                        {reply.subject}
                      </div>
                    )}

                    {reply.body_text && (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
                        {reply.body_text}
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((file) => (
                          <div
                            key={file.id}
                            className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {file.original_filename || `Файл ${file.id}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {file.detected_type || "file"} · {fileSizeLabel(file.size_bytes)}
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 shrink-0 px-2 text-[11px]"
                              onClick={() => openDialogAttachment(file)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Открыть
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setDialogOpen(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}