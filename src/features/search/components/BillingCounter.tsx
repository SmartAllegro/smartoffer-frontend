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

  const isBlocked = !billing || billing.status !== "active" || remaining <= 0;
  const isLow = !isBlocked && remaining <= 10;

  const toneClass = isBlocked
    ? "border-destructive/30 bg-destructive/10"
    : isLow
      ? "border-yellow-500/30 bg-yellow-500/10"
      : "border-primary/30 bg-primary/10";

  const title = !isAuthenticated
    ? "Запросы"
    : billing?.current_plan_name || "Тариф";

  const subtitle = !isAuthenticated
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
        "w-[132px] h-[132px] rounded-xl border p-3 text-left transition-colors",
        "hover:bg-white/5",
        toneClass
      )}
      title="Открыть настройки"
    >
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </div>
          <div className="mt-2 text-3xl font-bold leading-none text-foreground">
            {loading ? "..." : remaining}
          </div>
          <div className="mt-2 text-sm font-medium text-foreground">
            {subtitle}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          {hint}
        </div>
      </div>
    </button>
  );
}