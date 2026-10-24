import { Search } from "lucide-react";

import type { AdminRecentSearchItem } from "@/api/admin";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

import { formatDateTime, formatNumber, statusBadgeClass } from "../adminUtils";

type AdminRecentSearchesProps = {
  searches: AdminRecentSearchItem[];
};

export function AdminRecentSearches({ searches }: AdminRecentSearchesProps) {
  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Search className="h-4 w-4 text-primary" />
          Последние поиски
        </CardTitle>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-background/45 p-4 text-sm text-white/45">Поисков пока нет</div>
        ) : (
          <div className="space-y-2">
            {searches.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-background/45 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white" title={item.query}>
                      {item.query}
                    </div>
                    <div className="mt-1 text-xs text-white/45">
                      {formatDateTime(item.created_at)} · {item.search_mode} · {item.provider}
                    </div>
                  </div>
                  {item.status === "failed" && item.error_message ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`shrink-0 border ${statusBadgeClass(item.status)}`}>{item.status}</Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs border-white/10 bg-card text-white">
                        {item.error_message}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge className={`shrink-0 border ${statusBadgeClass(item.status)}`}>{item.status}</Badge>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/55">
                  <Metric label="Результаты" value={item.results_count} />
                  <Metric label="Отправлено" value={item.emails_sent} />
                  <Metric label="Ошибок" value={item.emails_failed} danger={item.emails_failed > 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <div className="text-white/40">{label}</div>
      <div className={danger ? "font-semibold text-red-300" : "font-semibold text-white"}>{formatNumber(value)}</div>
    </div>
  );
}
