import { RequestStatus } from '@/shared/types/rfq';
import { Loader2, CheckCircle2, AlertCircle, Search, Circle } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus;
}

const statusConfig: Record<RequestStatus, { label: string; className: string; icon: React.ReactNode }> = {
  idle: {
    label: 'Готов к работе',
    className: 'text-muted-foreground',
    icon: <Circle className="w-3 h-3" />,
  },
  searching: {
    label: 'Статус: выполняется поиск...',
    className: 'text-primary',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  search_completed: {
    label: 'Статус: поставщики найдены',
    className: 'text-success',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  sending: {
    label: 'Статус: отправка запросов...',
    className: 'text-primary',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  completed: {
    label: 'Статус: завершено',
    className: 'text-success',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  error: {
    label: 'Статус: ошибка',
    className: 'text-destructive',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.className}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
