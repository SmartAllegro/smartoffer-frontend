import { useState } from 'react';
import { Supplier } from '@/types/rfq';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui/collapsible';
import { Trash2, Plus, CheckCircle2, AlertCircle, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierTableProps {
  suppliers: Supplier[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (email: string) => void;
  disabled?: boolean;
}

function SupplierStatusBadge({ status, onShowError }: { status: Supplier['status']; onShowError?: () => void }) {
  switch (status) {
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 text-success text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Отправлено
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          Ошибка
          {onShowError && (
            <button
              onClick={onShowError}
              className="ml-1 p-0.5 rounded hover:bg-destructive/20 transition-colors"
              title="Показать причину ошибки"
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
            <p className="text-foreground font-medium">{supplier.supplier_name}</p>
            <p className="text-sm text-muted-foreground">{supplier.contact}</p>
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
              {supplier.error_message || 'Причина не указана'}
            </p>
          </div>

          {supplier.error_details && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronDown className={cn("w-4 h-4 transition-transform", detailsOpen && "rotate-180")} />
                Показать детали
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
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

export function SupplierTable({
  suppliers,
  onToggleSelect,
  onDelete,
  onAdd,
  disabled = false,
}: SupplierTableProps) {
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedErrorSupplier, setSelectedErrorSupplier] = useState<Supplier | null>(null);

  const handleShowError = (supplier: Supplier) => {
    setSelectedErrorSupplier(supplier);
    setErrorModalOpen(true);
  };

  if (suppliers.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center bg-card">
        <p className="text-muted-foreground">
          Результаты поиска появятся здесь. Введите наименование оборудования и нажмите "Найти поставщиков".
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
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-muted-foreground font-normal">Поставщик</TableHead>
              <TableHead className="text-muted-foreground font-normal">Контакт</TableHead>
              <TableHead className="text-muted-foreground font-normal">Источник</TableHead>
              <TableHead className="text-muted-foreground font-normal">Статус</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow
                key={supplier.id}
                className={cn(
                  "border-border hover:bg-muted/30",
                  supplier.status === 'sent' && 'table-row-success',
                  supplier.status === 'error' && 'table-row-error'
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={supplier.selected}
                    onCheckedChange={() => onToggleSelect(supplier.id)}
                    disabled={disabled || supplier.status === 'sent'}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{supplier.supplier_name}</TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {supplier.contact}
                  </span>
                </TableCell>
                <TableCell>
                  <a
                    href={supplier.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {supplier.source_url.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </TableCell>
                <TableCell>
                  <SupplierStatusBadge
                    status={supplier.status}
                    onShowError={supplier.status === 'error' ? () => handleShowError(supplier) : undefined}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(supplier.id)}
                    disabled={disabled}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add supplier manually */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const email = prompt('Введите email поставщика:');
            if (email && email.includes('@')) {
              onAdd(email.trim());
            }
          }}
          disabled={disabled}
          className="border-border text-foreground hover:bg-muted"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить вручную
        </Button>
      </div>

      <ErrorModal
        open={errorModalOpen}
        onOpenChange={setErrorModalOpen}
        supplier={selectedErrorSupplier}
      />
    </div>
  );
}
