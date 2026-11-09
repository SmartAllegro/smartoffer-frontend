import { AdminOperationsView } from "./AdminOperationsView";
import { useEffect, useState } from "react";
import { FileText, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { AdminKpi, AdminPanel, NoData } from "./AdminPanels";
import { AdminAuditEvent, AdminAuditFilters, AdminAuditPage, AdminAuditSummary,
  getAdminAuditEvents, getAdminAuditSummary, getAdminAuditEvent } from "@/api/admin";

const actions: Record<string, string> = {
  "admin.billing.plan_assigned": "Назначение тарифа", "admin.user.soft_deleted": "Отключение пользователя",
  "admin.user.restored": "Восстановление пользователя", "admin.operation_failed": "Ошибка операции",
  "security.admin_login_success": "Вход администратора", "security.admin_login_failed": "Ошибка входа",
  "security.admin_access_denied": "Отказ в доступе", "security.admin_mfa_verified": "MFA подтверждена",
  "security.admin_mfa_denied": "MFA отклонена", "security.admin_session_revoked": "Сессия отозвана",
  "security.admin_dev_mfa_bypass": "Локальный обход MFA",
};
const outcomes: Record<string, string> = {success: "Успех", failure: "Ошибка", denied: "Отказ"};

export function AdminActionsAuditView() {
  const [filters, setFilters] = useState<AdminAuditFilters>({period: "30d"});
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{page: AdminAuditPage; summary: AdminAuditSummary; security: AdminAuditPage} | null>(null);
  const [status, setStatus] = useState("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminAuditEvent | null>(null);
  const [detailStatus, setDetailStatus] = useState("empty");
  useEffect(() => {
    let active = true;
    setStatus("loading"); setData(null); setSelected(null);
    Promise.all([getAdminAuditEvents(filters, offset), getAdminAuditSummary(filters),
      getAdminAuditEvents({...filters, security_only: true}, 0, 10)])
      .then(([page, summary, security]) => { if (active) { setData({page, summary, security}); setStatus("success"); } })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [filters, offset, reload]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (!selected) { setDetailStatus("empty"); return; }
    setDetailStatus("loading");
    getAdminAuditEvent(selected).then(row => { if (active) { setDetail(row); setDetailStatus("success"); } })
      .catch(() => { if (active) setDetailStatus("error"); });
    return () => { active = false; };
  }, [selected]);
  function change(key: keyof AdminAuditFilters, value: string) {
    setOffset(0); setFilters(old => ({...old, [key]: value || undefined}));
  }
  const select = (key: keyof AdminAuditFilters, label: string, options: Record<string, string>) =>
    <label className="flex flex-col gap-1 text-xs">{label}<select aria-label={label} className="rounded border border-slate-700 bg-slate-900 p-2" value={String(filters[key] || "")} onChange={e => change(key, e.target.value)}>
      {Object.entries(options).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
    </select></label>;
  return <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"><div className="mx-auto max-w-[1600px] space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label: "Всего событий", key: "total", tone: "blue" as const, icon: FileText}, {label: "Успешные действия", key: "successful", tone: "green" as const, icon: ShieldCheck},
        {label: "Отказы в доступе", key: "denied", tone: "red" as const, icon: LockKeyhole}, {label: "MFA-события", key: "mfa", tone: "amber" as const, icon: Users}].map(k =>
        <AdminKpi key={k.key} label={k.label} value={data ? String(data.summary[k.key as keyof AdminAuditSummary]) : "—"}
          detail="За выбранный период и фильтры" icon={k.icon} tone={k.tone} />)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {select("period", "Период", {"24h": "24 часа", "7d": "7 дней", "30d": "30 дней", "90d": "90 дней"})}
      <label className="flex flex-col gap-1 text-xs">Администратор (ID)<input aria-label="Администратор (ID)" className="rounded border border-slate-700 bg-slate-900 p-2" placeholder="Все" value={filters.actor_id || ""} onChange={e => { if (/^[0-9]*$/.test(e.target.value)) change("actor_id", e.target.value); }} /></label>
      {select("category", "Категория", {"": "Все", admin_action: "Действия", authentication: "Авторизация", security: "Безопасность", system: "Система", payment: "Платежи", mail_sync: "Почта"})}
      {select("event_type", "Тип события", {"": "Все", ...actions})}
      {select("outcome", "Результат", {"": "Все", ...outcomes})}
      {select("severity", "Критичность", {"": "Все", info: "Информация", warning: "Предупреждение", critical: "Критическая"})}
      <button className="rounded border border-slate-700 p-2 text-xs" onClick={() => setReload(x => x + 1)}>Обновить</button>
    </div>
    <AdminPanel title="Журнал административных действий" icon={FileText}>
      {status === "loading" && <NoData>Загрузка аудита…</NoData>}
      {status === "error" && <div role="alert" className="p-4">Не удалось загрузить аудит. Повторите загрузку кнопкой «Обновить».</div>}
      {data && <><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="admin-table-head"><tr>{["Время","Администратор","Действие","Объект","Результат","Подробности"].map(x => <th key={x} className="p-3 font-medium">{x}</th>)}</tr></thead>
        <tbody>{data.page.items.map(row => <tr key={row.event_id} className="border-t border-slate-800">
          <td className="p-3">{new Date(row.occurred_at).toLocaleString("ru-RU")}</td><td className="p-3">{row.actor_id ?? "—"}</td>
          <td className="p-3">{actions[row.event_type] || row.event_type}</td><td className="p-3">{row.target_type || "—"} {row.target_id}</td>
          <td className="p-3">{outcomes[row.outcome]}</td><td className="p-3"><button aria-pressed={selected === row.event_id} onClick={() => setSelected(row.event_id)}>Открыть</button></td>
        </tr>)}</tbody></table></div>
        {!data.page.items.length && <NoData>Событий по выбранным фильтрам нет.</NoData>}
        <div className="flex flex-wrap items-center gap-4 p-3 text-xs"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Назад</button>
          <span>{offset + (data.page.items.length ? 1 : 0)}–{offset + data.page.items.length} из {data.page.total}</span>
          <button disabled={offset + 20 >= data.page.total || offset >= 10000} onClick={() => setOffset(offset + 20)}>Далее</button></div></>}
    </AdminPanel>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><AdminPanel title="Подробности выбранного события" icon={FileText}>
      {detailStatus === "empty" && <NoData>Выберите событие в журнале.</NoData>}
      {detailStatus === "loading" && <NoData>Загрузка подробностей…</NoData>}
      {detailStatus === "error" && <div role="alert" className="p-4">Не удалось загрузить событие.</div>}
      {detail && <pre className="whitespace-pre-wrap break-all p-4 text-xs">{JSON.stringify(detail, null, 2)}</pre>}
    </AdminPanel><AdminPanel title="События безопасности" icon={ShieldCheck}>
      {status === "loading" && <NoData>Загрузка событий безопасности…</NoData>}
      {status === "error" && <NoData>Не удалось загрузить события безопасности.</NoData>}
      {data && !data.security.items.length && <NoData>Событий безопасности по выбранным фильтрам нет.</NoData>}
      {data?.security.items.map(row => <button key={row.event_id} className="block w-full border-b border-slate-800 p-3 text-left text-xs" onClick={() => setSelected(row.event_id)}>{new Date(row.occurred_at).toLocaleString("ru-RU")} · {actions[row.event_type]} · {outcomes[row.outcome]}</button>)}
      {!!data?.security.items.length && <p className="p-3 text-xs">Последние 10 событий категорий «Авторизация» и «Безопасность». Все записи доступны в журнале.</p>}
    </AdminPanel></div>
  </div></main>;
}


export function AdminAuditView() {
  const [tab, setTab] = useState("production");
  return <div className="flex min-h-0 flex-1 flex-col">
    <div role="tablist" aria-label="Источник аудита" className="flex flex-wrap gap-2 border-b border-slate-800 px-4 py-3">
      <button role="tab" aria-selected={tab === "production"} className="rounded border border-slate-700 px-4 py-2 aria-selected:bg-slate-800" onClick={() => setTab("production")}>Production</button>
      <button role="tab" aria-selected={tab === "admin"} className="rounded border border-slate-700 px-4 py-2 aria-selected:bg-slate-800" onClick={() => setTab("admin")}>Действия администраторов</button>
    </div>
    {tab === "production" ? <AdminOperationsView /> : <AdminActionsAuditView />}
  </div>;
}
