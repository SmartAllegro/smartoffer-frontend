import { Activity, AlertTriangle, Clock3, Database, HardDrive, MailCheck, RefreshCw, Search, Server, Users, Workflow } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { getAdminAnalytics, type AdminMonitorState, type AdminMonitorSummaryResponse } from "@/api/admin";
import { deriveCurrentMonitorAlerts } from "../adminMonitoringAlerts";
import { AdminKpi, AdminPanel, NoData } from "./AdminPanels";
import { AdminSeriesChart } from "./AdminSeriesChart";

const services = [
  {id:"api", name:"API", icon:Server}, {id:"postgresql", name:"PostgreSQL", icon:Database},
  {id:"redis", name:"Redis", icon:Database}, {id:"search_worker", name:"Search Worker", icon:Workflow},
  {id:"mail_sync_worker", name:"Mail Worker", icon:MailCheck},
  {id:"mail_scheduler", name:"Mail Scheduler", icon:Clock3}, {id:"caddy", name:"Caddy", icon:Server},
];
const stateLabel:Record<AdminMonitorState,string> = {
  healthy:"Работает", warning:"Внимание", critical:"Сбой", unknown:"Не проверялось",
};
const stateColor:Record<AdminMonitorState,string> = {
  healthy:"text-emerald-400", warning:"text-amber-400", critical:"text-rose-400", unknown:"text-slate-400",
};
const stamp = (value:string|null|undefined) => value ? new Date(value).toLocaleString("ru-RU") : "—";
const count = (value:number|null|undefined) => value == null ? "—" : String(value);

export function AdminMonitoringView({monitoring:summary}:{monitoring:UseQueryResult<AdminMonitorSummaryResponse,Error>}) {
  const analytics = useQuery({queryKey:["admin","analytics","7d"], queryFn:()=>getAdminAnalytics("7d"), staleTime:30_000});
  const data = summary.data;
  const components = new Map(data?.components.map(component=>[component.id,component]) ?? []);
  const search = data?.queues.find(queue=>queue.id==="search");
  const mail = data?.queues.find(queue=>queue.id==="mail_sync");
  const alerts = deriveCurrentMonitorAlerts(data,{isError:summary.isError});
  const delayed = !!data && Date.now()-new Date(data.generated_at).getTime()>90_000;
  const partial = data?.components.some(component=>component.state==="unknown");
  const errorCode = summary.error && typeof summary.error === "object" && "status" in summary.error
    ? String(summary.error.status) : "network";
  const mailSent = analytics.data?.activity.emails_sent ?? 0;
  const mailTotal = mailSent+(analytics.data?.activity.emails_unsent ?? 0);
  return <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-5"><div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span aria-live="polite">{summary.isLoading ? "Получение снимка…" : summary.isError ? "Не удалось обновить снимок" : delayed ? "Снимок устарел" : partial ? "Часть источников не проверяется" : "Снимок получен"} · {stamp(data?.generated_at)}</span><button type="button" onClick={()=>void summary.refetch()} disabled={summary.isFetching} className="admin-inset inline-flex items-center gap-2 rounded-md px-3 py-2 text-slate-200 hover:text-primary disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><RefreshCw size={14} className={summary.isFetching ? "animate-spin" : ""} />Обновить</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminKpi label="Новые пользователи" value={count(analytics.data?.registrations)} detail="За 7 дней · аналитика B1" icon={Users} />
      <AdminKpi label="Ошибки синхронизации" value={count(data?.mail_sync_failed_attempts_24h)} detail="Попытки за 24 ч" icon={AlertTriangle} tone="red" />
      <AdminKpi label="Активные поиски" value={count(data?.search_jobs_by_status ? data.search_jobs_by_status.processing ?? 0 : null)} detail="Статус processing в PostgreSQL" icon={Search} tone="green" />
      <AdminKpi label="Отправленные письма" value={mailTotal ? `${Math.round(100*mailSent/mailTotal)}%` : "—"} detail="За 7 дней · отправлено / все статусы" icon={MailCheck} tone="green" />
    </div>
    {summary.isError && <NoData>Диагностика недоступна ({errorCode}). Последний успешный снимок, если есть, показан ниже.</NoData>}
    {summary.isLoading && <NoData>Загрузка диагностики…</NoData>}
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.15fr)_minmax(310px,1fr)]">
      <div className="min-w-0 space-y-4">
        <AdminPanel title="Состояние системы" icon={Activity}><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-7">{services.map(({id,name,icon:Icon})=>{const component=components.get(id); const state=delayed ? "unknown" : component?.state ?? "unknown"; return <div key={id} className="admin-inset min-h-[92px] p-2 text-xs"><div className="flex items-center gap-1 font-semibold"><Icon size={16} className="admin-info shrink-0" /><span className="truncate">{name}</span></div><div className={`mt-2 font-semibold ${stateColor[state]}`}>{stateLabel[state]}</div><div className="mt-1 text-[11px] text-slate-400">{delayed ? "Снимок устарел" : component?.metric ?? component?.issue ?? "Нет измерения"}</div></div>})}</div><p className="mt-2 text-[11px] text-slate-500">API: ответ административного обработчика; это не проверка хоста или внешнего HTTPS. Worker: свежий RQ heartbeat.</p></AdminPanel>
        <AdminPanel title="Текущие отклонения" icon={AlertTriangle}>{alerts.incidents.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="admin-table-head"><tr>{["Время измерения","Критичность","Сервис","Описание","Состояние","Подробности"].map(title=><th key={title} className="p-2 font-medium">{title}</th>)}</tr></thead><tbody>{alerts.incidents.map(item=><tr key={item.id} className="border-b border-[var(--admin-border)]"><td className="p-2 text-slate-400">{stamp(item.observedAt)}</td><td className={`p-2 ${item.severity==="critical" ? "text-rose-400" : "text-amber-400"}`}>{item.severity==="critical" ? "Критично" : "Предупреждение"}</td><td className="p-2">{item.service}</td><td className="p-2">{item.category}</td><td className="p-2">Текущее</td><td className="p-2">{item.description}</td></tr>)}</tbody></table></div> : <NoData>{alerts.source==="error" ? "Не удалось получить состояние мониторинга." : alerts.source==="stale" ? "Снимок устарел; подтверждение текущих отклонений недоступно." : data ? "Подтверждённых текущих отклонений в доступных проверках нет." : "Нет диагностического снимка."}</NoData>}{alerts.diagnostics.length>0 && <div className="mt-3 text-xs text-slate-400"><p className="font-semibold">Диагностика недоступна или устарела</p><ul className="mt-1 space-y-1">{alerts.diagnostics.map(item=><li key={item.id}>{item.service}: {item.description}</li>)}</ul></div>}<p className="mt-2 text-[11px] text-slate-500">Это текущий снимок. Источник истории не подключён.</p></AdminPanel>
        <div className="grid gap-4 md:grid-cols-2"><AdminPanel title="Ошибки и предупреждения" icon={Activity}><NoData>Исторический ряд ошибок пока недоступен.</NoData></AdminPanel><AdminPanel title="Регистрации" icon={Users}>{analytics.data ? <><div className="admin-info text-2xl font-semibold">{analytics.data.registrations}</div><AdminSeriesChart points={analytics.data.registration_series} bucket={analytics.data.bucket} kind="registrations" /></> : <NoData>{analytics.isError ? "Аналитика недоступна." : "Загрузка аналитики…"}</NoData>}</AdminPanel></div>
      </div>
      <div className="min-w-0 space-y-4"><AdminPanel title="Последние события" icon={Clock3}><NoData>Историческая лента событий пока не подключена.</NoData></AdminPanel>
        <AdminPanel title="Очереди и фоновые задачи" icon={Workflow}><div className="space-y-2">{([["Search",search],["Mail Sync",mail]] as const).map(([name,queue])=><div key={name} className="admin-inset p-3 text-xs"><div className="flex justify-between gap-2"><b className="text-sm">{name}</b><span className={stateColor[delayed ? "unknown" : queue?.state ?? "unknown"]}>{stateLabel[delayed ? "unknown" : queue?.state ?? "unknown"]}</span></div><p className="mt-2">Ожидают: {count(queue?.pending)} · Выполняются: {count(queue?.started)} · Failed: {count(queue?.failed)}</p><p className="mt-1 text-slate-400">Worker: {count(queue?.workers_active)} активных / {count(queue?.workers_registered)} зарегистрировано · Старейшее: {queue?.oldest_pending_seconds == null ? "—" : `${queue.oldest_pending_seconds} с`}</p><p className="mt-1 text-slate-500">{queue?.issue ?? `Измерено: ${stamp(queue?.observed_at)}`}</p></div>)}</div><p className="mt-2 text-xs text-slate-400">Поиск в PostgreSQL: {data?.search_jobs_by_status ? Object.entries(data.search_jobs_by_status).map(([status,value])=>`${status} ${value}`).join(" · ") : "нет данных"}. Ошибки mail sync: {count(data?.mail_sync_failed_attempts_24h)} попыток / {count(data?.mail_sync_unique_failed_states_24h)} уникальных состояний за 24 ч.</p></AdminPanel>
        <AdminPanel title="Ресурсы и резервирование" icon={HardDrive}><NoData>CPU, RAM, диск, контейнеры и backup: ожидается источник телеметрии VM. Локальные ресурсы Windows здесь не используются.</NoData></AdminPanel></div>
    </div>
  </div></main>;
}
