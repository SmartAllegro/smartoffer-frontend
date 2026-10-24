import { CreditCard, FileText, House, Activity, Users } from "lucide-react";
import { Link } from "react-router-dom";

import type { AdminMeResponse } from "@/api/admin";
import { RadarLogo } from "@/shared/ui/RadarLogo";
import { cn } from "@/shared/utils/utils";

export type AdminSection = "dashboard" | "users" | "billing" | "monitoring" | "audit";

type AdminSidebarProps = {
  admin: AdminMeResponse;
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  compact?: boolean;
};

export function AdminSidebar({ admin, section, onSectionChange, compact = false }: AdminSidebarProps) {
  const navItems = [
    { value: "dashboard" as const, label: "Обзор", icon: House },
    { value: "users" as const, label: "Пользователи", icon: Users },
    { value: "billing" as const, label: "Биллинг", icon: CreditCard },
    { value: "monitoring" as const, label: "Мониторинг", icon: Activity },
    { value: "audit" as const, label: "Аудит", icon: FileText },
  ];

  return (
    <aside
      className={cn(
        "admin-sidebar flex h-full flex-col border-r text-white",
        compact ? "w-full" : "w-[244px]",
      )}
    >
      <div className="flex h-24 items-center gap-3 px-5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-visible">
          <div className="pointer-events-none absolute inset-1 rounded-full bg-primary/[0.06] blur-md" />
          <RadarLogo size={58} />
        </div>
        <div className="min-w-0">
          <div className="text-[19px] font-bold leading-none text-primary">Smartoffer.pro</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.42]">
            Admin Console
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onSectionChange(item.value)}
              className={cn(
                "group relative flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-sm font-semibold transition",
                active
                  ? "bg-amber-500/[0.16] text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]"
                  : "text-white/[0.58] hover:bg-white/[0.055] hover:text-white",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-white/[0.42] group-hover:text-primary")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[var(--admin-border)] p-5 text-xs text-slate-400">
        <Link to="/" className="hover:text-primary">SmartOffer · основной сервис</Link>
        <div className="mt-2 truncate">{admin.email}</div>
      </div>
    </aside>
  );
}
