import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { QuoteComparisonOffer, QuoteComparisonSuccess, QuoteOfferFinancials, QuoteScopeAssessment } from "@/api/quoteComparison";
import type { BenefitIndexSuccess } from "@/api/quoteBenefitIndex";
import type { Supplier } from "@/shared/types/rfq";
import { Button } from "@/shared/ui/button";
import { QuoteBenefitIndexMatrix } from "./QuoteBenefitIndexMatrix";
import { analyzeQuoteComparison } from "../quoteComparisonFlow";
import { formatFinancialPercent, formatFinancialRatio, formatFinancialRub, formatLegalCompanyName,
  formatOrderToRevenuePercent, formatQuoteDecimal, PAYMENT_LABELS, sameDisplayedCompanyName } from "../quoteFormat";

export const MATCH_LABELS: Record<QuoteScopeAssessment["match_type"], string> = {
  exact: "✓ Точное соответствие",
  analog: "~ Предложен аналог",
  mismatch: "✕ Не соответствует запросу",
  unclear: "? Недостаточно данных",
};
export function offerVatLabel(offer: QuoteComparisonOffer): string {
  return offer.vat_mode === "included" ? `с НДС${offer.vat_rate_percent !== null ? ` ${formatQuoteDecimal(offer.vat_rate_percent)}%` : ""}` :
    offer.vat_mode === "excluded" ? "без НДС" : offer.vat_mode === "no_vat" ? "НДС не облагается" : "НДС не указано";
}
export function formatComparisonDelivery(offer: QuoteComparisonOffer): string {
  const min = offer.delivery_days_min, max = offer.delivery_days_max;
  if (min !== null && max !== null) return min === max ? `${min} дней` : `${min}–${max} дней`;
  if (min !== null) return `от ${min} дней`;
  if (max !== null) return `до ${max} дней`;
  return offer.delivery_terms || "не указано";
}
function offerName(offer: QuoteComparisonOffer, suppliers: Supplier[]) {
  return formatLegalCompanyName(offer.supplier_name || suppliers.find(s => s.backend_result_id === offer.result_id)?.supplier_name) || "Поставщик по КП";
}
function TextList({ values }: { values: string[] }) {
  return values.length ? <ul className="list-inside list-disc space-y-1 [overflow-wrap:anywhere]">
    {values.map((value, i) => <li key={i}>{value}</li>)}
  </ul> : null;
}
export function prepaymentLabel(offer: QuoteComparisonOffer, entry: QuoteOfferFinancials): string {
  const explicitPercent = offer.prepayment_percent ??
    offer.payment_stages.find(stage => stage.timing === "advance" && stage.percent !== null)?.percent;
  const amount = entry.metrics.prepayment_amount_rub;
  if (explicitPercent !== null && explicitPercent !== undefined) {
    const percent = `Предоплата: ${formatQuoteDecimal(explicitPercent)}%`;
    return amount !== null && Number.isFinite(Number(amount)) ? `${percent} — ${formatFinancialRub(amount)}` :
      `${percent}. Сумма предоплаты не рассчитана`;
  }
  const beforeDelivery = offer.payment_stages.some(stage =>
    ["advance", "before_shipment", "on_readiness"].includes(stage.timing)) ||
    /(?:предоплат|аванс|(?:до|перед)\s+(?:отгрузк|поставк|получени))/i.test(offer.payment_terms || "");
  if (beforeDelivery) return "Процент аванса не указан";
  if (offer.payment_terms || offer.payment_stages.length) return "Сумма предоплаты не рассчитана";
  return "Условия предоплаты не указаны";
}
function FinancialCard({ entry, offer, name }: {
  entry: QuoteOfferFinancials; offer?: QuoteComparisonOffer; name: string;
}) {
  const c = entry.context, m = entry.metrics;
  if (!c.available) return <article className="min-w-0 rounded-lg border border-white/10 p-3">
    <h5 className="font-medium text-white">{name}</h5><p className="text-slate-400">Финансовые данные недоступны</p>
  </article>;
  const rows: [string, number | string | null, (value: number | string) => string][] = [
    ["Выручка", c.revenue_rub, formatFinancialRub], ["Чистая прибыль", c.net_profit_rub, formatFinancialRub],
    ["Оборотный капитал", m.working_capital_rub, formatFinancialRub],
    ["Текущая ликвидность", m.current_ratio, formatFinancialRatio],
    ["Чистая маржа", m.net_margin_percent, formatFinancialPercent],
    ["Доля капитала", m.equity_ratio_percent, formatFinancialPercent],
    ["Заказ / выручка", m.order_to_revenue_percent, formatOrderToRevenuePercent],
  ];
  const officialName = formatLegalCompanyName(c.company_name);
  return <article className="min-w-0 space-y-2 rounded-lg border border-white/10 p-3 [overflow-wrap:anywhere]">
    <h5 className="font-medium text-white">{name}</h5>
    {officialName && !sameDisplayedCompanyName(name, officialName) &&
      <p className="text-xs text-slate-400">По данным ФНС: {officialName}</p>}
    {c.financial_year !== null && <p className="text-xs text-slate-400">Финансовый год: {c.financial_year}</p>}
    <dl className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">{rows.filter(([, value]) =>
      value !== null && Number.isFinite(Number(value))).map(([label, value, formatter]) =>
      <div key={label} className="min-w-0"><dt className="text-slate-400">{label}</dt>
        <dd>{formatter(value!)}</dd></div>)}
    </dl>
  </article>;
}
export function ComparisonContent({ response, suppliers, receivedCount, analyzedCount, benefitIndex, onBenefitFxCalculate }: {
  response: QuoteComparisonSuccess; suppliers: Supplier[]; receivedCount: number; analyzedCount: number;
  benefitIndex?: BenefitIndexSuccess | null;
  onBenefitFxCalculate?: (rates: Record<string, string>) => Promise<void>;
}) {
  const assessments = new Map(response.analysis.scope_assessments.map(a => [a.result_id, a]));
  const label = (offer: QuoteComparisonOffer) => offerName(offer, suppliers);
  const names = new Map(response.offers.map(offer => [offer.result_id, label(offer)]));
  const offers = new Map(response.offers.map(offer => [offer.result_id, offer]));
  const singleOffer = response.offers.length === 1;
  return <div className="min-w-0 space-y-5 rounded-xl border border-white/10 bg-[#151f2d] p-4 text-sm text-slate-200 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>Получено КП: {receivedCount}</span>
      <span>Проанализировано: {analyzedCount}</span><span>
  {singleOffer ? "В анализе" : "В сравнении"}: {response.offers.length}
</span></div>
    {response.partial && <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
      В сравнении участвуют {response.offers.length} из {response.offers.length + response.excluded_result_ids.length} КП.</p>}
    <QuoteBenefitIndexMatrix benefit={benefitIndex?.comparison_id === response.comparison_id ? benefitIndex : null}
      offers={response.offers} names={names} onFxCalculate={onBenefitFxCalculate} />
    <section><h4 className="mb-2 font-semibold text-white">{singleOffer ? "Сопоставимость с запросом" : "Сопоставимость предложений"}</h4>
      <div className="grid gap-2 sm:grid-cols-2">{response.offers.map(offer => {
        const assessment = assessments.get(offer.result_id);
        return <div key={offer.result_id} className="min-w-0 rounded-lg border border-white/10 p-3">
          <p className="font-medium">{label(offer)}</p><p className="text-sky-200">{assessment ? MATCH_LABELS[assessment.match_type] : "? Недостаточно данных"}</p>
          {assessment?.notes.map((note, i) => <p key={i} className="text-slate-400">{note}</p>)}
          {!!assessment?.missing_items.length && <p className="text-slate-400">Не хватает: {assessment.missing_items.join(", ")}</p>}
          {!!assessment?.extra_or_different_items.length && <p className="text-slate-400">Отличается: {assessment.extra_or_different_items.join(", ")}</p>}
        </div>;
      })}</div></section>
    <section><h4 className="mb-2 font-semibold text-white"><h4 className="mb-2 font-semibold text-white">
  {singleOffer ? "Коммерческие условия" : "Сравнение условий"}
</h4></h4>
      <div className="grid gap-2 sm:grid-cols-2">{response.offers.map(offer => <div key={offer.result_id} className="min-w-0 space-y-1 rounded-lg border border-white/10 p-3">
        <p className="font-medium text-white">{label(offer)}</p>
        <p>Сумма: <span className="font-semibold text-[#ffbf00]">{formatQuoteDecimal(offer.total_amount)} {offer.currency === "RUB" ? "₽" : offer.currency === "UNKNOWN" ? "валюта не указана" : offer.currency}</span></p>
        <p>НДС: {offerVatLabel(offer)}</p>
        <p>Оплата: {offer.payment_stages.length ? offer.payment_stages.map(s => `${s.percent !== null ? `${formatQuoteDecimal(s.percent)}% ` : ""}${PAYMENT_LABELS[s.timing]}`).join("; ") : offer.payment_terms || "не указано"}</p>
        <p>Срок: {formatComparisonDelivery(offer)}</p>
        {offer.availability && <p>Наличие: {offer.availability}</p>}
        <p>
          Доставка: {
            offer.delivery_included === true
              ? "включена"
              : offer.delivery_included === false
                ? "не включена"
                : offer.delivery_terms || "не указано"
          }
        </p>
        <p>Гарантия: {offer.warranty_months === null ? "не указано" : `${offer.warranty_months} мес.`}</p>
      </div>)}</div></section>
    <section className="space-y-4"><h4 className="font-semibold text-white">AI-анализ</h4>
      <div><h5 className="mb-1 font-medium text-white">Краткий вывод</h5><p className="max-w-3xl whitespace-pre-wrap leading-relaxed">{response.analysis.executive_summary}</p></div>
      <div><h5 className="mb-1 font-medium text-white"><h5 className="mb-1 font-medium text-white">
  {singleOffer ? "Отклонения от запроса" : "Ключевые различия"}
</h5></h5><TextList values={response.analysis.key_differences} /></div>
      <div><h5 className="mb-1 font-medium text-white">Коммерческие условия</h5><TextList values={response.analysis.commercial_terms_notes} /></div>
      <div>
        <h5 className="mb-2 font-medium text-white">Финансовое состояние</h5>

        {!!response.analysis.financial_notes.length && (
          <p className="mb-3 max-w-3xl leading-relaxed text-slate-300">
            {response.analysis.financial_notes[0]}
          </p>
        )}

        {response.financial_contexts.some(item => item.context.available) ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            {response.financial_contexts.map(entry => (
              <FinancialCard
                key={entry.result_id}
                entry={entry}
                offer={offers.get(entry.result_id)}
                name={names.get(entry.result_id) || "Поставщик по КП"}
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-400">
            Недостаточно официальных финансовых данных.
          </p>
        )}
      </div>
    </section>
    {!!response.analysis.clarification_questions.length && <section><h4 className="mb-2 font-semibold text-white">Что уточнить</h4>
      <ul className="list-inside list-disc space-y-1">{response.analysis.clarification_questions.map((q, i) => <li key={i}>{q}</li>)}</ul></section>}
  </div>;
}

export function QuoteComparisonPanel({ jobId, suppliers, receivedCount, analyzedCount, readyIds, settled, onComparisonChange, benefitIndex, onBenefitFxCalculate }: {
  jobId: number; suppliers: Supplier[]; receivedCount: number; analyzedCount: number; readyIds: number[]; settled: boolean;
  onComparisonChange?: (comparison: QuoteComparisonSuccess | null) => void;
  benefitIndex?: BenefitIndexSuccess | null;
  onBenefitFxCalculate?: (rates: Record<string, string>) => Promise<void>;
}) {
  const [response, setResponse] = useState<QuoteComparisonSuccess | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const signature = readyIds.slice().sort((a, b) => a - b).join(",");
  useEffect(() => { onComparisonChange?.(response); }, [response, onComparisonChange]);
  useEffect(() => {
    if (!settled || readyIds.length < 1 || !jobId) {
      setResponse(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setResponse(null); setState("loading");
    analyzeQuoteComparison(jobId, false, signature).then(value => {
      if (cancelled) return;
      if (value.ok === true) { setResponse(value); setState("idle"); }
      else setState("error");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [jobId, signature, settled]);
  async function retry() {
    setResponse(null);
    setState("loading");
    try {
      const value = await analyzeQuoteComparison(jobId, true, signature);
      if (value.ok === true) { setResponse(value); setState("idle"); }
      else setState("error");
    } catch { setState("error"); }
  }
  if (!settled) return null;
  return <section className="min-w-0 space-y-3 pt-4"><h3 className="text-base font-semibold text-white">
  {readyIds.length === 1 ? "Анализ предложения" : "Общий анализ запроса"}
</h3>
    {readyIds.length < 1 ? (
      <p className="text-sm text-slate-400">
        Для анализа необходимо хотя бы одно КП.
      </p>
    ) :
      state === "loading" ? <p role="status" className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Анализируем предложения…</p> :
      state === "error" ? <div><p role="status" className="text-sm text-slate-400">Не удалось выполнить общий анализ запроса.</p>
        <Button variant="outline" className="mt-2" onClick={() => void retry()}>Повторить общий анализ</Button></div> :
      response ? <ComparisonContent response={response} suppliers={suppliers} receivedCount={receivedCount} analyzedCount={analyzedCount}
        benefitIndex={benefitIndex} onBenefitFxCalculate={onBenefitFxCalculate} /> : null}
  </section>;
}
