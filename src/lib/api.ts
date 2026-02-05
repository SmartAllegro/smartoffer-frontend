// src/lib/api.ts
import { apiFetch } from "@/api/client";
import { Supplier } from "@/types/rfq";


/* =======================
   SEARCH SUPPLIERS
   ======================= */

export async function searchSuppliers(
  query: string,
  requestId: string
): Promise<Supplier[]> {
  const response = await apiFetch<{
    results: {
      title: string;
      url: string;
      domain: string;
      emails: string[];
      score: number;
    }[];
  }>("/search", {
    method: "POST",
    json: {
      query,
      lang: "ru",
      top_k: 10,
      enrich_emails: true,
    },
  });

  return response.results.map((item, index) => ({
    id: `${requestId}-${index}`,
    request_id: requestId,
    supplier_name: item.title,
    contact: item.emails?.[0] || "",
    source_url: item.url,
    selected: true,
    status: "found",
    score: item.score,
    created_at: new Date(),
  }));
}

/* =======================
   SEND RFQ (stub пока)
   ======================= */

export async function sendRFQ() {
  // заглушка, чтобы UI не падал
  return new Map();
}
