import { apiFetch } from "./client";

export type QuoteDecimal = number | string | null;
export type QuoteConfidence = "high" | "medium" | "low";
export type QuoteCurrency = "RUB" | "USD" | "EUR" | "CNY" | "OTHER" | "UNKNOWN";
export interface QuoteOfferItem {
  description: string; manufacturer: string | null; model: string | null;
  quantity: QuoteDecimal; unit: string | null; unit_price: QuoteDecimal;
  total_price: QuoteDecimal; currency: QuoteCurrency;
}
export type PaymentTiming = "advance" | "before_shipment" | "on_shipment" | "on_delivery" |
  "after_delivery" | "deferred" | "on_readiness" | "other" | "unknown";
export interface QuotePaymentStage {
  percent: QuoteDecimal; timing: PaymentTiming; delay_days: number | null;
  description: string | null; source_refs: string[];
}
export interface QuoteDocumentParty {
  name: string | null; inn: string | null;
  role: "supplier" | "seller" | "recipient" | "buyer" | "payer" | "customer" |
    "consignee" | "shipper" | "other" | "unknown";
  confidence: QuoteConfidence; source_refs: string[];
}
export interface QuoteEvidence { field: string; source_refs: string[] }
export interface QuoteAnalysisData {
  status: "analyzed" | "insufficient_data"; summary: string; items: QuoteOfferItem[];
  total_amount: QuoteDecimal; currency: QuoteCurrency;
  vat_mode: "included" | "excluded" | "no_vat" | "unknown"; vat_rate_percent: QuoteDecimal;
  prepayment_percent: QuoteDecimal; postpayment_percent: QuoteDecimal;
  payment_terms: string | null; payment_delay_days: number | null; payment_stages: QuotePaymentStage[];
  delivery_terms: string | null; delivery_included: boolean | null;
  delivery_days_min: number | null; delivery_days_max: number | null; availability: string | null;
  warranty_terms: string | null; warranty_months: number | null;
  offer_number: string | null; offer_date: string | null; valid_until: string | null; validity_terms: string | null;
  deviations: string[]; missing_terms: string[]; confidence: QuoteConfidence; evidence: QuoteEvidence[];
  parties: QuoteDocumentParty[]; supplier_name: string | null; supplier_inn: string | null;
  supplier_inn_confidence: QuoteConfidence | "unknown"; supplier_inn_source_refs: string[];
}
export interface SupplierInnUpdate {
  status: "applied" | "unchanged" | "conflict" | "not_found" | "ambiguous";
  detected_inn: string | null; current_inn: string | null;
}
export interface QuoteAnalysisSuccess {
  ok: true; analysis_id: number; reply_id: number; result_id: number;
  provider: "deepseek"; model: string; prompt_version: string; cached: boolean;
  analysis: QuoteAnalysisData; warnings: string[]; supplier_inn_update: SupplierInnUpdate;
}
export interface QuoteAnalysisFailure {
  ok: false; state?: "no_quote" | "cache_missing_or_stale" | "cache_invalid";
  error_code?: string; reply_id?: number; result_id?: number; cached?: false;
}
export type QuoteAnalysisResponse = QuoteAnalysisSuccess | QuoteAnalysisFailure;
export const getResultQuoteAnalysis = (resultId: number) =>
  apiFetch<QuoteAnalysisResponse>(`/ai/quote-analysis/result/${resultId}`);
export const createResultQuoteAnalysis = (resultId: number) =>
  apiFetch<QuoteAnalysisResponse>(`/ai/quote-analysis/result/${resultId}`, { method: "POST" });
export const getQuoteAnalysisSource = (analysisId: number, sourceRef: string) =>
  apiFetch<{ source_ref: string; text: string }>(`/ai/quote-analysis/${analysisId}/source?source_ref=${encodeURIComponent(sourceRef)}`);
