import { apiFetch } from "./client";

export type SupplierResult = {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  emails: string[];
  score: number;
};

export type SearchResponse = {
  query: string;
  provider: string;
  results: SupplierResult[];
  meta: {
    count: number;
    lang: string;
    time_ms: number;
    provider_chain: string[];
    pages_scanned: Record<string, number>;
    page_caps: Record<string, number>;
  };
};

export async function searchSuppliers(query: string): Promise<SearchResponse> {
  return apiFetch<SearchResponse>("/search", {
    method: "POST",
    json: { query, lang: "ru" },
  });
}
