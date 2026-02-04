import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { RFQRequest, RequestStatus } from '@/types/rfq';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: RFQRequest[];
}

const statusLabels: Record<RequestStatus, { label: string; className: string; icon: React.ReactNode }> = {
  idle: { label: 'Черновик', className: 'text-muted-foreground', icon: <Clock className="w-3.5 h-3.5" /> },
  searching: { label: 'Поиск...', className: 'text-primary', icon: <Clock className="w-3.5 h-3.5" /> },
  search_completed: { label: 'Поиск выполнен', className: 'text-blue-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  sending: { label: 'Отправка...', className: 'text-primary', icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: 'Отправлено', className: 'text-success', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  error: { label: 'Ошибка', className: 'text-destructive', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function formatDateTime(date: Date): string {
  return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
}

export function HistoryModal({ open, onOpenChange, history }: HistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    if (!searchQuery.trim()) return sorted;
    
    const query = searchQuery.toLowerCase();
    return sorted.filter(
      (r) =>
        r.email_subject.toLowerCase().includes(query) ||
        r.equipment_name.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">История запросов</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по теме"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-2">
            {filteredHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? 'Ничего не найдено' : 'История запросов пуста'}
              </p>
            ) : (
              filteredHistory.map((request) => {
                const status = statusLabels[request.status];
                const displayDate = request.sent_at || request.created_at;
                
                return (
                  <div
                    key={request.id}
                    className="bg-muted/30 border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(displayDate)}
                    </div>
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {request.email_subject}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {request.equipment_name}
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${status.className}`}>
                          {status.icon}
                          <span>{status.label}</span>
                        </div>
                        {request.recipients_count !== undefined && request.recipients_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.recipients_count} адресатов
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
