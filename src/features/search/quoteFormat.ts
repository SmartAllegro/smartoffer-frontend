import type { QuoteDecimal, PaymentTiming } from "@/api/quoteAnalysis";

export const PAYMENT_LABELS: Record<PaymentTiming, string> = {
  advance: "Аванс", before_shipment: "Перед отгрузкой", on_shipment: "При отгрузке",
  on_delivery: "При поставке", after_delivery: "После поставки", deferred: "Отсрочка",
  on_readiness: "По готовности", other: "Прочее", unknown: "Условие оплаты",
};

export function formatQuoteDecimal(value: QuoteDecimal): string {
  if (value === null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 20 }).format(n) : "—";
}

export function formatBenefitScore(value: number | string | null): string {
  if (value === null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function formatLegalCompanyName(name: string | null | undefined): string {
  const value = name?.trim() || "";
  return value.replace(/^Общество с ограниченной ответственностью(?=\s|$)/i, "ООО");
}

function finiteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ruNumber(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  }).format(value).replace(/[\u00a0\u202f]/g, " ");
}

export function formatFinancialRub(value: number | string | null | undefined): string {
  const number = finiteNumber(value);
  if (number === null) return "—";
  if (Math.abs(number) >= 1_000_000_000) return `${ruNumber(number / 1_000_000_000, 2)} млрд ₽`;
  if (Math.abs(number) >= 1_000_000) return `${ruNumber(number / 1_000_000, 2)} млн ₽`;
  return `${ruNumber(number, 2)} ₽`;
}

export function formatFinancialRatio(value: number | string | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? "—" : ruNumber(number, 2);
}

export function formatFinancialPercent(value: number | string | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? "—" : `${ruNumber(number, 2)}%`;
}

export function formatOrderToRevenuePercent(value: number | string | null | undefined): string {
  const number = finiteNumber(value);
  if (number === null) return "—";
  if (number === 0) return "0%";
  if (number > 0 && number < 0.01) return "<0,01%";
  return formatFinancialPercent(number);
}

export function sameDisplayedCompanyName(first: string | null | undefined, second: string | null | undefined): boolean {
  const normalize = (value: string | null | undefined) => formatLegalCompanyName(value)
    .replace(/[«»“”]/g, '"').replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
  return normalize(first) === normalize(second);
}
