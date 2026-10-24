import { apiFetch } from "./client";
import type { QuoteDecimal, QuoteCurrency, QuoteOfferItem, QuotePaymentStage } from "./quoteAnalysis";

export interface QuoteScopeAssessment {
  result_id: number; scope_match: "full" | "partial" | "unclear";
  match_type: "exact" | "analog" | "mismatch" | "unclear";
  coverage_ratio: QuoteDecimal;
  notes: string[]; missing_items: string[]; extra_or_different_items: string[];
}
export interface QuoteRequestComparisonData {
  status: "analyzed" | "insufficient_data"; executive_summary: string;
  key_differences: string[]; commercial_terms_notes: string[]; financial_notes: string[];
  scope_assessments: QuoteScopeAssessment[];
  clarification_questions: string[]; confidence: "high" | "medium" | "low";
}
export interface QuoteSupplierFinancialContext {
  result_id: number; supplier_inn: string | null; available: boolean;
  company_name: string | null; legal_status: string | null; financial_year: number | null;
  local_tax_year: number | null; total_income_rub: number | null; total_expenses_rub: number | null;
  employee_count: number | null;
  revenue_rub: number | null; net_profit_rub: number | null; assets_rub: number | null;
  equity_rub: number | null; cash_rub: number | null; inventories_rub: number | null;
  accounts_receivable_rub: number | null; accounts_payable_rub: number | null;
  current_assets_rub: number | null; current_liabilities_rub: number | null;
  short_term_borrowings_rub: number | null; long_term_borrowings_rub: number | null;
}
export interface QuoteDealFinancialMetrics {
  result_id: number; working_capital_rub: number | null; current_ratio: QuoteDecimal;
  net_margin_percent: QuoteDecimal; equity_ratio_percent: QuoteDecimal;
  order_to_revenue_percent: QuoteDecimal; prepayment_amount_rub: QuoteDecimal;
}
export interface QuoteOfferFinancials {
  result_id: number; context: QuoteSupplierFinancialContext; metrics: QuoteDealFinancialMetrics;
}
export interface QuoteComparisonOffer {
  result_id: number; analysis_id: number; supplier_name: string | null; supplier_inn: string | null;
  total_amount: QuoteDecimal; currency: QuoteCurrency; vat_mode: "included" | "excluded" | "no_vat" | "unknown";
  vat_rate_percent: QuoteDecimal; prepayment_percent: QuoteDecimal;
  payment_stages: QuotePaymentStage[]; payment_terms: string | null;
  delivery_days_min: number | null; delivery_days_max: number | null;
  delivery_terms: string | null; availability: string | null; delivery_included: boolean | null;
  warranty_months: number | null; validity_terms: string | null;
  items: QuoteOfferItem[]; missing_terms: string[];
}
export interface QuoteComparisonSuccess {
  ok: true; comparison_id: number; job_id: number; provider: "deepseek"; model: string;
  prompt_version: string; cached: boolean; partial: boolean;
  ready_result_ids: number[]; pending_result_ids: number[]; excluded_result_ids: number[];
  offers: QuoteComparisonOffer[]; financial_contexts: QuoteOfferFinancials[];
  analysis: QuoteRequestComparisonData; warnings: string[];
}
export interface QuoteComparisonFailure {
  ok: false; state?: "not_enough_quotes" | "cache_invalid" | "cache_missing_or_stale";
  error_code?: string; job_id?: number; ready_result_ids?: number[]; pending_result_ids?: number[];
}
export type QuoteComparisonResponse = QuoteComparisonSuccess | QuoteComparisonFailure;
export const getQuoteComparison = (jobId: number) =>
  apiFetch<QuoteComparisonResponse>(`/ai/quote-comparison/${jobId}`);
export const createQuoteComparison = (jobId: number) =>
  apiFetch<QuoteComparisonResponse>(`/ai/quote-comparison/${jobId}`, { method: "POST" });
