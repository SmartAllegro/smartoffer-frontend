import { Building2, MessageSquareText, Search, Send, ShieldCheck, X } from "lucide-react";

import type { AdminUserDetailResponse } from "@/api/admin";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

import { formatDateTime, formatNumber, fullName, initials, userStatusLabel } from "../adminUtils";
import { AdminBillingPanel } from "./AdminBillingPanel";
import { AdminDangerZone } from "./AdminDangerZone";
import { AdminMailPanel } from "./AdminMailPanel";
import { AdminRecentPayments } from "./AdminRecentPayments";
import { AdminRecentSearches } from "./AdminRecentSearches";

type AdminUserDetailProps = {
  user: AdminUserDetailResponse | undefined;
  loading: boolean;
  error?: boolean;
  onClose: () => void;
};

export function AdminUserDetail({ user, loading, error, onClose }: AdminUserDetailProps) {
  if (!user && !loading && !error) {
    return (
      <aside className="flex h-full min-h-[520px] items-center justify-center rounded-md border border-white/10 bg-card p-6 text-center">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            <Search className="h-5 w-5" />
          </div>
          <div className="mt-4 text-lg font-semibold text-white">Выберите пользователя</div>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">
            Откройте пользователя из списка, чтобы посмотреть настройки, тариф и активность.
          </p>
        </div>
      </aside>
    );
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !user) {
    return (
      <aside className="rounded-md border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-200">
        Пользователь не найден
      </aside>
    );
  }

  const profile = user.profile;
  const stats = user.statistics;

  return (
    <aside className="h-full overflow-y-auto rounded-md border border-white/10 bg-background/55">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-background/95 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-sm font-semibold text-emerald-200">
              {initials(profile.first_name, profile.last_name, profile.email)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-white">
                  {fullName(profile.first_name, profile.last_name, profile.email)}
                </h2>
                <Badge
                  className={cn(
                    "border",
                    profile.is_deleted
                      ? "border-red-400/20 bg-red-500/10 text-red-300"
                      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
                  )}
                >
                  {userStatusLabel(profile.is_deleted)}
                </Badge>
              </div>
              <div className="mt-1 truncate text-sm text-white/55">{profile.email}</div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-white/45 sm:grid-cols-2">
                <span>ID: {profile.id}</span>
                <span>Регистрация: {formatDateTime(profile.created_at)}</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0 text-white/45 hover:bg-white/10 hover:text-white"
            aria-label="Закрыть пользователя"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <AdminBillingPanel user={user} />
        <AdminMailPanel user={user} />
        <StatisticsCard stats={stats} />
        <TeamCard user={user} />
        <AdminRecentSearches searches={user.recent_searches} />
        <AdminRecentPayments payments={user.recent_payments} />
        <AdminDangerZone user={user} />
      </div>
    </aside>
  );
}

function StatisticsCard({ stats }: { stats: AdminUserDetailResponse["statistics"] }) {
  const items = [
    { label: "Поисков", value: stats.searches_count, icon: Search },
    { label: "Email jobs", value: stats.email_jobs_count, icon: Send },
    { label: "Отправлено", value: stats.emails_sent, icon: Send },
    { label: "Ошибок", value: stats.emails_failed, icon: ShieldCheck, danger: true },
    { label: "Ответов", value: stats.supplier_replies_count, icon: MessageSquareText },
    { label: "КП", value: stats.quotes_received_count, icon: ShieldCheck },
  ];

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white">Статистика</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-md border border-white/10 bg-background/45 p-3">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <Icon className={cn("h-3.5 w-3.5", item.danger ? "text-red-300" : "text-primary")} />
                {item.label}
              </div>
              <div className={cn("mt-2 text-xl font-semibold", item.danger ? "text-red-300" : "text-white")}>
                {formatNumber(item.value)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TeamCard({ user }: { user: AdminUserDetailResponse }) {
  const owned = user.team.owned_organizations;
  const memberships = user.team.memberships;

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Building2 className="h-4 w-4 text-primary" />
          Команда
        </CardTitle>
      </CardHeader>
      <CardContent>
        {owned.length === 0 && memberships.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-background/45 p-4 text-sm text-white/45">Не состоит в команде</div>
        ) : (
          <div className="space-y-2">
            {owned.map((org) => (
              <div key={`owned-${org.id}`} className="rounded-md border border-white/10 bg-background/45 p-3">
                <div className="font-semibold text-white">{org.name}</div>
                <div className="mt-1 text-xs text-white/55">Владелец · {org.status}</div>
              </div>
            ))}
            {memberships.map((member) => (
              <div key={`member-${member.id}`} className="rounded-md border border-white/10 bg-background/45 p-3">
                <div className="font-semibold text-white">{member.organization_name || `Команда #${member.organization_id}`}</div>
                <div className="mt-1 text-xs text-white/55">
                  {member.role} · {member.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <aside className="h-full overflow-hidden rounded-md border border-white/10 bg-background/55 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="mt-2 h-4 w-64 bg-white/10" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-md bg-white/10" />
        ))}
      </div>
    </aside>
  );
}
