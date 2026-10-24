import { CheckCircle2, ChevronRight, Mail, XCircle } from "lucide-react";

import type { AdminUserListItem } from "@/api/admin";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { cn } from "@/shared/utils/utils";

import { formatDate, formatNumber, formatTime, fullName, initials, percentUsed, userStatusLabel } from "../adminUtils";

type AdminUsersTableProps = {
  users: AdminUserListItem[];
  selectedUserId: number | null;
  loading: boolean;
  onSelectUser: (user: AdminUserListItem) => void;
};

export function AdminUsersTable({ users, selectedUserId, loading, onSelectUser }: AdminUsersTableProps) {
  if (loading) {
    return (
      <div className="rounded-md border border-white/10 bg-card p-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="mb-2 h-14 rounded-md bg-white/10 last:mb-0" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border border-white/10 bg-card px-4 py-14 text-center text-sm text-white/45">
        Пользователи не найдены
      </div>
    );
  }

  return (
    <div className="admin-card w-full overflow-x-auto">
      <Table className="min-w-[1050px]">
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="h-10 px-3 text-xs text-white/45">Пользователь</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Регистрация</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Тариф</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Запросы</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">SMTP</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Поиски</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Последний поиск</TableHead>
            <TableHead className="h-10 px-3 text-xs text-white/45">Статус</TableHead>
            <TableHead className="h-10 w-9 px-2 text-xs text-white/45" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const selected = selectedUserId === user.id;
            const usage = percentUsed(user.requests_used, user.requests_limit);

            return (
              <TableRow
                key={user.id}
                onClick={() => onSelectUser(user)}
                onKeyDown={event => {if (event.key === "Enter" || event.key === " ") {event.preventDefault();onSelectUser(user);}}}
                tabIndex={0}
                aria-label={`Открыть пользователя ${user.email}`}
                className={cn(
                  "cursor-pointer border-white/10 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                  selected && "bg-primary/[0.08] shadow-[inset_2px_0_0_hsl(var(--primary))] hover:bg-primary/[0.1]",
                )}
              >
                <TableCell className="px-3 py-3">
                  <div className="flex min-w-[210px] items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-xs font-semibold text-emerald-200">
                      {initials(user.first_name, user.last_name, user.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {fullName(user.first_name, user.last_name, user.email)}
                      </div>
                      <div className="truncate text-xs text-white/45">{user.email}</div>
                      <div className="text-[11px] text-white/35">ID: {user.id}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="px-3 py-3 text-sm text-white/75">
                  <div>{formatDate(user.created_at)}</div>
                  <div className="text-xs text-white/40">{formatTime(user.created_at)}</div>
                </TableCell>

                <TableCell className="px-3 py-3">
                  {user.billing_plan_name ? (
                    <Badge className="border border-primary/20 bg-primary/10 text-primary">{user.billing_plan_name}</Badge>
                  ) : (
                    <span className="text-sm text-white/45">Нет тарифа</span>
                  )}
                </TableCell>

                <TableCell className="min-w-[130px] px-3 py-3">
                  {user.requests_limit > 0 ? (
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatNumber(user.requests_used)} / {formatNumber(user.requests_limit)}
                      </div>
                      <Progress value={usage} className="mt-2 h-1.5 bg-white/10" />
                      <div className="mt-1 text-[11px] text-white/40">осталось {formatNumber(user.requests_remaining)}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-white/45">—</span>
                  )}
                </TableCell>

                <TableCell className="px-3 py-3">
                  <SmtpStatus user={user} />
                </TableCell>

                <TableCell className="px-3 py-3 text-sm font-semibold text-white">{formatNumber(user.searches_count)}</TableCell>

                <TableCell className="px-3 py-3 text-sm text-white/65">{formatDateTimeCompact(user.last_search_at)}</TableCell>

                <TableCell className="px-3 py-3">
                  <Badge
                    className={cn(
                      "border",
                      user.is_deleted
                        ? "border-red-400/20 bg-red-500/10 text-red-300"
                        : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    {userStatusLabel(user.is_deleted)}
                  </Badge>
                </TableCell>

                <TableCell className="px-2 py-3 text-white/35">
                  <ChevronRight className="h-4 w-4" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SmtpStatus({ user }: { user: AdminUserListItem }) {
  if (!user.has_smtp) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-white/45">
        <XCircle className="h-3.5 w-3.5 text-amber-300" />
        Не подключён
      </div>
    );
  }

  if (user.smtp_verified) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Проверен
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-blue-300">
      <Mail className="h-3.5 w-3.5" />
      Подключён
    </div>
  );
}

function formatDateTimeCompact(value: string | null): string {
  if (!value) return "—";
  return `${formatDate(value)} ${formatTime(value)}`.trim();
}
