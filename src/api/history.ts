// src/api/history.ts
import { apiFetch } from "./client";

export type HistoryListItem = {
  id: number;
  query: string;
  provider: string;
  lang: string;
  time_ms: number;
  created_at: string;

  // агрегаты по email-рассылкам (если бэк их возвращает)
  results_count?: number;
  emails_sent?: number;
  emails_failed?: number;

  // тема последнего отправленного письма (если есть)
  email_subject?: string | null;
};

export type HistoryListResponse = {
  items: HistoryListItem[];
  total: number;
};

export type HistoryDetailResponse = {
  job: {
    id: number;
    query: string;
    provider: string;
    lang: string;
    time_ms: number;
    created_at: string;

    // текст отправленного письма (последняя рассылка по job_id)
    email_subject?: string | null;
    email_body?: string | null;
  };
  results: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    snippet: string;
    emails: string[];
    score: number;

    // статусы рассылки по адресам
    email_statuses?: Array<{
      email: string;
      status: "queued" | "sent" | "failed";
      last_error?: string | null;
      sent_at?: string | null;
    }>;

    // NEW: отметка КП
    quote_received?: boolean;
    quote_received_at?: string | null;
  }>;
};

export type QuoteToggleResponse = {
  ok: boolean;
  quote_received: boolean;
  quote_received_at: string | null;
};

/** Список истории */
export async function listHistory(
  limit = 50,
  offset = 0
): Promise<HistoryListResponse> {
  return apiFetch<HistoryListResponse>(`/history?limit=${limit}&offset=${offset}`, {
    method: "GET",
  });
}

/**
 * Детали по конкретному job_id
 * IMPORTANT: оставляем имя getHistoryDetail, потому что оно уже используется в HistoryModal.tsx
 */
export async function getHistoryDetail(jobId: number): Promise<HistoryDetailResponse> {
  return apiFetch<HistoryDetailResponse>(`/history/${jobId}`, {
    method: "GET",
  });
}

/** NEW: отметить/снять "КП получено" у результата поиска */
export async function setQuoteReceived(
  resultId: number,
  received: boolean
): Promise<QuoteToggleResponse> {
  return apiFetch<QuoteToggleResponse>(`/history/results/${resultId}/quote`, {
    method: "POST",
    json: { received },
  });
}