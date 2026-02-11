// src/api/search.ts
import { apiFetch } from "./client";
import { Supplier } from "@/shared/types/rfq";

type BackendResult = {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  emails: string[];
  score: number;
};

type BackendResponse = {
  results: BackendResult[];
};

export async function searchSuppliers(query: string, requestId: string): Promise<Supplier[]> {
  const response = await apiFetch<BackendResponse>("/search", {
    method: "POST",
    json: {
      query,
      lang: "ru",
      top_k: 10,
      enrich_emails: true,
    },
  });

  return (response.results || []).map((item, index) => ({
    id: `${requestId}-${index}`,
    request_id: requestId,
    supplier_name: item.title || item.domain || "—",
    contact: item.emails?.[0] || "",
    source_url: item.url || "",
    selected: false,
    status: "found",
  }));
}
