import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileText,
  Mail,
  RefreshCw,
  Search,
  Send,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/shared/utils/utils";
import type { Supplier } from "@/shared/types/rfq";

import { SupplierTable } from "@/features/search/components/SupplierTable";
import {
  downloadQuoteFile,
  getHistoryDetail,
  getHistoryStats,
  getResultReplies,
  listHistory,
  setJobDealDone,
  setQuoteReceived,
  updateResultReplyStatus,
  uploadQuoteFile,
  type HistoryListItem,
  type HistoryOutcome,
  type HistoryPeriod,
  type HistoryStatsResponse,
  type ReplyStatus,
} from "@/api/history";

const PAGE_LIMIT = 50;

const PERIODS: Array<{ value: HistoryPeriod; label: string }> = [
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
  { value: "all", label: "Всё время" },
];

const OUTCOMES: Array<{ value: HistoryOutcome; label: string }> = [
  { value: "all", label: "Все" },
  { value: "deal", label: "Сделка" },
  { value: "sent", label: "Отправлено" },
  { value: "not_sent", label: "Без отправки" },
];

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return format(date, "d MMMM yyyy, HH:mm", { locale: ru });
}

function formatUpdatedAt(): string {
  return format(new Date(), "сегодня, HH:mm", { locale: ru });
}

function displayTitle(item: HistoryListItem): string {
  const subject = (item.email_subject || "").trim();
  if (subject) return subject;

  const query = (item.query || "").trim();
  if (query.startsWith("Запрос КП")) return query;

  return `Запрос КП — ${query || "без темы"}`;
}

function displaySubtitle(item: HistoryListItem): string {
  return item.query || "—";
}

function normalizeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getQuotesReceivedCount(item: HistoryListItem): number {
  return normalizeNumber(item.quotes_received_count);
}

function pluralizeRu(count: number, forms: [string, string, string]) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];

  return forms[2];
}

function conversionLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function outcomeLabel(outcome: string): string {
  if (outcome === "deal") return "Сделка";
  if (outcome === "sent") return "Отправлено";
  return "Без отправки";
}

function searchModeLabel(mode?: string | null, provider?: string | null): string {
  const normalized = String(mode || "").trim().toLowerCase();

  if (normalized === "international") return "Глобальный";
  if (normalized === "cis") return "СНГ";

  const providerText = String(provider || "").trim().toLowerCase();

  if (
    providerText.includes("tavily") ||
    providerText.includes("searchapi") ||
    providerText.includes("baidu") ||
    providerText.includes("international")
  ) {
    return "Глобальный";
  }

  return "СНГ";
}

function searchModeBadgeClass(mode?: string | null, provider?: string | null) {
  const label = searchModeLabel(mode, provider);

  if (label === "Глобальный") {
    return "border-violet-500/28 bg-violet-500/15 text-violet-200";
  }

  return "border-blue-500/28 bg-blue-500/15 text-blue-200";
}

function outcomeBadgeClass(outcome: string) {
  if (outcome === "deal") {
    return "border-emerald-500/28 bg-[rgba(6,95,70,0.22)] text-emerald-300";
  }

  if (outcome === "sent") {
    return "border-[#ffbf00]/28 bg-[rgba(146,99,0,0.22)] text-[#ffbf00]";
  }

  return "border-red-500/28 bg-[rgba(127,29,29,0.22)] text-red-300";
}

function rowClass(outcome: string) {
  if (outcome === "deal") {
    return [
      "border-emerald-500/28",
      "bg-[linear-gradient(90deg,rgba(6,95,70,0.34),rgba(17,24,39,0.96)_24%,rgba(17,24,39,1))]",
      "hover:bg-[linear-gradient(90deg,rgba(6,95,70,0.40),rgba(17,24,39,0.98)_24%,rgba(17,24,39,1))]",
    ].join(" ");
  }

  if (outcome === "sent") {
    return [
      "border-[#ffbf00]/28",
      "bg-[linear-gradient(90deg,rgba(146,99,0,0.34),rgba(17,24,39,0.96)_24%,rgba(17,24,39,1))]",
      "hover:bg-[linear-gradient(90deg,rgba(146,99,0,0.40),rgba(17,24,39,0.98)_24%,rgba(17,24,39,1))]",
    ].join(" ");
  }

  return [
    "border-red-500/28",
    "bg-[linear-gradient(90deg,rgba(127,29,29,0.36),rgba(17,24,39,0.96)_24%,rgba(17,24,39,1))]",
    "hover:bg-[linear-gradient(90deg,rgba(127,29,29,0.42),rgba(17,24,39,0.98)_24%,rgba(17,24,39,1))]",
  ].join(" ");
}

function sideAccentClass(outcome: string) {
  if (outcome === "deal") return "bg-emerald-500";
  if (outcome === "sent") return "bg-[#ffbf00]";
  return "bg-red-500";
}

function getFilterCount(stats: HistoryStatsResponse | null, outcome: HistoryOutcome) {
  if (!stats) return 0;

  if (outcome === "all") return normalizeNumber(stats.total_jobs);
  if (outcome === "deal") return normalizeNumber(stats.deal_jobs);
  if (outcome === "sent") return normalizeNumber(stats.sent_jobs);
  return normalizeNumber(stats.not_sent_jobs);
}

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

function StatCard({
  icon,
  value,
  title,
  hint,
  tone,
}: {
  icon: ReactNode;
  value: string | number;
  title: string;
  hint: string;
  tone: "blue" | "yellow" | "red" | "green" | "violet";
}) {
  const styles =
    tone === "blue"
      ? {
          card:
            "border-blue-500/28 bg-[linear-gradient(180deg,rgba(30,64,175,0.32),rgba(17,24,39,0.92))]",
          icon: "bg-blue-500/20 text-blue-300",
        }
      : tone === "yellow"
        ? {
            card:
              "border-[#ffbf00]/28 bg-[linear-gradient(180deg,rgba(146,99,0,0.34),rgba(17,24,39,0.92))]",
            icon: "bg-[rgba(146,99,0,0.38)] text-[#ffbf00]",
          }
        : tone === "red"
          ? {
              card:
                "border-red-500/28 bg-[linear-gradient(180deg,rgba(127,29,29,0.36),rgba(17,24,39,0.92))]",
              icon: "bg-red-500/20 text-red-300",
            }
          : tone === "green"
            ? {
                card:
                  "border-emerald-500/28 bg-[linear-gradient(180deg,rgba(6,95,70,0.36),rgba(17,24,39,0.92))]",
                icon: "bg-emerald-500/20 text-emerald-300",
              }
            : {
                card:
                  "border-violet-500/28 bg-[linear-gradient(180deg,rgba(88,28,135,0.36),rgba(17,24,39,0.92))]",
                icon: "bg-violet-500/20 text-violet-300",
              };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
        styles.card
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            styles.icon
          )}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-[28px] font-semibold leading-none text-white">
            {value}
          </div>
          <div className="mt-2 text-sm font-semibold text-white">
            {title}
          </div>
          <div className="mt-3 text-xs text-white/55">
            {hint}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [loadingFirst, setLoadingFirst] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [period, setPeriod] = useState<HistoryPeriod>("30d");
  const [outcome, setOutcome] = useState<HistoryOutcome>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState<HistoryStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTitle, setDetailTitle] = useState<string>("Результаты запроса");
  const [detailSuppliers, setDetailSuppliers] = useState<Supplier[]>([]);
  const [detailJobId, setDetailJobId] = useState<number | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  const selectedFilterCount = useMemo(() => {
    if (outcome === "all") return total || getFilterCount(stats, "all");
    return getFilterCount(stats, outcome);
  }, [outcome, stats, total]);

  const totalJobs = normalizeNumber(stats?.total_jobs);
  const sentJobs = normalizeNumber(stats?.sent_jobs);
  const notSentJobs = normalizeNumber(stats?.not_sent_jobs);
  const dealJobs = normalizeNumber(stats?.deal_jobs);
  const emailsSentTotal = normalizeNumber(stats?.emails_sent_total);

  const canShowEmail = (emailSubject || "").trim() || (emailBody || "").trim();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const result = await getHistoryStats(period);
      setStats(result);
      setUpdatedAt(formatUpdatedAt());
    } catch (e) {
      toast({
        title: "Не удалось загрузить статистику",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setStatsLoading(false);
    }
  }, [period, toast]);

  const loadFirstPage = useCallback(async () => {
    setLoadingFirst(true);
    setItems([]);
    setOffset(0);
    setHasMore(true);

    try {
      const res = await listHistory({
        limit: PAGE_LIMIT,
        offset: 0,
        outcome,
        q: searchQuery.trim() || undefined,
      });

      const page = Array.isArray(res?.items) ? res.items : [];

      setItems(page);
      setTotal(normalizeNumber(res?.total));
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
  }, [outcome, searchQuery, toast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadFirstPage(), loadStats()]);
  }, [loadFirstPage, loadStats]);

  const loadMorePage = useCallback(async () => {
    if (!hasMore || loadingMore || loadingFirst) return;

    setLoadingMore(true);
    try {
      const res = await listHistory({
        limit: PAGE_LIMIT,
        offset,
        outcome,
        q: searchQuery.trim() || undefined,
      });

      const page = Array.isArray(res?.items) ? res.items : [];

      setItems((prev) => [...prev, ...page]);
      setOffset((prev) => prev + page.length);
      setTotal(normalizeNumber(res?.total));
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
  }, [hasMore, loadingMore, loadingFirst, offset, outcome, searchQuery, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadFirstPage().catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadFirstPage]);

  useEffect(() => {
    loadStats().catch(() => {});
  }, [loadStats]);

  async function openDetail(item: HistoryListItem) {
    const jid = item.id;

    setDetailJobId(jid);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailSuppliers([]);
    setDetailTitle(displayTitle(item));

    setEmailSubject("");
    setEmailBody("");

    try {
      const detail = await getHistoryDetail(jid);

      const subj =
        detail?.job?.email_subject ??
        item.email_subject ??
        `Запрос КП — ${item.query || ""}`.trim();

      const body = detail?.job?.email_body ?? "";

      setEmailSubject(typeof subj === "string" ? subj : "");
      setEmailBody(typeof body === "string" ? body : "");

      const createdAt = detail.job?.created_at
        ? new Date(detail.job.created_at)
        : new Date();

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
          quote_received: !!r?.quote_received,
          quote_received_at: r?.quote_received_at ? new Date(r.quote_received_at) : null,
reply_status: r?.reply_status || "no_reply",
quote_source: r?.quote_source || null,
quote_file_count: normalizeNumber(r?.quote_file_count),
last_reply_at: r?.last_reply_at ? new Date(r.last_reply_at) : null,
latest_reply: r?.latest_reply || null,
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

  async function handleToggleDeal(item: HistoryListItem, next: boolean) {
    const previousItems = items;

    setItems((current) =>
      current.map((x) =>
        x.id === item.id
          ? {
              ...x,
              deal_done: next,
              deal_done_at: next ? new Date().toISOString() : null,
              history_outcome: next
                ? "deal"
                : normalizeNumber(x.emails_sent) > 0
                  ? "sent"
                  : "not_sent",
            }
          : x
      )
    );

    try {
      const res = await setJobDealDone(item.id, next);

      setItems((current) =>
        current.map((x) =>
          x.id === item.id
            ? {
                ...x,
                deal_done: res.deal_done,
                deal_done_at: res.deal_done_at,
                history_outcome: res.history_outcome,
              }
            : x
        )
      );

      await loadStats();
    } catch (e) {
      setItems(previousItems);
      toast({
        title: "Не удалось сохранить отметку сделки",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  }

  const handleToggleQuote = useCallback(
    async (supplierId: string, backendResultId: number, next: boolean) => {
      const prevSuppliers = detailSuppliers;
      const prevSupplier = detailSuppliers.find((s) => s.id === supplierId);
      const wasReceived = Boolean(prevSupplier?.quote_received);

      const delta = wasReceived === next ? 0 : next ? 1 : -1;

      setDetailSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                quote_received: next,
                quote_received_at: next ? new Date() : null,
              }
            : s
        )
      );

      try {
        const res = await setQuoteReceived(backendResultId, next);

setDetailSuppliers((cur) =>
  cur.map((s) =>
    s.id === supplierId
      ? {
          ...s,
          quote_received: !!res.quote_received,
          quote_received_at: res.quote_received_at
            ? new Date(res.quote_received_at)
            : null,
          reply_status:
            res.reply_status ||
            (res.quote_received ? "quote_received" : "no_reply"),
          quote_source: res.quote_source || null,
          quote_file_count: normalizeNumber(res.quote_file_count),
          last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
        }
      : s
  )
);

        if (detailJobId && delta !== 0) {
          setItems((current) =>
            current.map((item) =>
              item.id === detailJobId
                ? {
                    ...item,
                    quotes_received_count: Math.max(
                      0,
                      normalizeNumber(item.quotes_received_count) + delta
                    ),
                  }
                : item
            )
          );
        }
      } catch (e) {
        setDetailSuppliers(prevSuppliers);

        toast({
          title: "Не удалось сохранить отметку КП",
          description: e instanceof Error ? e.message : "Ошибка",
          variant: "destructive",
        });
      }
    },
    [detailSuppliers, detailJobId, toast]
  );

const handleSetReplyStatus = useCallback(
  async (supplierId: string, backendResultId: number, status: ReplyStatus) => {
    const prevSuppliers = detailSuppliers;
    const prevSupplier = detailSuppliers.find((s) => s.id === supplierId);
    const wasReceived = Boolean(prevSupplier?.quote_received);
    const nextReceived = status === "quote_received";
    const delta = wasReceived === nextReceived ? 0 : nextReceived ? 1 : -1;

    setDetailSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              reply_status: status,
              quote_received: nextReceived,
              quote_received_at: nextReceived ? new Date() : null,
              quote_source: nextReceived ? "manual" : null,
            }
          : s
      )
    );

    try {
      const res = await updateResultReplyStatus(backendResultId, {
        status,
        quote_source: status === "quote_received" ? "manual" : null,
        comment: null,
      });

      setDetailSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                reply_status: res.reply_status || status,
                quote_received: !!res.quote_received,
                quote_received_at: res.quote_received_at
                  ? new Date(res.quote_received_at)
                  : null,
                quote_source: res.quote_source || null,
                quote_file_count: normalizeNumber(res.quote_file_count),
                last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
              }
            : s
        )
      );

      if (detailJobId && delta !== 0) {
        setItems((current) =>
          current.map((item) =>
            item.id === detailJobId
              ? {
                  ...item,
                  quotes_received_count: Math.max(
                    0,
                    normalizeNumber(item.quotes_received_count) + delta
                  ),
                }
              : item
          )
        );
      }
    } catch (e) {
      setDetailSuppliers(prevSuppliers);

      toast({
        title: "Не удалось сохранить статус ответа",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  },
  [detailSuppliers, detailJobId, toast]
);

const handleOpenQuoteFile = useCallback(
  async (supplierId: string, backendResultId: number) => {
    const tab = window.open("about:blank", "_blank");

    try {
      const replies = await getResultReplies(backendResultId);

      const attachments = (replies.items || [])
        .flatMap((reply) => reply.attachments || [])
        .filter((file) => typeof file.id === "number");

      if (!attachments.length) {
        throw new Error("Файл КП не найден. Попробуйте обновить историю.");
      }

      const file = attachments[0];
      const downloaded = await downloadQuoteFile(file.id);

      const url = URL.createObjectURL(downloaded.blob);

      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = downloaded.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (e) {
      if (tab && !tab.closed) {
        tab.close();
      }

      toast({
        title: "Не удалось открыть КП",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  },
  [toast]
);

const handleUploadQuoteFile = useCallback(
  async (supplierId: string, backendResultId: number, file: File) => {
    const prevSuppliers = detailSuppliers;
    const prevSupplier = detailSuppliers.find((s) => s.id === supplierId);
    const wasReceived = Boolean(prevSupplier?.quote_received);

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла КП — 20 МБ.",
        variant: "destructive",
      });
      return;
    }

    setDetailSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              reply_status: "quote_received",
              quote_received: true,
              quote_received_at: new Date(),
              quote_source: "attachment",
              quote_file_count: normalizeNumber(s.quote_file_count) + 1,
            }
          : s
      )
    );

    try {
      const res = await uploadQuoteFile(backendResultId, file);

      setDetailSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                reply_status: res.reply_status || "quote_received",
                quote_received: !!res.quote_received,
                quote_received_at: res.quote_received_at
                  ? new Date(res.quote_received_at)
                  : null,
                quote_source: res.quote_source || "attachment",
                quote_file_count: normalizeNumber(res.quote_file_count),
                last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
              }
            : s
        )
      );

      if (detailJobId && !wasReceived) {
        setItems((current) =>
          current.map((item) =>
            item.id === detailJobId
              ? {
                  ...item,
                  quotes_received_count: Math.max(
                    0,
                    normalizeNumber(item.quotes_received_count) + 1
                  ),
                }
              : item
          )
        );
      }

      toast({
        title: "КП загружено",
        description: file.name,
      });
    } catch (e) {
      setDetailSuppliers(prevSuppliers);

      toast({
        title: "Не удалось загрузить КП",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  },
  [detailSuppliers, detailJobId, toast]
);

  return (
    <div className="min-h-screen bg-background text-white">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
  to="/"
  className="
    mb-3 inline-flex h-10 items-center gap-2 rounded-md
    border border-[#2f3a4d]
    bg-[#151f2d]
    px-4
    text-sm font-semibold text-white
    transition
    hover:border-[#ffbf00]
    hover:bg-[#ffbf00]
    hover:text-[#2b2100]
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-[#ffbf00]/45
  "
>
  <ArrowLeft className="h-4 w-4" />
  Назад к поиску
</Link>

            <h1 className="text-3xl font-semibold text-white">
              История запросов
            </h1>

            <p className="mt-2 text-sm text-white/55">
              Запросы, отправки, КП и сделки по вашему аккаунту.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAll()}
            disabled={loadingFirst || statsLoading}
            className="
              h-10
              border-[#2f3a4d]
              bg-[#151f2d]
              text-white
              hover:border-[#ffbf00]
              hover:bg-[#ffbf00]
              hover:text-[#2b2100]
              disabled:opacity-50
            "
            title="Обновить"
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                loadingFirst || statsLoading ? "animate-spin" : ""
              )}
            />
            Обновить
          </Button>
        </div>

        <section className="rounded-2xl border border-[#2d4059] bg-[#111827] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                Моя статистика
              </h3>
              <BarChart3 className="h-4 w-4 text-white/45" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm transition",
                    period === p.value
                      ? "border-[#ffbf00] bg-[#ffbf00]/10 text-[#ffbf00]"
                      : "border-white/10 bg-background/45 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {p.label}
                </button>
              ))}

              <div className="ml-0 flex items-center gap-2 text-sm text-white/55 lg:ml-4">
                <RefreshCw className="h-3.5 w-3.5" />
                {updatedAt ? `Обновлено: ${updatedAt}` : "Обновление..."}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              value={statsLoading ? "…" : totalJobs}
              title={pluralizeRu(totalJobs, ["Запрос", "Запроса", "Запросов"])}
              hint="Всего запросов"
              tone="blue"
            />

            <StatCard
              icon={<Send className="h-5 w-5" />}
              value={statsLoading ? "…" : sentJobs}
              title="Отправлено"
              hint="С отправкой писем"
              tone="yellow"
            />

            <StatCard
              icon={<XCircle className="h-5 w-5" />}
              value={statsLoading ? "…" : notSentJobs}
              title="Без отправки"
              hint="Писем не отправлено"
              tone="red"
            />

            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              value={statsLoading ? "…" : dealJobs}
              title={pluralizeRu(dealJobs, ["Сделка", "Сделки", "Сделок"])}
              hint="Отмечено пользователем"
              tone="green"
            />

            <StatCard
              icon={<Mail className="h-5 w-5" />}
              value={statsLoading ? "…" : emailsSentTotal}
              title="Писем отправлено"
              hint="Всего писем поставщикам"
              tone="violet"
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-[#263142] bg-[#121a27] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <BarChart3 className="h-5 w-5 text-emerald-300" />
              <div className="text-sm font-semibold text-white">
                Конверсия отправка → сделка
              </div>
              <div className="text-xl font-semibold text-emerald-300">
                {statsLoading ? "…" : conversionLabel(stats?.deal_conversion_from_sent)}
              </div>
              <div className="text-sm text-white/55">
                {normalizeNumber(stats?.deal_jobs)} сделок из{" "}
                {normalizeNumber(stats?.sent_jobs)} запросов с отправкой
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((item) => {
              const active = outcome === item.value;
              const count =
                item.value === "all"
                  ? total || getFilterCount(stats, item.value)
                  : getFilterCount(stats, item.value);

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setOutcome(item.value)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition",
                    active
                      ? "border-[#ffbf00] bg-[#ffbf00]/10 text-[#ffbf00]"
                      : "border-white/10 bg-background/45 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.value === "deal"
                        ? "bg-emerald-500/22 text-emerald-300"
                        : item.value === "sent"
                          ? "bg-[#ffbf00]/22 text-[#ffbf00]"
                          : item.value === "not_sent"
                            ? "bg-red-500/22 text-red-300"
                            : "bg-blue-500/22 text-blue-300"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Поиск по теме запроса..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-white/10 bg-background/45 pl-9 text-white placeholder:text-white/35 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3 pb-8">
          {loadingFirst && items.length === 0 ? (
            <div className="rounded-xl border border-[#2f3a4d] bg-[#151f2d] py-10 text-center text-white/55">
              Загрузка истории…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-[#2f3a4d] bg-[#151f2d] py-10 text-center text-white/55">
              {searchQuery || outcome !== "all"
                ? "По выбранному фильтру ничего не найдено"
                : "История запросов пуста"}
            </div>
          ) : (
            items.map((item) => {
              const itemOutcome = item.history_outcome || "not_sent";
              const dealChecked = !!item.deal_done;

              return (
                <div
  key={item.id}
  className={cn(
    "relative min-h-[76px] overflow-hidden rounded-xl border p-4 transition select-text",
    rowClass(itemOutcome)
  )}
>
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full w-1.5",
                      sideAccentClass(itemOutcome)
                    )}
                  />

                  <div className="grid grid-cols-1 gap-3 pl-3 xl:grid-cols-[minmax(0,2.35fr)_56px_86px_86px_96px_82px_160px_175px] xl:items-center">
                    <div className="min-w-0">
  {/* 1 строка: тема письма */}
  <div
    className="truncate text-base font-semibold leading-5 text-white"
    title={displayTitle(item)}
  >
    {displayTitle(item)}
  </div>

  {/* 2 строка: дата, время, режим поиска */}
  <div className="mt-1 flex h-6 min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-sm text-white/55">
    <span className="shrink-0">
      {formatDateTime(item.created_at)}
    </span>

    <span className="shrink-0 text-white/25">•</span>

    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center rounded-md border px-2 text-[11px] font-semibold",
        searchModeBadgeClass(item.search_mode, item.provider)
      )}
      title="Режим поиска"
    >
      {searchModeLabel(item.search_mode, item.provider)}
    </span>
  </div>

  {/* 3 строка: наименование оборудования */}
  <div
    className="mt-1 truncate text-sm leading-5 text-white/60"
    title={displaySubtitle(item)}
  >
    {displaySubtitle(item)}
  </div>
</div>

                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail(item);
                        }}
                        className="
                          inline-flex h-11 w-11 items-center justify-center rounded-xl
                          border border-blue-500/28
                          bg-blue-500/20
                          text-blue-300
                          transition
                          hover:border-[#ffbf00]
                          hover:bg-[#ffbf00]
                          hover:text-[#2b2100]
                          focus:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#ffbf00]/45
                        "
                        title="Открыть запрос"
                        aria-label="Открыть запрос"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-white/55">
                      <Users className="h-4 w-4 text-white/70" />
                      <div>
                        <div className="font-semibold text-white">
                          {normalizeNumber(item.results_count)}
                        </div>
                        <div className="text-xs">результатов</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-white/55">
                      <Mail className="h-4 w-4" />
                      <div>
                        <div className="font-semibold text-white">
                          {normalizeNumber(item.emails_sent)}
                        </div>
                        <div className="text-xs">отправлено</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-white/55">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <div>
                        <div className="font-semibold text-white">
                          {getQuotesReceivedCount(item)}
                        </div>
                        <div className="text-xs">КП получено</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-white/55">
                      <AlertTriangle className="h-4 w-4" />
                      <div>
                        <div className="font-semibold text-white">
                          {normalizeNumber(item.emails_failed)}
                        </div>
                        <div className="text-xs">
                          {normalizeNumber(item.emails_failed) === 1
                            ? "ошибка"
                            : "ошибок"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold",
                          outcomeBadgeClass(itemOutcome)
                        )}
                      >
                        {outcomeLabel(itemOutcome)}

                        {itemOutcome === "deal" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : itemOutcome === "sent" ? (
                          <Send className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={dealChecked}
                        onCheckedChange={(checked) =>
                          handleToggleDeal(item, checked === true)
                        }
                        className="
                          h-5 w-5
                          border-[#4a5568]
                          data-[state=checked]:border-[#ffbf00]
                          data-[state=checked]:bg-[#ffbf00]
                          data-[state=checked]:text-[#2b2100]
                        "
                        aria-label="Сделка состоялась"
                      />
                      <span className="text-sm text-white/70">
                        Сделка состоялась
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {loadingMore && (
            <div className="py-4 text-center text-xs text-white/45">
              Загрузка…
            </div>
          )}

          {!loadingFirst && !loadingMore && hasMore && items.length > 0 && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => loadMorePage()}
                className="
                  border-[#2f3a4d]
                  bg-[#151f2d]
                  text-white
                  hover:border-[#ffbf00]
                  hover:bg-[#ffbf00]
                  hover:text-[#2b2100]
                "
              >
                Загрузить ещё
              </Button>
            </div>
          )}

          {!loadingFirst && !loadingMore && !hasMore && items.length > 0 && (
            <div className="py-3 text-center text-xs text-white/45">
              Показано {items.length} из {selectedFilterCount}
            </div>
          )}
        </div>
      </main>

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
                disabled={false}
                readOnly={true}
                onToggleQuote={handleToggleQuote}
                onSetReplyStatus={handleSetReplyStatus}
                onUploadQuoteFile={handleUploadQuoteFile}
                onOpenQuoteFile={handleOpenQuoteFile}
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEmailOpen(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}