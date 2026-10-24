import { cn } from "@/shared/utils/utils";

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0));
}

export function formatCurrencyRub(value: number | null | undefined): string {
  return `${formatNumber(value)} ₽`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function fullName(firstName?: string | null, lastName?: string | null, fallback = "Без имени"): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback;
}

export function initials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const first = (firstName || "").trim()[0];
  const last = (lastName || "").trim()[0];
  const value = `${first || ""}${last || ""}`.trim();
  if (value) return value.toUpperCase();
  return (email || "AD").slice(0, 2).toUpperCase();
}

export function percentUsed(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export function apiErrorMessage(error: unknown): string {
  const anyError = error as { status?: number; body?: { detail?: string }; message?: string };
  if (anyError?.status === 401) return "Требуется авторизация";
  if (anyError?.status === 403) return "Нет доступа";
  if (anyError?.status === 404) return "Пользователь не найден";
  if (anyError?.status === 409) return "Операция недоступна для текущего состояния пользователя";
  if (anyError?.status === 422) return anyError.body?.detail || "Проверьте введённые данные";
  return "Не удалось выполнить операцию. Повторите попытку.";
}

export function statusBadgeClass(status: string | null | undefined): string {
  const value = String(status || "").toLowerCase();
  return cn(
    value === "active" && "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    value === "completed" && "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    value === "sent" && "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    value === "queued" && "border-amber-400/20 bg-amber-500/10 text-amber-300",
    value === "processing" && "border-blue-400/20 bg-blue-500/10 text-blue-300",
    value === "failed" && "border-red-400/20 bg-red-500/10 text-red-300",
    value === "deleted" && "border-red-400/20 bg-red-500/10 text-red-300",
    value === "blocked" && "border-red-400/20 bg-red-500/10 text-red-300",
    value === "exhausted" && "border-amber-400/20 bg-amber-500/10 text-amber-300",
    !value && "border-white/10 bg-white/5 text-white/60",
  );
}

export function userStatusLabel(isDeleted: boolean): string {
  return isDeleted ? "Удалён" : "Активен";
}
