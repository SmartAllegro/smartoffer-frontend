import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function AdminPanel({title, icon: Icon, children, className = ""}: {title: string; icon?: LucideIcon; children: ReactNode; className?: string}) {
  return <section className={`admin-card min-w-0 overflow-hidden p-3 ${className}`}>
    <div className="admin-panel-title flex min-h-9 items-center gap-2 pb-2 text-base font-semibold">{Icon && <Icon size={19} className="text-primary" />}{title}</div>
    <div className="pt-2">{children}</div>
  </section>;
}

export function AdminKpi({label, value, detail, icon: Icon, tone = "blue", series}: {label: string; value: string; detail: string; icon: LucideIcon; tone?: "blue" | "amber" | "green" | "red"; series?: number[] | null}) {
  const colors = {blue:"text-[var(--admin-info)]",amber:"text-[var(--admin-accent)]",green:"text-[var(--admin-success)]",red:"text-[var(--admin-danger)]"};
  return <div className="admin-card flex min-h-[108px] items-start gap-3 p-3">
    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--admin-inset)] ${colors[tone]}`}><Icon size={22} /></div>
    <div className="min-w-0 flex-1"><div className="text-sm">{label}</div><div className="mt-1 text-[28px] font-semibold leading-none">{value}</div><div className="mt-1 text-xs text-slate-400">{detail}</div></div>
    <AdminMiniSeries values={series} />
  </div>;
}

/** Hidden until a server-supplied series exists. */
export function AdminMiniSeries({values}: {values?: number[] | null}) {
  if (!values || values.length < 2 || values.some(value => !Number.isFinite(value))) return null;
  const min = Math.min(...values), span = Math.max(1, Math.max(...values) - min);
  const points = values.map((value,index) => `${(index/(values.length-1))*90},${29-((value-min)/span)*24}`).join(" ");
  return <svg role="img" aria-label="Динамика показателя" viewBox="0 0 90 32" className="mt-auto hidden h-8 w-[90px] shrink-0 md:block"><polyline points={points} fill="none" stroke="var(--admin-info)" strokeWidth="1.5" /></svg>;
}

export function NoData({children = "Нет данных. Источник будет подключён на этапе ADMIN-001R-B."}: {children?: ReactNode}) {
  return <div className="flex min-h-16 items-center justify-center px-3 py-3 text-center text-sm text-slate-400">{children}</div>;
}

export function AdminDataState({loading, error}: {loading: boolean; error: boolean}) {
  if (loading) return <NoData>Загрузка данных…</NoData>;
  if (error) return <NoData>Не удалось загрузить данные. Повторите попытку позже.</NoData>;
  return null;
}
