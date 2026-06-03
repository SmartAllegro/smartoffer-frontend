import { apiFetch } from "./client";

export type BillingPlanItem = {
  code: string;
  name: string;
  requests_limit: number;
  price_rub: number;
  is_free: boolean;
  corporate_only: boolean;
  is_active: boolean;
};

export type BillingPlansResponse = {
  items: BillingPlanItem[];
};

export type BillingMe = {
  current_plan_code: string | null;
  current_plan_name: string | null;

  requests_limit: number;
  requests_used: number;
  requests_remaining: number;

  status: "active" | "exhausted" | "blocked" | "expired" | string;

  has_verified_email: boolean;
  verified_from_email: string | null;
  verified_domain: string | null;
  email_domain_type: "corporate" | "public" | "unknown" | string;

  free_eligible: boolean;
  free_already_granted: boolean;
  can_search: boolean;

  free_granted_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  expired_at: string | null;

  billing_source?: "personal" | "team_business" | string;
  billing_owner_user_id?: number | null;
  billing_owner_email?: string | null;
};

export async function fetchBillingPlans(): Promise<BillingPlansResponse> {
  return apiFetch<BillingPlansResponse>("/billing/plans", {
    method: "GET",
  });
}

export async function fetchBillingMe(): Promise<BillingMe> {
  return apiFetch<BillingMe>("/billing/me", {
    method: "GET",
  });
}