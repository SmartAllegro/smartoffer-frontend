import type { BillingMe } from "@/api/billing";
import { cn } from "@/shared/utils/utils";

type Props = {
  billing: BillingMe | null;
  loading: boolean;
  isAuthenticated: boolean;
  onClick?: () => void;
};

export function BillingCounter({
  billing,
  loading,
  isAuthenticated,
  onClick,
}: Props) {
  const remaining = Math.max(Number(billing?.requests_remaining ?? 0), 0);
  const limit = Math.max(Number(billing?.requests_limit ?? 0), 0);

  const title = !isAuthenticated
    ? "Запросы"
    : billing?.current_plan_name || "Тариф";

  const value = !isAuthenticated
    ? "Войдите"
    : loading
      ? "Загрузка..."
      : `${remaining} / ${limit}`;

  const hint = !isAuthenticated
    ? "Авторизация"
    : billing?.email_domain_type === "corporate"
      ? "Corporate"
      : billing?.email_domain_type === "public"
        ? "Personal"
        : "No SMTP";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-[132px] min-h-[92px] rounded-xl border px-4 py-3 text-left transition-colors",
        "border-[#c89b16] bg-[#ffbf00] hover:bg-[#f0b400]",
        "shadow-[0_10px_24px_rgba(255,191,0,0.12)]"
      )}
      title="Открыть настройки"
    >
      <div className="flex h-full flex-col justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-[#5b4200]/80">
          {title}
        </div>

        <div className="text-[28px] font-semibold leading-none text-[#2b2100]">
          {value}
        </div>

        <div className="text-[12px] text-[#5b4200]/85">
          {hint}
        </div>
      </div>
    </button>
  );
}