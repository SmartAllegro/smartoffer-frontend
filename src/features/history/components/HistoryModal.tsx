import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Search, RefreshCw, Mail } from "lucide-react";
import type { RFQRequest, Supplier } from "@/shared/types/rfq";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/shared/hooks/use-toast";

import { SupplierTable } from "@/features/search/components/SupplierTable";
import { getHistoryDetail } from "@/api/history";
import { apiFetch } from "@/api/client";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // совместимость со старым вызовом — больше не используем
  history?: RFQRequest[];
}

function formatDateTime(date: Date): string {
  return format(date, "d MMMM yyyy, HH:mm", { locale: ru });
}

/**
 * /history/{job_id} возвращает results[].email_statuses:
 * - если есть failed -> error
 * - если есть sent   -> sent
 * - иначе            -> found
 */
function deriveSupplierStatus(r: any): {
  status: Supplier["status"];
  error_message?: string;
  error_details?: string;
} {
  const statuses = Array.isArray(r?.email_statuses) ? r.email_statuses : [];

  const failed = statuses.find((x: any) => x?.status === "failed");
  if (failed) {
    const msg = failed?.last_error || "Ошибка отправки";
    return {
      status: "error",
      error_message: msg,
      error_details: failed?.last_error ? String(failed.last_error) : undefined,
    };
  }

  const sent = statuses.find((x: any) => x?.status === "sent");
  if (sent) return { status: "sent" };

  return { status: "found" };
}

/**
 * Достаём backend job_id из RFQRequest.
 * Поддерживаем несколько вариантов имени поля + fallback на id вида "job-123".
 */
function getBackendJobId(request: RFQRequest): number | null {
  const anyReq: any = request as any;

  const candidates = [
    anyReq.backend_job_id,
    anyReq.backend_jobId,
    anyReq.job_id,
    anyReq.jobId,
  ];

  for (const c of candidates) {
    if (typeof c === "number" && !Number.isNaN(c) && c > 0) return c;
    if (typeof c === "string" && c.trim() && !Number.isNaN(Number(c)))
      return Number(c);
  }

  if (typeof request.id === "string" && request.id.startsWith("job-")) {
    const n = Number(request.id.replace("job-", ""));
    if (!Number.isNaN(n) && n > 0) return n;
  }

  return null;
}

/**
 * Тип ответа GET /history?limit=&offset=
 * (по скриншоту)
 */
type BackendHistoryItem = {
  id: number;
  query: string;
  provider?: string;
  lang?: string;
  time_ms?: number;
  created_at: string;
  results_count?: number;
  emails_sent?: number;
  emails_failed?: number;
};

type BackendHistoryList = {
  items: BackendHistoryItem[];
};

const PAGE_LIMIT = 50;

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  const { toast } = useToast();

  // список истории (пагинация)
  const [items, setItems] = useState<RFQRequest[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTitle, setDetailTitle] = useState<string>("Результаты запроса");
  const [detailSuppliers, setDetailSuppliers] = useState<Supplier[]>([]);

  // NEW: письмо
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  const mapBackendToRFQ = useCallback((it: BackendHistoryItem): RFQRequest => {
    const createdAt = it.created_at ? new Date(it.created_at) : new Date();

    // В истории НЕ показываем статус. Но RFQRequest требует status.
    // Ставим search_completed как нейтральный.
    const req: RFQRequest = {
      id: `job-${it.id}`,
      equipment_name: it.query || "",
      email_subject: `Запрос КП — ${it.query || ""}`.trim(),
      rfq_text: "",
      status: "search_completed",
      created_at: createdAt,
      sent_at: undefined,
      recipients_count: undefined,
      // дополнительные поля (мы их используем через any)
      ...({ backend_job_id: it.id } as any),
    };

    return req;
  }, []);

  const loadFirstPage = useCallback(async () => {
    setLoadingFirst(true);
    setItems([]);
    setOffset(0);
    setHasMore(true);

    try {
      const res = await apiFetch<BackendHistoryList>(
        `/history?limit=${PAGE_LIMIT}&offset=0`,
        {
          method: "GET",
        }
      );

      const page = Array.isArray(res?.items) ? res.items : [];
      const mapped = page.map(mapBackendToRFQ);

      setItems(mapped);
      setOffset(page.length);
      setHasMore(page.length === PAGE_LIMIT);
    } catch (e) {
      toast({
        title: "Не удалось загрузить историю",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
      setHasMore(false);
    } finally {
      setLoadingFirst(false);
    }
  }, [mapBackendToRFQ, toast]);

  const loadMorePage = useCallback(async () => {
    if (!hasMore || loadingMore || loadingFirst) return;

    setLoadingMore(true);
    try {
      const res = await apiFetch<BackendHistoryList>(
        `/history?limit=${PAGE_LIMIT}&offset=${offset}`,
        { method: "GET" }
      );

      const page = Array.isArray(res?.items) ? res.items : [];
      const mapped = page.map(mapBackendToRFQ);

      setItems((prev) => [...prev, ...mapped]);
      setOffset((prev) => prev + page.length);
      setHasMore(page.length === PAGE_LIMIT);
    } catch (e) {
      toast({
        title: "Не удалось догрузить историю",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loadingFirst, offset, mapBackendToRFQ, toast]);

  useEffect(() => {
    if (!open) return;
    loadFirstPage().catch(() => {});
  }, [open, loadFirstPage]);

  const filteredHistory = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );

    if (!searchQuery.trim()) return sorted;

    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (r) =>
        (r.email_subject || "").toLowerCase().includes(q) ||
        (r.equipment_name || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  async function openDetail(request: RFQRequest) {
    const jid = getBackendJobId(request);

    if (!jid) {
      toast({
        title: "Не удалось открыть запрос",
        description: "Не найден job_id в истории.",
        variant: "destructive",
      });
      return;
    }

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailSuppliers([]);
    setDetailTitle(request.email_subject || "Результаты запроса");

    // reset письмо
    setEmailSubject("");
    setEmailBody("");

    try {
      const detail = await getHistoryDetail(jid);

      // NEW: подтягиваем письмо, если бэк вернул
      const subj =
        (detail as any)?.job?.email_subject ??
        request.email_subject ??
        `Запрос КП — ${request.equipment_name || ""}`.trim();

      const body =
        (detail as any)?.job?.email_body ??
        request.rfq_text ??
        "";

      setEmailSubject(typeof subj === "string" ? subj : "");
      setEmailBody(typeof body === "string" ? body : "");

      const createdAt = detail.job?.created_at
        ? new Date(detail.job.created_at)
        : new Date();

      // manual поставщики уже присутствуют в detail.results (snippet: "manual")
      const suppliers: Supplier[] = (detail.results || []).map((r: any) => {
        const derived = deriveSupplierStatus(r);

        const title =
          typeof r?.title === "string" && r.title.trim()
            ? r.title
            : r?.domain || "—";

        const firstEmail =
          Array.isArray(r?.emails) && r.emails.length ? r.emails[0] : "";

        return {
          id: `hist-${jid}-${r.id ?? Math.random().toString(16).slice(2)}`,
          request_id: `job-${jid}`,
          supplier_name: title,
          contact: firstEmail || "",
          source_url: r?.url || "",
          selected: true,
          status: derived.status,
          created_at: createdAt,
          backend_result_id: typeof r?.id === "number" ? r.id : undefined,
          error_message: derived.error_message,
          error_details: derived.error_details,
        } as Supplier;
      });

      setDetailSuppliers(suppliers);
    } catch (e) {
      toast({
        title: "Не удалось загрузить результаты",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const threshold = 180; // px до низа
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (atBottom) loadMorePage().catch(() => {});
    },
    [loadMorePage]
  );

  const canShowEmail = (emailSubject || "").trim() || (emailBody || "").trim();

  return (
    <>
      {/* LIST MODAL */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col [&_[data-radix-dialog-close]]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl">История запросов</DialogTitle>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFirstPage()}
                disabled={loadingFirst}
                className="shrink-0 mr-5"
                title="Обновить"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    loadingFirst ? "animate-spin" : ""
                  }`}
                />
                Обновить
              </Button>
            </div>
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

          {/* ВАЖНО: вместо ScrollArea — обычный overflow, чтобы точно работало колесо */}
          <div className="flex-1 overflow-auto -mx-6 px-6" onScroll={handleScroll}>
            <div className="space-y-3 pb-2">
              {loadingFirst && items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Загрузка…</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? "Ничего не найдено" : "История запросов пуста"}
                </p>
              ) : (
                filteredHistory.map((request) => {
                  const displayDate = request.sent_at || request.created_at;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => openDetail(request)}
                      className="w-full text-left bg-muted/30 border border-border rounded-lg p-4 space-y-2 hover:bg-muted/40 transition-colors"
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

                        {/* ✅ В истории статус НЕ показываем */}
                      </div>
                    </button>
                  );
                })
              )}

              {loadingMore && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Загрузка…
                </div>
              )}

              {!loadingFirst &&
                !loadingMore &&
                hasMore &&
                filteredHistory.length > 0 && (
                  <div className="py-3 text-center text-xs text-muted-foreground">
                    Прокрутите вниз, чтобы загрузить ещё
                  </div>
                )}
            </div>
          </div>

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

      {/* DETAIL MODAL */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col [&_[data-radix-dialog-close]]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">{detailTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {detailLoading ? (
              <div className="py-10 text-center text-muted-foreground">
                Загрузка результатов…
              </div>
            ) : (
              <SupplierTable
                suppliers={detailSuppliers}
                onToggleSelect={() => {}}
                onDelete={() => {}}
                onAdd={() => {}}
                disabled={true}
                readOnly={true} // ✅ скрывает "Добавить вручную"
              />
            )}
          </div>

          <div className="pt-4 border-t border-border grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setEmailOpen(true)}
              disabled={!canShowEmail || detailLoading}
              title={!canShowEmail ? "Текст письма не найден" : "Показать письмо"}
            >
              <Mail className="w-4 h-4 mr-2" />
              Показать письмо
            </Button>

            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EMAIL PREVIEW MODAL */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col [&_[data-radix-dialog-close]]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Отправленное письмо</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-auto">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Тема</div>
              <Input value={emailSubject} readOnly className="bg-muted/40" />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Текст</div>
              <div className="bg-muted/30 border border-border rounded-lg p-3 whitespace-pre-wrap text-sm text-foreground">
                {emailBody || "—"}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button variant="outline" className="w-full" onClick={() => setEmailOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}