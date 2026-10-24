import { FileText, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { AdminKpi, AdminPanel, NoData } from "./AdminPanels";

export function AdminAuditView() {
  return <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"><div className="mx-auto max-w-[1600px] space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminKpi label="Всего событий" value="—" detail="Источник не подключён" icon={FileText} /><AdminKpi label="Успешные действия" value="—" detail="Источник не подключён" icon={ShieldCheck} tone="green" /><AdminKpi label="Отказы в доступе" value="—" detail="Источник не подключён" icon={LockKeyhole} tone="red" /><AdminKpi label="MFA-события" value="—" detail="Источник не подключён" icon={Users} tone="amber" /></div>
    <AdminPanel title="Журнал административных действий" icon={FileText}><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="admin-table-head"><tr>{["Время","Администратор","Действие","Объект","Результат","Подробности"].map(x=><th key={x} className="p-3 font-medium">{x}</th>)}</tr></thead></table><NoData>Исторический аудит ещё не подключён. Журнал и фильтры появятся после подключения постоянного хранилища.</NoData></div></AdminPanel>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><AdminPanel title="Подробности выбранного события" icon={FileText}><NoData>Выберите событие после подключения журнала.</NoData></AdminPanel><AdminPanel title="События безопасности" icon={ShieldCheck}><NoData>История событий безопасности пока недоступна.</NoData></AdminPanel></div>
  </div></main>;
}
