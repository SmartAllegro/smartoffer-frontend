import { apiFetch } from "@/api/client";
import { getTenant } from "@/shared/utils/tenant";

export type SupplierRow = {
  name: string;
  email?: string;
  website?: string;
  status?: "found" | "sent" | "error";
  errorReason?: string;
};

export type SearchResponse = {
  suppliers: SupplierRow[];
};

export async function searchSuppliers(query: string): Promise<SearchResponse> {
  const tenant = getTenant();
  // подстрой путь под свой бэкенд
  return apiFetch<SearchResponse>(`/search?tenant=${encodeURIComponent(tenant)}&q=${encodeURIComponent(query)}`);
}
