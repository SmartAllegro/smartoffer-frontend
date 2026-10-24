import { apiFetch } from "./client";

export type BenefitDecimal = number | string | null;
export interface BenefitIndexComponent {
  score: BenefitDecimal;
  max_score: number | string;
  status: "scored" | "unavailable";
  reason_codes: string[];
}
export interface BenefitIndexItem {
  result_id: number;
  status: "ready" | "preliminary";
  total_score: BenefitDecimal;
  product_match: BenefitIndexComponent;
  supply_coverage: BenefitIndexComponent;
  price: BenefitIndexComponent;
  payment: BenefitIndexComponent;
  delivery: BenefitIndexComponent;
  warranty: BenefitIndexComponent;
  commercial_completeness: BenefitIndexComponent;
  financial: BenefitIndexComponent;
  reason_codes: string[];
}
export interface BenefitIndexSuccess {
  ok: true;
  scoring_version: string;
  job_id: number;
  comparison_id: number;
  requires_fx: boolean;
  required_fx_currencies: string[];
  items: BenefitIndexItem[];
}
export interface BenefitIndexFailure {
  ok: false;
  state?: "not_enough_quotes" | "cache_invalid" | "cache_missing_or_stale";
  error_code?: string;
}
export type BenefitIndexResponse = BenefitIndexSuccess | BenefitIndexFailure;
export const getQuoteBenefitIndex = (jobId: number) =>
  apiFetch<BenefitIndexResponse>(`/ai/quote-comparison/${jobId}/benefit-index`);
export const calculateQuoteBenefitIndexFx = (jobId: number, fxRatesToRub: Record<string, string>) =>
  apiFetch<BenefitIndexResponse>(`/ai/quote-comparison/${jobId}/benefit-index`, {
    method: "POST", json: { fx_rates_to_rub: fxRatesToRub },
  });
