import { Activity, CreditCard, Search, UserPlus, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAdminAnalytics, type AdminDashboardPeriod } from "@/api/admin";
import { formatCurrencyRub } from "../adminUtils";
import { AdminKpi, AdminPanel, NoData } from "./AdminPanels";
import { AdminSeriesChart } from "./AdminSeriesChart";

const periods = [["7d","7 дней"],["30d","30 дней"],["90d","90 дней"],["all","Всё время"]] as const;
const funnelLabels = {registered: "Регистрация", searched: "Первый поиск", emailed: "Первое письмо", paid: "Первая оплата"};

export function AdminDashboard() {
  const [period, setPeriod] = useState<AdminDashboardPeriod>("30d");
  const query = useQuery({queryKey:["admin","analytics",period],queryFn:()=>getAdminAnalytics(period)});
  const data = query.data;
  const activity = data?.activity, commercial = data?.commercial;
  return <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"><div className="mx-auto max-w-[1600px] space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-400">Бизнес-показатели SmartOffer</p><div className="flex flex-wrap gap-1" role="group" aria-label="Период аналитики">{periods.map(([value,label])=><button key={value} onClick={()=>setPeriod(value)} aria-pressed={period===value} className={`rounded-full px-3 py-1.5 text-xs ${period===value?'bg-primary text-primary-foreground':'admin-inset text-slate-300 hover:text-primary'}`}>{label}</button>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminKpi label="Всего пользователей" value={activity ? String(activity.registered_users) : "—"} detail="Зарегистрировано" icon={Users} /><AdminKpi label="Новые регистрации" value={data ? String(data.registrations) : "—"} detail={data?.registration_change_pct == null ? "Нет базы для сравнения" : `${data.registration_change_pct >= 0 ? "+" : ""}${data.registration_change_pct}% к прошлому периоду`} icon={UserPlus} /><AdminKpi label="Поисковые запросы" value={activity ? String(activity.search_jobs) : "—"} detail="За выбранный период" icon={Search} tone="green" /><AdminKpi label="Выручка" value={commercial ? formatCurrencyRub(commercial.revenue_rub) : "—"} detail="Подтверждённые заказы" icon={CreditCard} tone="amber" /></div>
    {query.isLoading ? <NoData>Загрузка аналитики…</NoData> : query.isError ? <NoData>Не удалось загрузить аналитику. <button onClick={()=>void query.refetch()} className="ml-1 text-primary underline">Повторить</button></NoData> : data && <>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><AdminPanel title="Регистрации пользователей" icon={UserPlus}><div className="mb-2 flex items-baseline gap-3"><strong className="text-2xl">{data.registrations}</strong><span className="text-xs text-slate-400">новых аккаунтов</span></div><AdminSeriesChart points={data.registration_series} bucket={data.bucket} kind="registrations" /></AdminPanel><AdminPanel title="Воронка пользователей" icon={Users}><p className="mb-3 text-xs text-slate-400">Когорта зарегистрированных за период; каждый этап после предыдущего</p>{data.funnel.map((stage, index)=><div key={stage.key} className="mb-3"><div className="flex justify-between gap-2 text-sm"><span>{funnelLabels[stage.key]}</span><span className="font-semibold">{stage.users} {index > 0 && <span className="text-xs font-normal text-slate-400">· {stage.conversion_from_previous_pct == null ? "—" : `${stage.conversion_from_previous_pct}%`}</span>}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--admin-inset)]"><div className="h-full rounded-full bg-[var(--admin-accent)]" style={{width:`${data.funnel[0].users ? stage.users / data.funnel[0].users * 100 : 0}%`}} /></div></div>)}</AdminPanel></div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><AdminPanel title="Активность сервиса" icon={Activity}><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[
        ["С поиском за всё время",activity?.users_with_search_ever],["Активные пользователи",activity?.active_search_users],["Поисковые задания",activity?.search_jobs],
        ["Успешные поиски",activity?.searches_completed],["Неудачные поиски",activity?.searches_failed],["Отправленные письма",activity?.emails_sent],["Неотправленные письма",activity?.emails_unsent],
      ].map(([label,value])=><div key={label} className="admin-inset p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-semibold">{value ?? "—"}</p></div>)}</div><p className="mt-3 text-xs text-slate-400">Активный пользователь: хотя бы один завершённый поиск за период. Статус письма берётся из EmailJob.</p></AdminPanel><AdminPanel title="Доходы и тарифы" icon={CreditCard}><div className="grid grid-cols-2 gap-2 text-sm">{[
        ["Подтверждённые заказы",commercial?.confirmed_orders],["Выручка",commercial && formatCurrencyRub(commercial.revenue_rub)],
        ["Оплатившие пользователи",commercial?.paying_users],["Активный платный тариф",commercial?.active_paid_plan_users],
      ].map(([label,value])=><div key={label} className="admin-inset p-3"><span className="text-xs text-slate-400">{label}</span><b className="mt-2 block text-xl">{value ?? "—"}</b></div>)}</div><p className="mt-3 text-xs text-slate-400">Активный тариф может быть назначен администратором и не подтверждает оплату.</p></AdminPanel></div>
    </>}
  </div></main>;
}
