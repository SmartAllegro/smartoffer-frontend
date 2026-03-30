import { apiFetch } from "./client";
import { Supplier } from "@/shared/types/rfq";

type BackendResult = {
  id?: number | null;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  emails: string[];
  score: number;
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

const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 36;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapResultsToSuppliers(results: BackendResult[], requestId: string): Supplier[] {
  return (results || []).map((item, index) => ({
    id: `${requestId}-${index}`,
    request_id: requestId,
    supplier_name: item.title || item.domain || "—",
    contact: item.emails?.[0] || "",
    source_url: item.url || "",
    selected: true,
    status: "found",
    created_at: new Date(),
    backend_result_id: typeof item.id === "number" ? item.id : undefined,
  }));
}

function normalizeApiError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Произошла ошибка");
  }

  const raw = error.message || "";
  const match = raw.match(/^API error \d+:\s*([\s\S]+)$/);

  if (!match) {
    return error;
  }

  try {
    const parsed = JSON.parse(match[1]);
    const detail = parsed?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return new Error(detail.trim());
    }

    if (detail && typeof detail === "object" && typeof detail.message === "string") {
      return new Error(detail.message);
    }
  } catch {
    // ignore JSON parse errors
  }

  return error;
}

async function submitSearch(query: string): Promise<SearchSubmitResponse> {
  return apiFetch<SearchSubmitResponse>("/search/submit", {
    method: "POST",
    json: {
      query,
      lang: "ru",
      top_k: 20,
      enrich_emails: true,
      yandex_pages_cap: 5,
    },
  });
}

async function getSearchJob(jobId: number): Promise<SearchJobStatusResponse> {
  return apiFetch<SearchJobStatusResponse>(`/search/jobs/${jobId}`, {
    method: "GET",
  });
}

export async function searchSuppliers(
  query: string,
  requestId: string
): Promise<{ jobId: number | null; suppliers: Supplier[]; noSuppliersFound: boolean }> {
  try {
    const submitted = await submitSearch(query);
    const jobId = typeof submitted.job_id === "number" ? submitted.job_id : null;

    if (!jobId) {
      throw new Error("Не удалось создать задачу поиска");
    }

    let lastStatus: SearchJobStatusResponse["status"] = submitted.status || "queued";

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      const job = await getSearchJob(jobId);
      lastStatus = job.status;

      if (job.status === "completed") {
        const suppliers = mapResultsToSuppliers(job.results || [], requestId);

        return {
          jobId,
          suppliers,
          noSuppliersFound: suppliers.length === 0,
        };
      }

      if (job.status === "failed") {
        throw new Error(job.error_message || "Поиск завершился с ошибкой");
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