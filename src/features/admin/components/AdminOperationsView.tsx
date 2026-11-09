import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { getOperationsEvents, getOperationsSummary, getOperationsEvent, OperationalEvent, OperationalFilters } from "@/api/admin";
import { AdminPanel, AdminKpi, NoData } from "./AdminPanels";

const categories:Record<string,string> = {release:"Релизы",migration:"Миграции",service:"Сервисы",queue:"Очереди",scheduler:"Планировщик",storage:"Диск",backup:"Резервирование",restore:"Восстановление данных",infrastructure:"Инфраструктура"};
const outcomes:Record<string,string> = {started:"Начато",success:"Успешно",failure:"Ошибка",recovered:"Восстановлено"};
const labels:Record<string,string> = {"release.started":"Релиз начат","release.succeeded":"Релиз завершён","release.failed":"Ошибка релиза","migration.started":"Миграция начата","migration.succeeded":"Миграция завершена","migration.failed":"Ошибка миграции","service.unavailable":"Сервис недоступен","service.unhealthy":"Сервис неисправен","service.recovered":"Сервис восстановлен","service.restarted":"Сервис перезапущен","queue.stale":"Очередь требует внимания","queue.recovered":"Очередь восстановлена","scheduler.unhealthy":"Планировщик неисправен","scheduler.recovered":"Планировщик восстановлен","disk.warning":"Порог диска превышен","disk.recovered":"Диск в норме","backup.started":"Backup начат","backup.succeeded":"Backup завершён","backup.failed":"Ошибка backup","backup.readback_verified":"Ciphertext readback подтверждён","restore.started":"Restore начат","restore.succeeded":"Restore завершён","restore.failed":"Ошибка restore"};
const reasons:Record<string,string> = {container_network_address_in_use:"Адрес контейнерной сети занят",operation_failed:"Операция завершилась ошибкой",health_check_failed:"Проверка работоспособности не пройдена",threshold_exceeded:"Порог превышен",service_unavailable:"Сервис недоступен",operator_reported:"Сообщение оператора",verification_failed:"Проверка не пройдена"};
const time = (value:string) => new Date(value).toLocaleString("ru-RU");

export function OperationalDetails({event}:{event:OperationalEvent}) {
  const opened = event.details.opened_at || event.occurred_at;
  const recovered = event.resolved_at || event.recovery?.resolved_at;
  return <div className="space-y-3 break-words p-3 text-sm">
    <p className="font-medium">{labels[event.event_type]} · {outcomes[event.outcome]}</p>
    <p>Время: {time(event.occurred_at)} · Источник: {event.source}</p>
    {event.component && <p>Компонент: {event.component}</p>}
    {event.release_tag && <><p>Release: {event.release_tag}</p><p>Backend: {event.backend_commit?.slice(0,12)} · Frontend: {event.frontend_commit?.slice(0,12)}</p><ul className="list-inside list-disc">{event.details.changes?.map((line,i)=><li key={i}>{line}</li>)}</ul></>}
    {event.category === "migration" && <><p>Из: {event.details.from_revision}</p><p>В: {event.details.to_revision}</p></>}
    {event.correlation_id && ["service","queue","scheduler","storage"].includes(event.category) && <>
      <p>Обнаружено: {time(opened)}</p><p>Восстановление: {recovered ? time(recovered) : "В истории не зафиксировано"}</p>
      {recovered && <p>Длительность: {Math.max(0,Math.round((Date.parse(recovered)-Date.parse(opened))/1000))} сек.</p>}
      <p className="text-xs text-slate-400">Историческое событие не определяет текущее состояние сервиса.</p></>}
    {event.details.reason_code && <p>Причина: {reasons[event.details.reason_code] || event.details.reason_code}</p>}
    {event.event_type === "backup.readback_verified" && <p>Readback не подтверждает restore smoke или полное DR.</p>}
  </div>;
}

export function AdminOperationsView() {
  const [filters,setFilters] = useState<OperationalFilters>({period:"30d"});
  const [offset,setOffset] = useState(0);
  const [selected,setSelected] = useState<string|null>(null);
  const summary = useQuery({queryKey:["operations-summary",filters],queryFn:()=>getOperationsSummary(filters),retry:false});
  const page = useQuery({queryKey:["operations-events",filters,offset],queryFn:()=>getOperationsEvents(filters,offset),retry:false});
  const detail = useQuery({queryKey:["operations-detail",selected],queryFn:()=>getOperationsEvent(selected!),enabled:!!selected,retry:false});
  const change = (key:keyof OperationalFilters,value:string) => {setFilters({...filters,[key]:value||undefined});setOffset(0);setSelected(null);};
  const select = (key:keyof OperationalFilters,label:string,options:Record<string,string>) => <label className="flex min-w-0 flex-col gap-1 text-xs">{label}<select aria-label={label} className="min-w-0 rounded border border-slate-700 bg-slate-900 p-2" value={filters[key]||""} onChange={e=>change(key,e.target.value)}>{Object.entries(options).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
  return <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"><div className="mx-auto max-w-[1600px] space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminKpi label="События production" value={String(summary.data?.total ?? "—")} detail="За выбранный период" icon={Activity}/>
      <AdminKpi label="Ошибки" value={String(summary.data?.failures ?? "—")} detail="История ошибок" icon={AlertTriangle} tone="red"/>
      <AdminKpi label="Восстановления" value={String(summary.data?.recoveries ?? "—")} detail="Переходы состояния" icon={CheckCircle} tone="green"/>
      <AdminKpi label="Релизы" value={String(summary.data?.releases ?? "—")} detail="События релизов" icon={Package} tone="amber"/>
    </div>
    {summary.isLoading && <NoData>Загрузка сводки…</NoData>}{summary.isError && <p role="alert">Не удалось загрузить сводку.</p>}
    {summary.data?.source.state !== "fresh" && summary.data && <p className="text-sm text-amber-300">Источник недоступен или устарел. Сохранённая история доступна.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {select("period","Период",{"24h":"24 часа","7d":"7 дней","30d":"30 дней","90d":"90 дней"})}
      {select("source","Источник",{"":"Все",monitor:"Мониторинг",operator:"Оператор",backup:"Backup",restore:"Restore"})}
      {select("category","Категория",{"":"Все",...categories})}{select("event_type","Событие",{"":"Все",...labels})}
      {select("severity","Критичность",{"":"Все",info:"Информация",warning:"Предупреждение",critical:"Критическая"})}
      {select("outcome","Результат",{"":"Все",...outcomes})}
      {select("component","Компонент",Object.fromEntries(["","api","caddy","postgresql","redis","worker","mail_worker","mail_scheduler","search","mail_sync","disk","database","host"].map(x=>[x,x||"Все"])))}
      <button onClick={()=>{summary.refetch();page.refetch();if(selected)detail.refetch();}} className="rounded border border-slate-700 p-2 text-xs">Обновить</button>
    </div>
    <AdminPanel title="История production" icon={Activity}>
      {page.isLoading && <NoData>Загрузка событий…</NoData>}{page.isError && <p role="alert" className="p-3">Не удалось загрузить историю. Нажмите «Обновить».</p>}
      {page.data && <><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="admin-table-head"><tr>{["Время","Категория","Событие","Компонент","Результат","Подробности"].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{page.data.items.map(e=><tr key={e.event_id} className="border-t border-slate-800"><td className="p-3">{time(e.occurred_at)}</td><td className="p-3">{categories[e.category]}</td><td className="p-3">{labels[e.event_type]}</td><td className="p-3">{e.component||"—"}</td><td className="p-3">{outcomes[e.outcome]}</td><td className="p-3"><button onClick={()=>setSelected(e.event_id)}>Открыть</button></td></tr>)}</tbody></table></div>
        {!page.data.items.length && <NoData>Событий по выбранным фильтрам нет.</NoData>}
        <div className="flex flex-wrap gap-4 p-3 text-xs"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-20))}>Назад</button><span>{offset + (page.data.items.length?1:0)}–{offset+page.data.items.length} из {page.data.total}</span><button disabled={offset+20>=page.data.total || offset>=10000} onClick={()=>setOffset(offset+20)}>Далее</button></div></>}
    </AdminPanel>
    <AdminPanel title="Подробности события" icon={Activity}>{!selected ? <NoData>Выберите событие в журнале.</NoData> : detail.isLoading ? <NoData>Загрузка подробностей…</NoData> : detail.isError ? <p role="alert">Не удалось загрузить подробности.</p> : detail.data ? <OperationalDetails event={detail.data}/> : null}</AdminPanel>
  </div></main>;
}
