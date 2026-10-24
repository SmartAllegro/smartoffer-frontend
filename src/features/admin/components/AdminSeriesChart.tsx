import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminSeriesPoint } from "@/api/admin";
import { formatCurrencyRub } from "../adminUtils";
import { NoData } from "./AdminPanels";

function dateLabel(value: string, monthly: boolean) {
  return new Intl.DateTimeFormat("ru-RU", monthly
    ? { month: "short", year: "numeric" }
    : { day: "numeric", month: "short" }).format(new Date(value));
}

export function AdminSeriesChart({points, bucket, kind}: {
  points: AdminSeriesPoint[]; bucket: "day" | "month"; kind: "registrations" | "revenue";
}) {
  if (points.length === 0) return <NoData>За выбранный период событий нет.</NoData>;
  const monthly = bucket === "month";
  const valueKey = kind === "revenue" ? "amount_rub" : "count";
  const active = points.some(point => point.count > 0 || (kind === "revenue" && point.amount_rub > 0));
  if (!active) return <NoData>За выбранный период событий нет.</NoData>;
  return <div>
    <div className="h-[210px] w-full" role="img" aria-label={kind === "revenue" ? "Выручка по датам" : "Регистрации по датам"}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{top: 10, right: 8, left: -18, bottom: 0}}>
        <CartesianGrid vertical={false} stroke="var(--admin-border)" />
        <XAxis dataKey="bucket_start" tickFormatter={value => dateLabel(String(value), monthly)} stroke="var(--admin-muted)" tickLine={false} axisLine={false} minTickGap={22} fontSize={11} />
        <YAxis yAxisId="amount" allowDecimals={kind === "revenue"} stroke="var(--admin-muted)" tickLine={false} axisLine={false} fontSize={11} />
        {kind === "revenue" && <YAxis yAxisId="orders" orientation="right" allowDecimals={false} stroke="var(--admin-info)" tickLine={false} axisLine={false} fontSize={11} />}
        <Tooltip labelFormatter={label => dateLabel(String(label), monthly)} formatter={(value, name) => [name === "amount_rub" ? formatCurrencyRub(Number(value)) : Number(value), name === "amount_rub" ? "Сумма" : kind === "revenue" ? "Заказов" : "Регистраций"]}
          contentStyle={{background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 8}} />
        <Bar yAxisId="amount" dataKey={valueKey} fill={kind === "revenue" ? "var(--admin-accent)" : "var(--admin-info)"} radius={[3,3,0,0]} />
        {kind === "revenue" && <Bar yAxisId="orders" dataKey="count" fill="var(--admin-info)" radius={[3,3,0,0]} />}
      </BarChart></ResponsiveContainer>
    </div>
  </div>;
}
