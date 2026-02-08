import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Search, ArrowRightLeft, Loader2 } from 'lucide-react';
import { RequestStatus } from '@/shared/types/rfq';

interface InputBlockProps {
  equipmentName: string;
  emailSubject: string;
  rfqText: string;
  status: RequestStatus;
  hasSuppliers: boolean;
  selectedCount: number;
  onEquipmentNameChange: (value: string) => void;
  onEmailSubjectChange: (value: string) => void;
  onRfqTextChange: (value: string) => void;
  onSearch: () => void;
  onSend: () => void;
}

const MAX_CHARS = 3000;

export function InputBlock({
  equipmentName,
  emailSubject,
  rfqText,
  status,
  hasSuppliers,
  selectedCount,
  onEquipmentNameChange,
  onEmailSubjectChange,
  onRfqTextChange,
  onSearch,
  onSend,
}: InputBlockProps) {
  const isSearching = status === 'searching';
  const isSending = status === 'sending';
  const canSearch = equipmentName.trim() && emailSubject.trim() && rfqText.trim() && !isSearching && !isSending;
  const canSend = hasSuppliers && selectedCount > 0 && !isSearching && !isSending && status !== 'idle';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="equipment" className="text-foreground font-medium">
          Наименование оборудования
        </Label>
        <Input
          id="equipment"
          placeholder="Укажите наименование оборудования"
          value={equipmentName}
          onChange={(e) => onEquipmentNameChange(e.target.value)}
          disabled={isSearching || isSending}
          className="bg-card border-border"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email-subject" className="text-foreground font-medium">
          Тема письма
        </Label>
        <Input
          id="email-subject"
          placeholder="Запрос КП — ..."
          value={emailSubject}
          onChange={(e) => onEmailSubjectChange(e.target.value)}
          disabled={isSearching || isSending}
          className="bg-card border-border"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rfq-text" className="text-foreground font-medium">
          Текст запроса коммерческого предложения
        </Label>
        <div className="relative">
          <Textarea
            id="rfq-text"
            placeholder="Введите запрос с описанием оборудования в свободной форме..."
            value={rfqText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                onRfqTextChange(e.target.value);
              }
            }}
            disabled={isSearching || isSending}
            className="min-h-[120px] resize-y bg-card border-border"
            maxLength={MAX_CHARS}
          />
          <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
            {rfqText.length} / {MAX_CHARS} символов
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 pt-2">
        <Button
          onClick={onSearch}
          disabled={!canSearch}
          className="flex-1"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Поиск...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Найти поставщиков
            </>
          )}
        </Button>
        
        <Button
          onClick={onSend}
          disabled={!canSend}
          variant="secondary"
          className="flex-1"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Отправить запрос КП {selectedCount > 0 && `(${selectedCount})`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
