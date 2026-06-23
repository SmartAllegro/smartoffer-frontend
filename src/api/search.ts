import { apiFetch } from "./client";
import type { Supplier } from "@/shared/types/rfq";

export type SearchMode = "cis" | "international";

export type BackendResult = {
  id?: number | null;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  emails: string[];
  score: number;

  is_manual?: boolean;
  address_book_contact_id?: number | null;
};

type SearchSubmitResponse = {
  job_id: number;
  status: "queued" | "processing" | "completed" | "failed";
};

type SearchJobStatusResponse = {
  job_id: number;
  query: string;
  provider: string;
  lang: string;
  time_ms: number;
  created_at: string;
  status: "queued" | "processing" | "completed" | "failed";
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  results: BackendResult[];
};

export type AddSupplierPayload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  website?: string;
  note?: string;
  address_book_contact_id?: number;
  save_to_address_book?: boolean;
};

export type ManualSearchResultResponse = BackendResult & {
  id: number;
  is_manual: boolean;
  address_book_contact_id?: number | null;
  created: boolean;
  contact_saved: boolean;
};

const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 36;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapResultsToSuppliers(
  results: BackendResult[],
  requestId: string
): Supplier[] {
  return (results || []).map((item, index) => {
    const emails = Array.isArray(item.emails)
      ? item.emails.filter(
          (value) =>
            typeof value === "string" &&
            value.trim()
        )
      : [];

    const firstEmail = emails[0] || "";
    const hasEmail = Boolean(firstEmail);

    return {
      id:
        typeof item.id === "number"
          ? `result-${item.id}`
          : `${requestId}-${index}`,

      request_id: requestId,
      supplier_name:
        item.title ||
        item.domain ||
        firstEmail ||
        "—",

      contact: firstEmail,
      contact_status: hasEmail ? "email" : "site",
      contact_label: hasEmail
        ? firstEmail
        : "Контакт через сайт",

      source_url: item.url || "",
      selected: hasEmail,
      status: "found",
      created_at: new Date(),

      backend_result_id:
        typeof item.id === "number"
          ? item.id
          : undefined,

      is_manual: Boolean(item.is_manual),

      address_book_contact_id:
        item.address_book_contact_id ?? null,
    };
  });
}

function normalizeApiError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Произошла ошибка");
  }

  const raw = error.message || "";
  const match = raw.match(
    /^API error \d+:\s*([\s\S]+)$/
  );

  if (!match) {
    return error;
  }

  try {
    const parsed = JSON.parse(match[1]);
    const detail = parsed?.detail;

    if (
      typeof detail === "string" &&
      detail.trim()
    ) {
      return new Error(detail.trim());
    }

    if (
      detail &&
      typeof detail === "object" &&
      typeof detail.message === "string"
    ) {
      return new Error(detail.message);
    }
  } catch {
    // Ответ backend не является JSON.
  }

  return error;
}

async function submitSearch(
  query: string,
  searchMode: SearchMode = "cis"
): Promise<SearchSubmitResponse> {
  return apiFetch<SearchSubmitResponse>(
    "/search/submit",
    {
      method: "POST",
      json: {
        query,
        lang: "ru",
        top_k: 20,
        enrich_emails: true,
        yandex_pages_cap:
          searchMode === "international" ? 2 : 5,
        search_mode: searchMode,
      },
    }
  );
}

async function getSearchJob(
  jobId: number
): Promise<SearchJobStatusResponse> {
  return apiFetch<SearchJobStatusResponse>(
    `/search/jobs/${jobId}`,
    {
      method: "GET",
    }
  );
}

export async function addManualSearchResult(
  jobId: number,
  payload: AddSupplierPayload
): Promise<ManualSearchResultResponse> {
  try {
    return await apiFetch<ManualSearchResultResponse>(
      `/search/jobs/${jobId}/results/manual`,
      {
        method: "POST",
        json: payload,
      }
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function searchSuppliers(
  query: string,
  requestId: string,
  searchMode: SearchMode = "cis"
): Promise<{
  jobId: number | null;
  suppliers: Supplier[];
  noSuppliersFound: boolean;
}> {
  try {
    const submitted = await submitSearch(
      query,
      searchMode
    );

    const jobId =
      typeof submitted.job_id === "number"
        ? submitted.job_id
        : null;

    if (!jobId) {
      throw new Error(
        "Не удалось создать задачу поиска"
      );
    }

    let lastStatus:
      | SearchJobStatusResponse["status"]
      | undefined = submitted.status;

    for (
      let attempt = 0;
      attempt < MAX_POLLS;
      attempt++
    ) {
      const job = await getSearchJob(jobId);
      lastStatus = job.status;

      if (job.status === "completed") {
        const suppliers = mapResultsToSuppliers(
          job.results || [],
          requestId
        );

        return {
          jobId,
          suppliers,
          noSuppliersFound:
            suppliers.length === 0,
        };
      }

      if (job.status === "failed") {
        throw new Error(
          job.error_message ||
            "Поиск завершился с ошибкой"
        );
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(
      `Поиск выполняется дольше обычного (статус: ${lastStatus}). Он может завершиться позже — проверьте историю.`
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}