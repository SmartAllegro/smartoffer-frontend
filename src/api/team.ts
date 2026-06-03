import { apiFetch } from "./client";
import type {
  HistoryDetailResponse,
  HistoryListResponse,
  HistoryStatsResponse,
  SupplierRepliesResponse,
} from "./history";

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    const str = String(value).trim();
    if (!str) continue;

    search.set(key, str);
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export type TeamMe = {
  has_team: boolean;
  organization_id?: number | null;
  organization_name?: string | null;
  role?: "owner" | "manager" | string | null;
  can_view_team_history: boolean;
  can_manage_team: boolean;
  business_active: boolean;
  owner_email?: string | null;
};

export type TeamMember = {
  id: number;
  user_id?: number | null;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: "owner" | "manager" | string;
  status: "active" | "removed" | string;
  created_at: string;
  accepted_at?: string | null;
};

export type TeamMembersResponse = {
  items: TeamMember[];
};

export async function fetchTeamMe(): Promise<TeamMe> {
  return apiFetch<TeamMe>("/team/me", { method: "GET" });
}

export async function createTeam(payload: { name?: string | null } = {}) {
  return apiFetch<{ ok: boolean; organization_id: number; role: string }>("/team/create", {
    method: "POST",
    json: payload,
  });
}

export async function listTeamManagers(): Promise<TeamMembersResponse> {
  return apiFetch<TeamMembersResponse>("/team/managers", { method: "GET" });
}

export async function addTeamManager(email: string): Promise<TeamMember> {
  return apiFetch<TeamMember>("/team/managers", {
    method: "POST",
    json: { email },
  });
}

export async function removeTeamManager(memberId: number) {
  return apiFetch<{ ok: boolean; member_id: number }>(`/team/managers/${memberId}`, {
    method: "DELETE",
  });
}

export async function listTeamHistory(params: {
  limit?: number;
  offset?: number;
  outcome?: string;
  period?: string;
  q?: string;
  actor_user_id?: number | null;
} = {}): Promise<HistoryListResponse> {
  const qs = buildQuery({
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    outcome: params.outcome ?? "all",
    period: params.period ?? "30d",
    q: params.q,
    actor_user_id: params.actor_user_id,
  });

  return apiFetch<HistoryListResponse>(`/team/history${qs}`, { method: "GET" });
}

export async function getTeamHistoryStats(
  period = "30d",
  actorUserId?: number | null
): Promise<HistoryStatsResponse> {
  const qs = buildQuery({
    period,
    actor_user_id: actorUserId,
  });

  return apiFetch<HistoryStatsResponse>(`/team/history/stats${qs}`, {
    method: "GET",
  });
}

export async function getTeamHistoryDetail(jobId: number): Promise<HistoryDetailResponse> {
  return apiFetch<HistoryDetailResponse>(`/team/history/${jobId}`, { method: "GET" });
}

export async function getTeamResultReplies(resultId: number): Promise<SupplierRepliesResponse> {
  return apiFetch<SupplierRepliesResponse>(`/team/results/${resultId}/replies`, {
    method: "GET",
  });
}