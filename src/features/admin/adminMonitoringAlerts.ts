import type { AdminMonitorSummaryResponse, AdminMonitorState } from "@/api/admin";

export type CurrentMonitorAlert = {
  id: string; service: string; category: string; severity: "warning" | "critical";
  observedAt: string | null; state: AdminMonitorState; description: string;
};
export type CurrentMonitorAlerts = {
  incidents: CurrentMonitorAlert[]; diagnostics: CurrentMonitorAlert[];
  source: "loading" | "ready" | "stale" | "error";
};

const names: Record<string,string> = {
  api:"API", postgresql:"PostgreSQL", redis:"Redis", search_worker:"Search Worker",
  mail_sync_worker:"Mail Worker", mail_scheduler:"Mail Scheduler", caddy:"Caddy",
  search:"Search", mail_sync:"Mail Sync", vm:"VM",
  host_resources:"Ресурсы VM", backup:"Резервирование",
};
const fallback: Record<string,string> = {
  postgresql:"Проверка PostgreSQL не прошла.", redis:"Проверка Redis не прошла.",
  search:"Очередь Search требует проверки.", mail_sync:"Очередь Mail Sync требует проверки.",
};
const label = (id:string) => names[id] ?? "Сервис";
const description = (id:string, issue:string|null) => issue?.slice(0,180) || fallback[id] || "Подтверждено отклонение.";

export function deriveCurrentMonitorAlerts(
  data: AdminMonitorSummaryResponse | undefined, options: {isError?:boolean; now?:number} = {},
): CurrentMonitorAlerts {
  if (options.isError) return {incidents:[],diagnostics:[],source:"error"};
  if (!data) return {incidents:[],diagnostics:[],source:"loading"};
  const generated = Date.parse(data.generated_at);
  if (!Number.isFinite(generated) || (options.now ?? Date.now()) - generated > 90_000)
    return {incidents:[],diagnostics:[],source:"stale"};

  const incidents: CurrentMonitorAlert[] = [];
  const diagnostics: CurrentMonitorAlert[] = [];
  const add = (id:string, state:AdminMonitorState, observedAt:string|null,
    issue:string|null, stale:boolean, category:string) => {
    const alert:CurrentMonitorAlert = {id,service:label(id),category,
      severity:state==="critical" ? "critical" : "warning", observedAt,
      state:stale ? "unknown" : state, description:description(id,issue)};
    if (stale || state==="unknown") diagnostics.push({...alert,description:stale ? "Измерение устарело." : issue || "Источник диагностики недоступен."});
    else if (state==="warning" || state==="critical") incidents.push(alert);
  };
  for (const component of data.components) {
    if (component.id==="search_worker" || component.id==="mail_sync_worker") continue;
    if (component.state!=="healthy" || component.stale)
      add(component.id,component.state,component.observed_at,component.issue,component.stale,"Сервис");
  }
  for (const queue of data.queues) {
    if (queue.state!=="healthy" || queue.stale)
      // In B2 queue.stale describes the worker heartbeat; queue counts were measured now.
      add(queue.id,queue.state,queue.observed_at,queue.issue,false,"Очередь");
  }
  if (data.vm.state!=="healthy" || data.vm.stale)
    add("vm",data.vm.state,data.vm.observed_at,data.vm.issue,data.vm.stale,"Телеметрия");
  return {incidents,diagnostics,source:"ready"};
}
