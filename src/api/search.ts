// src/api/search.ts
import { apiFetch } from "./client";
import { Supplier } from "@/shared/types/rfq";

type BackendResult = {
  id?: number | null;          // <-- важно
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  emails: string[];
  score: number;
};

type BackendResponse = {
  job_id?: number | null;      // <-- важно
  results: BackendResult[];
};

export async function searchSuppliers(
  query: string,
  requestId: string
): Promise<{ jobId: number | null; suppliers: Supplier[] }> {
  const response = await apiFetch<BackendResponse>("/search", {
    method: "POST",
    json: {
      query,
      lang: "ru",
      top_k: 20,
      enrich_emails: true,
      yandex_pages_cap: 5,
      ddg_pages_cap: 3,
    },
  });

  const jobId = typeof response.job_id === "number" ? response.job_id : null;

  const suppliers: Supplier[] = (response.results || []).map((item, index) => ({
    id: `${requestId}-${index}`,
    request_id: requestId,
    supplier_name: item.title || item.domain || "—",
    contact: item.emails?.[0] || "",
    source_url: item.url || "",
    selected: true,                 // <-- по умолчанию включено
    status: "found",
    created_at: new Date(),
    backend_result_id: typeof item.id === "number" ? item.id : undefined,
  }));

  return { jobId, suppliers };
}