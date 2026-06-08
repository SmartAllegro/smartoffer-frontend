// src/api/history.ts
import { apiFetch } from "./client";

export type HistoryOutcome = "all" | "deal" | "sent" | "not_sent";
export type HistoryPeriod = "7d" | "30d" | "90d" | "all";

export type ReplyStatus =
  | "no_reply"
  | "in_progress"
  | "quote_received"
  | "clarification_requested"
  | "declined"
  | "manual_review";

export type QuoteSource = "manual" | "text" | "attachment" | "link";

export type HistoryListItem = {
  id: number;
  query: string;
  provider: string;
  lang: string;
  search_mode?: "cis" | "international" | string | null;
  time_ms: number;
  created_at: string;
 
  actor_user_id?: number | null;
  actor_email?: string | null;
  actor_name?: string | null;

  results_count: number;
  email_jobs_count: number;
  emails_sent: number;
  emails_failed: number;
  quotes_received_count?: number;
  replies_count?: number;
  unread_replies_count?: number;
  status: string;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;

  email_subject?: string | null;

  deal_done: boolean;
  deal_done_at?: string | null;
  delivery_date?: string | null;
  delivery_done?: boolean;
  delivery_done_at?: string | null;
  history_outcome: "deal" | "sent" | "not_sent" | string;
};

export type HistoryListResponse = {
  items: HistoryListItem[];
  total: number;
};

export type DeliveryNoteItem = {
  date: string;
  body: string;
  updated_at?: string | null;
};

export type DeliveryNotesResponse = {
  items: DeliveryNoteItem[];
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

export type EmailStatusItem = {
  email: string;
  status: "queued" | "sent" | "failed" | string;
  last_error?: string | null;
  sent_at?: string | null;
};

export type ReplyAttachmentItem = {
  id: number;
  original_filename: string;
  content_type?: string | null;
  size_bytes: number;
  detected_type: string;
  uploaded_at: string;
};

export type MarkJobRepliesReadResponse = {
  ok: boolean;
  job_id: number;
  marked_count: number;
  unread_replies_count: number;
};

export type MarkResultRepliesReadResponse = {
  ok: boolean;
  result_id: number;
  marked_count: number;
  unread_supplier_replies_count: number;
};

export type SupplierReplyItem = {
  id: number;
  source: "manual" | "inbound_email" | "system" | string;
  direction?: "supplier" | "user" | "system" | string;
  message_type?: "reply" | "quote" | "invoice" | "clarification" | "decline" | "manual_status" | string;
  affects_result_status?: boolean;
  status: ReplyStatus | string;
  quote_source?: QuoteSource | string | null;

  subject?: string | null;
  body_text?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  received_at?: string | null;

  classification_status?: string | null;
  classification_confidence?: number | null;
  classification_reason?: string | null;

  is_auto_reply: boolean;
  is_quote: boolean;
  is_decline: boolean;
  needs_clarification: boolean;
  requires_manual_review: boolean;

  created_at: string;
  attachments: ReplyAttachmentItem[];
};

export type SupplierRepliesResponse = {
  items: SupplierReplyItem[];
};

export type HistoryDetailResult = {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  emails: string[];
  score: number;
  supplier_inn?: string | null;
  supplier_inn_updated_at?: string | null;

  email_statuses?: EmailStatusItem[];

  quote_received?: boolean;
  quote_received_at?: string | null;

  reply_status?: ReplyStatus | string;
  quote_source?: QuoteSource | string | null;
  quote_file_count?: number;

  supplier_replies_count?: number;
  unread_supplier_replies_count?: number;

  last_reply_at?: string | null;
  latest_reply?: SupplierReplyItem | null;
};

export type SupplierInnUpdateResponse = {
  ok: boolean;
  result_id: number;
  supplier_inn?: string | null;
  supplier_inn_updated_at?: string | null;
};

export async function updateResultSupplierInn(
  resultId: number,
  supplierInn: string | null
): Promise<SupplierInnUpdateResponse> {
  return apiFetch<SupplierInnUpdateResponse>(
    `/history/results/${resultId}/inn`,
    {
      method: "POST",
      json: {
        supplier_inn: supplierInn,
      },
    }
  );
}

export type HistoryDetailResponse = {
  job: {
    id: number;
    query: string;
    provider: string;
    lang: string;
    search_mode?: "cis" | "international" | string | null;
    time_ms: number;
    created_at: string;

    actor_user_id?: number | null;
    actor_email?: string | null;
    actor_name?: string | null;

    status: string;
    error_message?: string | null;
    started_at?: string | null;
    finished_at?: string | null;

    email_subject?: string | null;
    email_body?: string | null;

    deal_done: boolean;
    deal_done_at?: string | null;
    delivery_date?: string | null;
    delivery_done?: boolean;
    delivery_done_at?: string | null;
    history_outcome: "deal" | "sent" | "not_sent" | string;
  };

  results: HistoryDetailResult[];
};

export type QuoteToggleResponse = {
  ok: boolean;
  quote_received: boolean;
  quote_received_at: string | null;

  reply_status?: ReplyStatus | string;
  quote_source?: QuoteSource | string | null;
  quote_file_count?: number;
  last_reply_at?: string | null;
};

export type ReplyStatusUpdateResponse = {
  ok: boolean;
  result_id: number;
  reply_status: ReplyStatus | string;
  quote_received: boolean;
  quote_received_at: string | null;
  quote_source?: QuoteSource | string | null;
  quote_file_count: number;
  last_reply_at?: string | null;
};

export type QuoteFileDeleteResponse = {
  ok: boolean;
  file_id: number;
  result_id: number;
  quote_file_count: number;
  quote_received: boolean;
  quote_received_at: string | null;
  reply_status: ReplyStatus | string;
  quote_source?: QuoteSource | string | null;
};

export type DealToggleResponse = {
  ok: boolean;
  deal_done: boolean;
  deal_done_at: string | null;
  delivery_date?: string | null;
  history_outcome: "deal" | "sent" | "not_sent" | string;
};

export type DeliveryToggleResponse = {
  ok: boolean;
  delivery_done: boolean;
  delivery_done_at: string | null;
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
    period?: HistoryPeriod;
    q?: string;
  } = {}
): Promise<HistoryListResponse> {
  const qs = buildQuery({
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    outcome: params.outcome ?? "all",
    period: params.period ?? "30d",
    q: params.q,
  });

  return apiFetch<HistoryListResponse>(`/history${qs}`, {
    method: "GET",
  });
}

export async function listHistoryNotes(
  params: {
    note_date?: string | null;
  } = {}
): Promise<DeliveryNotesResponse> {
  const qs = buildQuery({
    note_date: params.note_date,
  });

  return apiFetch<DeliveryNotesResponse>(`/history/notes${qs}`, {
    method: "GET",
  });
}

export async function saveHistoryNote(payload: {
  date: string;
  body: string;
}): Promise<DeliveryNoteItem> {
  return apiFetch<DeliveryNoteItem>("/history/notes", {
    method: "POST",
    json: payload,
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

/** Отметить/снять "КП получено" у результата поиска — старый совместимый endpoint */
export async function setQuoteReceived(
  resultId: number,
  received: boolean
): Promise<QuoteToggleResponse> {
  return apiFetch<QuoteToggleResponse>(`/history/results/${resultId}/quote`, {
    method: "POST",
    json: { received },
  });
}

/** Новый endpoint: ручная классификация ответа поставщика */
export async function updateResultReplyStatus(
  resultId: number,
  payload: {
    status: ReplyStatus;
    quote_source?: QuoteSource | null;
    comment?: string | null;
  }
): Promise<ReplyStatusUpdateResponse> {
  return apiFetch<ReplyStatusUpdateResponse>(
    `/history/results/${resultId}/reply-status`,
    {
      method: "POST",
      json: payload,
    }
  );
}

/** Получить журнал ответов/ручных статусов по поставщику */
export async function getResultReplies(
  resultId: number
): Promise<SupplierRepliesResponse> {
  return apiFetch<SupplierRepliesResponse>(
    `/history/results/${resultId}/replies`,
    {
      method: "GET",
    }
  );
}

/** Загрузить файл КП к конкретному поставщику */
export async function uploadQuoteFile(
  resultId: number,
  file: File
): Promise<ReplyStatusUpdateResponse> {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<ReplyStatusUpdateResponse>(
    `/history/results/${resultId}/quote-files`,
    {
      method: "POST",
      body: form,
    }
  );
}

/** Скачать файл КП */
export function quoteFileDownloadUrl(fileId: number): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Create .env.local with VITE_API_BASE_URL=http://127.0.0.1:10000"
    );
  }

  return `${baseUrl}/history/quote-files/${fileId}/download`;
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("SMARTOFFER_AUTH_TOKEN");
  } catch {
    return null;
  }
}

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
    } catch {
      return utf8Match[1].replace(/"/g, "");
    }
  }

  const regularMatch = value.match(/filename="?([^"]+)"?/i);
  if (regularMatch?.[1]) {
    return regularMatch[1].trim();
  }

  return null;
}

export async function downloadQuoteFile(fileId: number): Promise<{
  blob: Blob;
  filename: string;
  contentType: string;
}> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Create .env.local with VITE_API_BASE_URL=http://127.0.0.1:10000"
    );
  }

  const headers: HeadersInit = {};
  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${baseUrl}/history/quote-files/${fileId}/download`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Не удалось открыть файл КП: ${response.status}${text ? ` ${text}` : ""}`
    );
  }

  const blob = await response.blob();

  return {
    blob,
    filename:
      filenameFromContentDisposition(response.headers.get("content-disposition")) ||
      `quote-file-${fileId}`,
    contentType:
      response.headers.get("content-type") ||
      blob.type ||
      "application/octet-stream",
  };
}

/** Удалить файл КП */
export async function deleteQuoteFile(fileId: number): Promise<QuoteFileDeleteResponse> {
  return apiFetch<QuoteFileDeleteResponse>(`/history/quote-files/${fileId}`, {
    method: "DELETE",
  });
}

/** Отметить/снять "Сделка состоялась" у всего запроса */
export async function setJobDealDone(
  jobId: number,
  payload: {
    deal_done: boolean;
    delivery_date?: string | null;
  }
): Promise<DealToggleResponse> {
  return apiFetch<DealToggleResponse>(`/history/jobs/${jobId}/deal`, {
    method: "POST",
    json: payload,
  });
}

export async function setJobDeliveryDone(
  jobId: number,
  deliveryDone: boolean
): Promise<DeliveryToggleResponse> {
  return apiFetch<DeliveryToggleResponse>(`/history/jobs/${jobId}/delivery`, {
    method: "POST",
    json: { delivery_done: deliveryDone },
  });
}

export async function markJobRepliesRead(
  jobId: number
): Promise<MarkJobRepliesReadResponse> {
  return apiFetch<MarkJobRepliesReadResponse>(
    `/history/jobs/${jobId}/replies/read`,
    {
      method: "POST",
    }
  );
}

export async function markResultRepliesRead(
  resultId: number
): Promise<MarkResultRepliesReadResponse> {
  return apiFetch<MarkResultRepliesReadResponse>(
    `/history/results/${resultId}/replies/read`,
    {
      method: "POST",
    }
  );
}  