import { useRef, useState, type FormEvent } from "react";
import type { BenefitIndexComponent, BenefitIndexItem, BenefitIndexSuccess } from "@/api/quoteBenefitIndex";
import type { QuoteComparisonOffer } from "@/api/quoteComparison";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { formatBenefitScore } from "../quoteFormat";

type Key = keyof Pick<BenefitIndexItem, "product_match" | "supply_coverage" | "delivery" | "financial" |
  "price" | "payment" | "warranty" | "commercial_completeness">;
const criteria: { key: Key; label: string; hint: string; max: string }[] = [
  { key: "product_match", label: "Соответствие товара", hint: "Оценивается соответствие предложенного оборудования исходному запросу: точное соответствие или аналог.", max: "1" },
  { key: "supply_coverage", label: "Объём поставки", hint: "Оценивается, какую долю запрошенных позиций и количества закрывает предложение.", max: "1" },
  { key: "delivery", label: "Срок поставки", hint: "Оценивается срок, необходимый для поставки предложенного объёма заказа.", max: "1" },
  { key: "financial", label: "Финансовое состояние", hint: "Оцениваются финансовое состояние компании и наличие финансового запаса для исполнения поставки. Критические показатели существенно снижают индекс.", max: "2" },
  {
    key: "price",
    label: "Цена",
    hint: "Сравнивается полная стоимость коммерческого предложения относительно других предложений с учётом валюты, НДС и объёма поставки. При одном КП цена не оценивается до появления второго предложения.",
    max: "2"
},
  { key: "payment", label: "Условия оплаты", hint: "Оцениваются постоплата, частичная предоплата или полная предоплата.", max: "2" },
  { key: "warranty", label: "Гарантия", hint: "Оценивается указанный поставщиком гарантийный срок.", max: "0,5" },
  { key: "commercial_completeness", label: "Полнота коммерческих условий", hint: "Оценивается наличие необходимых коммерческих условий: НДС, валюта, доставка и срок действия предложения.", max: "0,5" },
];
const financialWarnings: Record<string, string> = {
  negative_equity: "Отрицательный собственный капитал.",
  negative_working_capital: "Отрицательный оборотный капитал.",
  current_ratio_below_one: "Текущая ликвидность ниже 1.",
  negative_net_profit: "Отрицательная чистая прибыль за последний доступный отчётный год.",
};

function score(part: BenefitIndexComponent): string {
  return part.score === null ? "—" : formatBenefitScore(part.score);
}

export function QuoteBenefitIndexMatrix({ benefit, offers, names, onFxCalculate }: {
  benefit: BenefitIndexSuccess | null;
  offers: QuoteComparisonOffer[];
  names: Map<number, string>;
  onFxCalculate?: (rates: Record<string, string>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(benefit?.items.map(item => [item.result_id, item]) || []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!benefit || !onFxCalculate || inFlight.current) return;
    const rates: Record<string, string> = {};
    for (const code of benefit.required_fx_currencies) {
      const value = (draft[code] || "").trim().replace(",", ".");
      if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0) {
        setError(`Укажите положительный курс ${code} к рублю.`);
        return;
      }
      rates[code] = value;
    }
    setError(null);
    inFlight.current = true;
    setSubmitting(true);
    try { await onFxCalculate(rates); }
    catch { setError("Не удалось рассчитать индекс. Проверьте курсы и повторите попытку."); }
    finally { inFlight.current = false; setSubmitting(false); }
  }
  return <section className="min-w-0 space-y-3" aria-label="Индекс выгоды">
    <div><h4 className="font-semibold text-white">Индекс выгоды</h4>
      <p className="text-xs text-slate-400">
        {offers.length === 1
          ? "Предварительный Индекс выгоды рассчитан по доступным критериям и приведён к 10-балльной шкале. Цена пока не оценивается, поскольку получено только одно КП. После получения второго предложения цена будет включена в расчёт автоматически."
          : "Индекс выгоды — сводная оценка коммерческого предложения по 10-балльной шкале. Учитываются соответствие запросу, полнота поставки, срок, финансовое состояние поставщика, цена, условия оплаты, гарантия и полнота коммерческих условий. Чем выше индекс, тем привлекательнее совокупность условий предложения. Критические финансовые показатели отмечаются отдельно."}
      </p></div>
    {benefit?.requires_fx && <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
      <p className="w-full text-sm text-amber-100">Для сравнения цен укажите курс к рублю.</p>
      {benefit.required_fx_currencies.map(code => <label key={code} className="text-xs text-slate-200">
        1 {code} в ₽
        <input aria-label={`Курс ${code} к рублю`} className="mt-1 block w-32 rounded border border-white/20 bg-[#101827] px-2 py-1 text-white"
          inputMode="decimal" value={draft[code] || ""} onChange={event => setDraft(old => ({ ...old, [code]: event.target.value }))} />
      </label>)}
      <Button type="submit" disabled={submitting}>Рассчитать</Button>
      {error && <p role="alert" className="w-full text-red-300">{error}</p>}
    </form>}
    <div className="max-w-full overflow-x-auto rounded-lg border border-white/10">
      <TooltipProvider><table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead><tr className="border-b border-white/10 bg-white/5"><th scope="col" className="min-w-48 p-2 text-slate-300">Критерий</th>
          {offers.map(offer => <th key={offer.result_id} scope="col" className="min-w-36 p-2 text-white">{names.get(offer.result_id) || "Поставщик по КП"}</th>)}</tr></thead>
        <tbody>{criteria.map(criterion => <tr key={criterion.key} className="border-b border-white/10">
          <th scope="row" className="p-2 font-normal"><Tooltip><TooltipTrigger asChild>
            <button type="button" className="cursor-help text-left text-slate-200 underline decoration-dotted underline-offset-2">{criterion.label}</button>
          </TooltipTrigger><TooltipContent className="max-w-xs">{criterion.hint}</TooltipContent></Tooltip></th>
          {offers.map(offer => { const part = byId.get(offer.result_id)?.[criterion.key];
            return <td key={offer.result_id} className={`p-2 tabular-nums ${criterion.key === "financial" && part?.score !== null && Number(part?.score) < 0 ? "font-semibold text-red-300" : ""}`}>{part ? score(part) : "—"} / {criterion.max}</td>;
          })}</tr>)}
          <tr className="bg-[#ffbf00]/10 font-semibold text-[#ffdf72]"><th scope="row" className="p-2">Итого /10</th>
            {offers.map(offer => <td key={offer.result_id} className="p-2 tabular-nums">{byId.get(offer.result_id)?.total_score !== null && byId.get(offer.result_id)?.total_score !== undefined
              ? formatBenefitScore(byId.get(offer.result_id)!.total_score!) : "—"} / 10</td>)}</tr>
        </tbody></table></TooltipProvider>
    </div>
    {offers.map(offer => { const flags = byId.get(offer.result_id)?.financial.reason_codes.filter(code => financialWarnings[code]) || [];
      return flags.length ? <div key={offer.result_id} role="alert" className="text-xs text-red-300">
        <p>Критический финансовый риск — {names.get(offer.result_id)}</p>
        <p>Обнаружены критические финансовые показатели:</p>
        <ul className="list-inside list-disc">{flags.map(code => <li key={code}>{financialWarnings[code]}</li>)}</ul>
      </div> : null;
    })}
  </section>;
}
