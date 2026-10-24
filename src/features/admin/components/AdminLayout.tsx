import { type ReactNode, useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AdminMeResponse, AdminMfaStatus, AdminMonitorSummaryResponse } from "@/api/admin";
import { deriveCurrentMonitorAlerts, type CurrentMonitorAlert } from "../adminMonitoringAlerts";
import { logoutUser } from "@/api/auth";
import adminAvatar from "@/assets/admin-avatar.png";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { AdminSection, AdminSidebar } from "./AdminSidebar";
import "../admin.css";

const headings: Record<AdminSection, [string, string]> = {
  dashboard: ["Админ-панель", "Пользователи, активность и развитие SmartOffer"],
  users: ["Пользователи", "Аккаунты, тарифы, почта и лимиты"],
  billing: ["Биллинг", "Тарифы, платежи и выручка SmartOffer"],
  monitoring: ["Мониторинг", "Состояние инфраструктуры и фоновых задач SmartOffer"],
  audit: ["Аудит действий администратора", "Безопасность, изменения и контроль административного доступа"],
};

const MONITOR_ALERT_READ_KEY = "smartoffer.admin.monitor-alerts.read.v1";

const monitorAlertKey = (item: CurrentMonitorAlert) =>
  JSON.stringify([item.id, item.state, item.description]);

function loadReadMonitorAlerts(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(MONITOR_ALERT_READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function saveReadMonitorAlerts(values: Set<string>) {
  try {
    window.sessionStorage.setItem(
      MONITOR_ALERT_READ_KEY,
      JSON.stringify([...values]),
    );
  } catch {
    // Notification read-state must never break the admin console.
  }
}

type Props = { admin: AdminMeResponse; mfa: AdminMfaStatus; monitoring: UseQueryResult<AdminMonitorSummaryResponse, Error>; section: AdminSection;
  onSectionChange: (section: AdminSection) => void; onUserSearch: (value: string) => void; children: ReactNode };

export function AdminLayout({admin, mfa, monitoring, section, onSectionChange, onUserSearch, children}: Props) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const alerts = deriveCurrentMonitorAlerts(monitoring.data,{isError:monitoring.isError});
  const [readAlertKeys, setReadAlertKeys] = useState<Set<string>>(
    () => loadReadMonitorAlerts(),
  );

  const activeAlertSignature = alerts.incidents
    .map(monitorAlertKey)
    .sort()
    .join("\n");

  const unreadAlertCount = alerts.incidents.reduce(
    (count, item) => count + (readAlertKeys.has(monitorAlertKey(item)) ? 0 : 1),
    0,
  );

  useEffect(() => {
    if (alerts.source !== "ready") return;

    const active = new Set(
      activeAlertSignature ? activeAlertSignature.split("\n") : [],
    );

    setReadAlertKeys(current => {
      const next = new Set([...current].filter(key => active.has(key)));

      if (
        next.size === current.size &&
        [...next].every(key => current.has(key))
      ) {
        return current;
      }

      saveReadMonitorAlerts(next);
      return next;
    });
  }, [alerts.source, activeAlertSignature]);

  const markCurrentAlertsRead = () => {
    const keys = alerts.incidents.map(monitorAlertKey);
    if (!keys.length) return;

    setReadAlertKeys(current => {
      const next = new Set(current);
      keys.forEach(key => next.add(key));

      if (next.size === current.size) return current;

      saveReadMonitorAlerts(next);
      return next;
    });
  };

  return <div className="admin-shell flex h-screen overflow-hidden">
    <div className="hidden md:block"><AdminSidebar admin={admin} section={section} onSectionChange={onSectionChange} /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="admin-header flex min-h-[78px] shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 lg:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Открыть меню"><Menu /></Button></SheetTrigger>
          <SheetContent side="left" className="admin-shell w-[260px] border-0 p-0"><SheetTitle className="sr-only">Навигация администратора</SheetTitle><AdminSidebar admin={admin} section={section} onSectionChange={next=>{onSectionChange(next);setMenuOpen(false);}} compact /></SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1"><h1 className="text-lg font-semibold leading-tight sm:text-2xl">{headings[section][0]}</h1><p className="truncate text-xs text-slate-400">{headings[section][1]}</p></div>
        {mfa.dev_mfa_bypass && <span className="order-last w-full rounded-full bg-amber-400/15 px-3 py-1 text-center text-xs font-semibold text-amber-400 sm:order-none sm:w-auto">DEV · MFA отключена</span>}
        <form onSubmit={e => {e.preventDefault(); onUserSearch(search); onSectionChange("users");}} className="relative order-last w-full sm:order-none sm:w-64 lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Поиск пользователя" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск пользователя, email, ID..." className="admin-field h-10 w-full rounded-lg pl-9 pr-3 text-sm" />
        </form>
        <div className="relative"><button type="button" aria-label="Текущие предупреждения мониторинга" aria-expanded={noticeOpen} aria-controls="admin-current-alerts" onClick={()=>{
          const next = !noticeOpen;
          if (next) markCurrentAlertsRead();
          setNoticeOpen(next);
        }} className="relative rounded p-2 text-slate-300 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Bell size={20} />{unreadAlertCount>0 && <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-[#131720]" aria-label={`${unreadAlertCount} непрочитанных предупреждений`}>{unreadAlertCount}</span>}</button>
          {noticeOpen && <div id="admin-current-alerts" className="admin-card fixed left-3 right-3 top-16 z-30 max-h-[70vh] overflow-y-auto p-4 text-sm shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[350px]" role="region" aria-label="Текущие предупреждения">
            <p className="mb-3 font-semibold">Текущие предупреждения</p>
            {alerts.source==="error" ? <p>Не удалось получить состояние мониторинга</p> : alerts.source==="loading" ? <p>Получение состояния мониторинга…</p> : alerts.source==="stale" ? <p>Снимок мониторинга устарел. Подтверждённых текущих предупреждений нет.</p> : alerts.incidents.length ? <ul className="space-y-3">{alerts.incidents.map(item=><li key={item.id} className="admin-inset rounded p-2"><p className="font-semibold">{item.service} · {item.category}</p><p className={item.severity==="critical" ? "text-rose-400" : "text-amber-400"}>{item.severity==="critical" ? "Критично" : "Предупреждение"}</p><p className="mt-1 text-slate-300">{item.description}</p><p className="mt-1 text-xs text-slate-400">Измерено: {item.observedAt ? new Date(item.observedAt).toLocaleString("ru-RU") : "—"}</p></li>)}</ul> : <p>Подтверждённых текущих инцидентов нет</p>}
            <button type="button" className="mt-3 text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={()=>{onSectionChange("monitoring");setNoticeOpen(false);}}>Открыть мониторинг</button>
          </div>}
        </div>
        <div className="relative"><button onClick={()=>setProfileOpen(!profileOpen)} className="flex max-w-[210px] items-center gap-2 border-l border-[var(--admin-border)] pl-3 text-left">
          <img
            src={adminAvatar}
            alt="Аватар администратора SmartOffer"
            className="h-9 w-9 shrink-0 rounded-full border border-[var(--admin-info)] bg-black object-cover"
/><span className="hidden min-w-0 lg:block"><span className="block truncate text-sm">{admin.email}</span><span className="block text-xs text-slate-400">{admin.role}</span></span><ChevronDown size={15} />
        </button>{profileOpen && <div className="admin-card absolute right-0 top-12 z-30 w-64 space-y-2 p-4 text-sm shadow-xl"><p className="break-all">{admin.email}</p><p className="text-slate-400">Роль: {admin.role}</p><p className="text-slate-400">MFA: {mfa.dev_mfa_bypass ? "отключена в DEV" : "подтверждена"}</p><Link className="block text-primary" to="/">В SmartOffer</Link><button className="text-red-300" onClick={()=>void logoutUser().then(()=>location.assign("/#/"))}>Выйти из аккаунта</button></div>}</div>
      </header>
      {children}
    </div>
  </div>;
}
