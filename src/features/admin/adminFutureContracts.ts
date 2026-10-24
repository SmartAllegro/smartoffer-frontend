/** Contracts reserved for ADMIN-001R-B; no endpoint or synthetic production values. */
export type AdminDataState<T> =
  | {state:"loading"}
  | {state:"ready"; data:T; checked_at:string}
  | {state:"empty"}
  | {state:"error"; message:string};

export type AdminServiceState = "working" | "warning" | "critical" | "no_data";
export type AdminServiceStatus = {name:"API" | "PostgreSQL" | "Redis" | "Search Worker" | "Mail Worker" | "Mail Scheduler" | "Caddy";
  state:AdminServiceState; checked_at:string | null; metric_label:string | null; metric_value:string | null};
export type AdminQueueStatus = {name:"Search" | "Mail Sync"; queued:number; processing:number;
  failed:number; oldest_job_age_seconds:number | null};
export type AdminIncident = {id:string; occurred_at:string; severity:"warning" | "critical";
  service:string; description:string; status:string; repeated_count:number; request_id:string | null};
export type { AdminAuditEvent, AdminAuditPage } from "@/api/admin";
export type AdminPaymentListItem = {id:number; created_at:string; user_id:number; amount_rub:number;
  plan_code:string; status:string; provider_order_id:string; provider:string};
