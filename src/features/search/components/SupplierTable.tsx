import { useState } from "react";
import { Supplier } from "@/shared/types/rfq";
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
} from "lucide-react";
import { cn } from "@/shared/utils/utils";

interface SupplierTableProps {
  suppliers: Supplier[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (email: string) => void;
  disabled?: boolean;

  /** NEW: просмотр из истории (без выбора/удаления/ручного добавления) */
  readOnly?: boolean;
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
  // Практичная валидация (без чрезмерной строгости)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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
            <p className="text-sm text-muted-foreground">
              Введите email поставщика
            </p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="example@company.ru"
              className={cn(
                "bg-muted/30",
                touched && !ok && "border-destructive focus-visible:ring-destructive"
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

export function SupplierTable({
  suppliers,
  onToggleSelect,
  onDelete,
  onAdd,
  disabled = false,
  readOnly = false,
}: SupplierTableProps) {
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedErrorSupplier, setSelectedErrorSupplier] =
    useState<Supplier | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleShowError = (supplier: Supplier) => {
    setSelectedErrorSupplier(supplier);
    setErrorModalOpen(true);
  };

  if (suppliers.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center bg-card">
        <p className="text-muted-foreground">
          Результаты поиска появятся здесь. Введите наименование оборудования и
          нажмите "Найти поставщиков".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {!readOnly && <TableHead className="w-12" />}
              <TableHead className="text-muted-foreground font-normal">
                Поставщик
              </TableHead>
              <TableHead className="text-muted-foreground font-normal">
                Контакт
              </TableHead>
              <TableHead className="text-muted-foreground font-normal">
                Источник
              </TableHead>
              <TableHead className="text-muted-foreground font-normal">
                Статус
              </TableHead>
              {!readOnly && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {suppliers.map((supplier) => {
              const href = safeHref(supplier.source_url);
              const hostLabel = safeHostLabel(supplier.source_url);

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
                        checked={!!supplier.selected}
                        onCheckedChange={() => onToggleSelect(supplier.id)}
                        disabled={disabled || supplier.status === "sent"}
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                    </TableCell>
                  )}

                  <TableCell className="font-medium text-foreground">
                    {supplier.supplier_name || "—"}
                  </TableCell>

                  <TableCell>
                    <span className="text-muted-foreground">
                      {supplier.contact || "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    {href !== "#" ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {hostLabel}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{hostLabel}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <SupplierStatusBadge
                      status={supplier.status}
                      onShowError={
                        supplier.status === "error"
                          ? () => handleShowError(supplier)
                          : undefined
                      }
                    />
                  </TableCell>

                  {!readOnly && (
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
    </div>
  );
}