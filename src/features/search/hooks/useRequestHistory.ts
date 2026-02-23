import { useCallback, useState } from "react";
import type { RFQRequest } from "@/shared/types/rfq";
import { listHistory, type HistoryListItem } from "@/api/history";

/**
 * История теперь берётся с бэка (/history), а не из localStorage.
 * addRequest/updateRequest оставлены как no-op, чтобы не ломать текущий Index.tsx,
 * но фактическая история формируется сервером.
 */

function mapItemToRFQRequest(item: HistoryListItem): RFQRequest {
  // Маппим бэкендный search_job -> RFQRequest для текущего UI
  // id тут делаем строкой, но храним backend_job_id для дальнейших действий.
  const isError = (item.emails_failed ?? 0) > 0;
  const isSent = (item.emails_sent ?? 0) > 0;

  let status: RFQRequest["status"] = "search_completed";
  if (isSent && !isError) status = "completed";
  if (isError) status = "error";

  const createdAt = item.created_at ? new Date(item.created_at) : new Date();

  return {
    id: `job-${item.id}`,
    equipment_name: item.query ?? "",
    rfq_text: "",
    email_subject: `Запрос КП — ${item.query ?? ""}`,
    status,
    created_at: createdAt,
    sent_at: isSent ? createdAt : undefined,
    recipients_count: item.emails_sent ?? 0,
    backend_job_id: item.id,
  };
}

export function useRequestHistory() {
  const [history, setHistory] = useState<RFQRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listHistory(100, 0);
      const items = (res.items ?? []).map(mapItemToRFQRequest);
      // уже отсортировано сервером? на всякий случай сортируем
      items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      setHistory(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки истории");
    } finally {
      setLoading(false);
    }
  }, []);

  // совместимость со старым кодом (Index.tsx)
  const addRequest = useCallback((_request: RFQRequest) => {
    // noop — сервер ведёт историю сам
  }, []);

  const updateRequest = useCallback((_id: string, _updates: Partial<RFQRequest>) => {
    // noop — сервер ведёт статусы сам
  }, []);

  const getRequest = useCallback(
    (id: string) => history.find((r) => r.id === id),
    [history]
  );

  return { history, loading, error, refresh, addRequest, updateRequest, getRequest };
}