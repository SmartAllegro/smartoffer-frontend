// src/api/history.ts
import { apiFetch } from "./client";

export type HistoryOutcome = "all" | "deal" | "sent" | "not_sent";
export type HistoryPeriod = "7d" | "30d" | "90d" | "all";

export type HistoryListItem = {
  id: number;
  query: string;
  provider: string;
  lang: string;
  time_ms: number;
  created_at: string;

  results_count: number;
  email_jobs_count: number;
  emails_sent: number;
  emails_failed: number;
  quotes_received_count?: number;

  status: string;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;

  email_subject?: string | null;

  deal_done: boolean;
  deal_done_at?: string | null;

  history_outcome: "deal" | "sent" | "not_sent" | string;
};

export type HistoryListResponse = {
  items: HistoryListItem[];
  total: number;
};

export type HistoryStatsResponse = {
  period: HistoryPeriod | string;

  total_jobs: number;
  deal_jobs: number;
  sent_jobs: number;
  not_sent_jobs: number;

  email_jobs_total: number;
  emails_sent_total: number;
  emails_failed_total: number;

  deal_conversion_from_sent: number | null;
};

export type HistoryDetailResponse = {
  job: {
    id: number;
    query: string;
    provider: string;
    lang: string;
    time_ms: number;
    created_at: string;

    status: string;
    error_message?: string | null;
    started_at?: string | null;
    finished_at?: string | null;

    email_subject?: string | null;
    email_body?: string | null;

    deal_done: boolean;
    deal_done_at?: string | null;
    history_outcome: "deal" | "sent" | "not_sent" | string;
  };

  results: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    snippet: string;
    emails: string[];
    score: number;

    email_statuses?: Array<{
      email: string;
      status: "queued" | "sent" | "failed";
      last_error?: string | null;
      sent_at?: string | null;
    }>;

    quote_received?: boolean;
    quote_received_at?: string | null;
  }>;
};

export type QuoteToggleResponse = {
  ok: boolean;
  quote_received: boolean;
  quote_received_at: string | null;
};

export type DealToggleResponse = {
  ok: boolean;
  deal_done: boolean;
  deal_done_at: string | null;
  history_outcome: "deal" | "sent" | "not_sent" | string;
};

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (!str) continue;
    search.set(key, str);
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Список истории с backend-фильтром */
export async function listHistory(
  params: {
    limit?: number;
    offset?: number;
    outcome?: HistoryOutcome;
    q?: string;
  } = {}
): Promise<HistoryListResponse> {
  const qs = buildQuery({
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    outcome: params.outcome ?? "all",
    q: params.q,
  });

  return apiFetch<HistoryListResponse>(`/history${qs}`, {
    method: "GET",
  });
}

/** Статистика истории текущего пользователя */
export async function getHistoryStats(
  period: HistoryPeriod = "30d"
): Promise<HistoryStatsResponse> {
  const qs = buildQuery({ period });

  return apiFetch<HistoryStatsResponse>(`/history/stats${qs}`, {
    method: "GET",
  });
}

/** Детали по конкретному job_id */
export async function getHistoryDetail(jobId: number): Promise<HistoryDetailResponse> {
  return apiFetch<HistoryDetailResponse>(`/history/${jobId}`, {
    method: "GET",
  });
}

/** Отметить/снять "КП получено" у результата поиска */
export async function setQuoteReceived(
  resultId: number,
  received: boolean
): Promise<QuoteToggleResponse> {
  return apiFetch<QuoteToggleResponse>(`/history/results/${resultId}/quote`, {
    method: "POST",
    json: { received },
  });
}

/** Отметить/снять "Сделка состоялась" у всего запроса */
export async function setJobDealDone(
  jobId: number,
  dealDone: boolean
): Promise<DealToggleResponse> {
  return apiFetch<DealToggleResponse>(`/history/jobs/${jobId}/deal`, {
    method: "POST",
    json: { deal_done: dealDone },
  });
}