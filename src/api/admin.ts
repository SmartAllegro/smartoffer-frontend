import { apiFetch, ApiError } from "./client";

export const ADMIN_MFA_EVENT = "smartoffer:admin-mfa-required";
export type AdminMfaStatus = {
  required: boolean; verified: boolean; provisioned: boolean;
  phone_masked: string | null; expires_at: string | null;
  dev_mfa_bypass?: boolean;
};
export const getAdminMfaStatus = () => apiFetch<AdminMfaStatus>("/admin/mfa/status");
export type AdminMfaState = "waiting" | "processing" | "sms_required" | "verified" | "denied" | "expired" | "error";
export type AdminMfaResult = {ok: boolean; state: AdminMfaState};
export const sendAdminMfa = (signal?: AbortSignal) => apiFetch<AdminMfaResult & {
  phone_masked: string; expires_in: number; challenge_id: string;
}>("/admin/mfa/send", {method: "POST", json: {}, signal});
export const pollAdminMfa = (challenge_id: string, signal?: AbortSignal) =>
  apiFetch<AdminMfaResult>("/admin/mfa/challenge", {method: "POST", json: {challenge_id}, signal});
export const verifyAdminMfa = (code: string, challenge_id: string, signal?: AbortSignal) =>
  apiFetch<AdminMfaResult>("/admin/mfa/verify", {method: "POST", json: {code, challenge_id}, signal});

async function adminFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  try { return await apiFetch<T>(path, options); }
  catch (error) {
    const detail = error instanceof ApiError ? (error.body as {detail?: string})?.detail : undefined;
    if (error instanceof ApiError && error.status === 428 &&
        (detail === "admin_mfa_required" || detail === "admin_step_up_required")) {
      window.dispatchEvent(new CustomEvent(ADMIN_MFA_EVENT, {detail}));
    }
    // No mutation replay. The user confirms the original action again.
    throw error;
  }
}

export type AdminMeResponse = {
  user_id: number;
  email: string;
  is_admin: boolean;
  role: string;
  permissions: string[];
};

export type AdminDashboardPeriod = "7d" | "30d" | "90d" | "all";

export type AdminSeriesPoint = { bucket_start: string; count: number; amount_rub: number };
export type AdminPlanCount = { plan_code: string; count: number };
export type AdminAnalyticsResponse = {
  period: AdminDashboardPeriod; since: string | null; until: string; generated_at: string;
  timezone: "UTC"; bucket: "day" | "month"; revenue_time_basis: "payment_order_created_at";
  registrations: number; previous_registrations: number | null; registration_change_pct: number | null;
  registration_series: AdminSeriesPoint[]; revenue_series: AdminSeriesPoint[];
  activity: { registered_users: number; users_with_search_ever: number; active_search_users: number;
    search_jobs: number; searches_completed: number; searches_failed: number;
    emails_sent: number; emails_unsent: number };
  funnel: { key: "registered" | "searched" | "emailed" | "paid"; users: number;
    conversion_from_previous_pct: number | null }[];
  commercial: { confirmed_orders: number; revenue_rub: number; paying_users: number;
    active_paid_plan_users: number; payment_errors: number;
    paid_orders_by_plan: AdminPlanCount[]; current_plan_assignments: AdminPlanCount[] };
};
export type AdminPaymentListItem = { id: number; created_at: string; user_id: number; user_email: string;
  amount_rub: number; plan_code: string; status: string; provider_order_id: string; provider: string };
export type AdminPaymentListResponse = { items: AdminPaymentListItem[]; total: number; limit: number;
  offset: number; period: AdminDashboardPeriod; since: string | null; until: string;
  generated_at: string; timezone: "UTC" };
export type AdminPaymentsParams = { period: AdminDashboardPeriod; status?: string; plan_code?: string;
  q?: string; limit?: number; offset?: number };

export type AdminDashboardResponse = {
  period: AdminDashboardPeriod;
  since: string | null;
  users_total: number;
  users_deleted: number;
  registrations_recent: number;
  searches_recent: number;
  searches_by_status: Record<string, number>;
  emails_sent: number;
  emails_failed: number;
  emails_queued: number;
  payments_confirmed: number;
  revenue_rub: number;
  smtp_configured: number;
  smtp_verified: number;
  imap_enabled: number;
  mail_sync_errors: number;
};

export type AdminMonitorState = "healthy" | "warning" | "critical" | "unknown";
export type AdminMonitorComponent = {id:string; state:AdminMonitorState; metric:string|null;
  observed_at:string|null; stale:boolean; issue:string|null};
export type AdminMonitorQueue = {id:string; state:AdminMonitorState; pending:number|null;
  started:number|null; failed:number|null; workers_registered:number|null;
  workers_active:number|null; oldest_pending_seconds:number|null; observed_at:string|null;
  stale:boolean; issue:string|null};
export type AdminMonitorSummaryResponse = {generated_at:string; components:AdminMonitorComponent[];
  queues:AdminMonitorQueue[]; postgres_latency_ms:number|null; postgres_connections:number|null;
  postgres_database_bytes:number|null; redis_latency_ms:number|null; redis_used_memory_bytes:number|null;
  search_jobs_by_status:Record<string,number>|null; mail_sync_failed_attempts_24h:number|null;
  mail_sync_unique_failed_states_24h:number|null;
  vm:{id:string; state:AdminMonitorState; observed_at:string|null; stale:boolean; issue:string|null;
    cpu_pct:number|null; ram_pct:number|null;
    free_disk_bytes:number|null; docker_state:string|null; backup_confirmed_at:string|null;
    backup_age_seconds:number|null; integrity_state:AdminMonitorState; retention_state:AdminMonitorState}};
export const getAdminMonitoringSummary = (signal?:AbortSignal) =>
  adminFetch<AdminMonitorSummaryResponse>("/admin/monitoring/summary", {signal});

/** B3A contract only. No history endpoint exists until durable storage is approved. */
export type AdminAuditCategory = "admin_action" | "authentication" | "security" | "system" | "payment" | "mail_sync";
export type AdminAuditEvent = {event_id:string; occurred_at:string; category:AdminAuditCategory;
  event_type:string; severity:"info" | "warning" | "critical"; actor_id:number|"system"|null;
  target_type:"user" | "admin_session" | "service" | "payment" | "mail_sync" | null; target_id:number|null;
  outcome:"success" | "failure" | "denied"; request_id:string|null;
  details:{plan_code?:string;reset_usage?:boolean;reason?:string}};
export type AdminAuditPage = {items:AdminAuditEvent[];total:number;limit:number;offset:number;
  generated_at:string};

export type AdminBillingSummary = {
  plan_code: string | null;
  plan_name: string | null;
  status: string;
  requests_limit: number;
  requests_used: number;
  requests_remaining: number;
  activated_at: string | null;
  expires_at: string | null;
  expired_at: string | null;
};

export type AdminUserListItem = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  purge_after: string | null;
  searches_count: number;
  last_search_at: string | null;
  has_smtp: boolean;
  smtp_verified: boolean;
  billing_plan_code: string | null;
  billing_plan_name: string | null;
  billing_status: string;
  requests_used: number;
  requests_limit: number;
  requests_remaining: number;
};

export type AdminUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
  no_searches?: boolean;
  has_smtp?: boolean;
  include_deleted?: boolean;
};

export type AdminUsersResponse = {
  items: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminProfile = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  purge_after: string | null;
};

export type AdminSmtpInfo = {
  configured: boolean;
  provider: string | null;
  from_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_security: string | null;
  smtp_username: string | null;
  is_verified: boolean;
  verified_at: string | null;
  last_verified_error: string | null;
};

export type AdminMailSyncStateInfo = {
  folder: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  next_sync_at: string | null;
  consecutive_errors: number;
  disabled_until: string | null;
  priority: number;
};

export type AdminImapInfo = {
  configured: boolean;
  enabled: boolean;
  verified: boolean;
  provider: string | null;
  from_email: string | null;
  imap_host: string | null;
  imap_port: number | null;
  imap_security: string | null;
  inbox_folder: string | null;
  sent_folder: string | null;
  sync_inbox_enabled: boolean;
  sync_sent_enabled: boolean;
  verified_at: string | null;
  last_verified_error: string | null;
  consent_accepted_at: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  sync_states: AdminMailSyncStateInfo[];
};

export type AdminUserStatistics = {
  searches_count: number;
  email_jobs_count: number;
  emails_sent: number;
  emails_failed: number;
  supplier_replies_count: number;
  quotes_received_count: number;
};

export type AdminOrganizationInfo = {
  id: number;
  name: string;
  status: string;
  owner_user_id: number;
  created_at: string;
};

export type AdminMembershipInfo = {
  id: number;
  organization_id: number;
  organization_name: string | null;
  role: string;
  status: string;
  email: string;
  accepted_at: string | null;
  created_at: string;
};

export type AdminTeamInfo = {
  owned_organizations: AdminOrganizationInfo[];
  memberships: AdminMembershipInfo[];
};

export type AdminRecentSearchItem = {
  id: number;
  query: string;
  provider: string;
  lang: string;
  search_mode: string;
  status: string;
  time_ms: number;
  results_count: number;
  emails_sent: number;
  emails_failed: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

export type AdminRecentPaymentItem = {
  id: number;
  provider: string;
  plan_code: string;
  preferred_method: string | null;
  amount_rub: number;
  status: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  provider_status: string | null;
  error_code: string | null;
  error_message: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserDetailResponse = {
  profile: AdminProfile;
  smtp: AdminSmtpInfo;
  imap: AdminImapInfo;
  billing: AdminBillingSummary;
  statistics: AdminUserStatistics;
  team: AdminTeamInfo;
  recent_searches: AdminRecentSearchItem[];
  recent_payments: AdminRecentPaymentItem[];
};

export type AdminBillingPlanAssignResponse = {
  ok: boolean;
  user_id: number;
  email: string;
  billing: AdminBillingSummary;
};

export type AdminUserMutationResponse = {
  ok: boolean;
  user_id: number;
  email: string;
  is_deleted: boolean;
  deleted_at: string | null;
  purge_after: string | null;
};

function withSearchParams(path: string, params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function getAdminMe() {
  return adminFetch<AdminMeResponse>("/admin/me", { method: "GET" });
}

export function getAdminDashboard(period: AdminDashboardPeriod) {
  return adminFetch<AdminDashboardResponse>(withSearchParams("/admin/dashboard", { period }), {
    method: "GET",
  });
}
export function getAdminAnalytics(period: AdminDashboardPeriod) {
  return adminFetch<AdminAnalyticsResponse>(withSearchParams("/admin/analytics", {period}));
}
export function getAdminPayments(params: AdminPaymentsParams) {
  return adminFetch<AdminPaymentListResponse>(withSearchParams("/admin/payments", {
    period: params.period, status: params.status, plan_code: params.plan_code,
    q: params.q, limit: params.limit, offset: params.offset,
  }));
}

export type AdminPlan = {code: string; name: string; requests_limit: number; price_rub: number;
  is_free: boolean; corporate_only: boolean; is_active: boolean};
export function getAdminPlans() { return adminFetch<{items: AdminPlan[]}>("/admin/catalog/plans"); }

export function getAdminUsers(params: AdminUsersParams) {
  return adminFetch<AdminUsersResponse>(
    withSearchParams("/admin/users", {
      q: params.q,
      limit: params.limit,
      offset: params.offset,
      no_searches: params.no_searches,
      has_smtp: params.has_smtp,
      include_deleted: params.include_deleted,
    }),
    { method: "GET" },
  );
}

export function getAdminUser(userId: number) {
  return adminFetch<AdminUserDetailResponse>(`/admin/users/${userId}`, { method: "GET" });
}

export function assignAdminUserPlan(userId: number, planCode: string) {
  return adminFetch<AdminBillingPlanAssignResponse>(`/admin/users/${userId}/billing/plan`, {
    method: "POST",
    json: { plan_code: planCode },
  });
}

export function softDeleteAdminUser(userId: number, confirmEmail: string) {
  return adminFetch<AdminUserMutationResponse>(`/admin/users/${userId}/soft-delete`, {
    method: "POST",
    json: { confirm_email: confirmEmail },
  });
}

export function restoreAdminUser(userId: number) {
  return adminFetch<AdminUserMutationResponse>(`/admin/users/${userId}/restore`, {
    method: "POST",
  });
}
