import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/api/client";
import { getQuoteAnalysisSource, type QuoteAnalysisSuccess, type QuoteAnalysisResponse, type SupplierInnUpdate } from "@/api/quoteAnalysis";
import type { Supplier } from "@/shared/types/rfq";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { analyzeResultQuote } from "../quoteAnalysisFlow";
import { formatLegalCompanyName, formatQuoteDecimal, PAYMENT_LABELS } from "../quoteFormat";
import { QuoteComparisonPanel } from "./QuoteComparisonPanel";
import type { BenefitIndexSuccess } from "@/api/quoteBenefitIndex";
import type { QuoteComparisonSuccess } from "@/api/quoteComparison";

export { formatQuoteDecimal, PAYMENT_LABELS } from "../quoteFormat";
export function sourceLabel(ref: string) {
  const page = ref.match(/:page:(\d+)$/);
  if (page) return `Страница ${page[1]}`;
  const sheet = ref.match(/:sheet:(.*):row:(\d+)$/);
  if (sheet) {
    let name = sheet[1]; try { name = decodeURIComponent(name); } catch { /* Keep the backend label. */ }
    return `Лист ${name}, строка ${sheet[2]}`;
  }
  if (ref.includes(":body:")) return "Текст письма";
  if (ref.includes(":subject:")) return "Тема письма";
  return "Фрагмент документа";
}
type Status = "checking_cache" | "analyzing" | "ready" | "insufficient_data" | "no_quote" | "error";
type Entry = { status: Status; response?: QuoteAnalysisSuccess; error?: string };
export function quoteAnalysisError(failure: unknown): string {
  const code = typeof failure === "object" && failure !== null && "error_code" in failure ? failure.error_code : undefined;
  if (code === "quote_ai_source_unavailable") return "Не удалось прочитать файл КП.";
  if (code === "quote_ai_provider_error" || (failure instanceof ApiError && [429, 502, 503, 504].includes(failure.status)))
    return "Сервис AI временно недоступен.";
  if (typeof code === "string" && ["quote_ai_invalid_schema", "quote_ai_invalid_json", "quote_ai_incomplete_output",
    "quote_ai_invalid_source", "quote_ai_invalid_source_ref", "quote_ai_invalid_evidence_field", "quote_ai_missing_evidence",
    "quote_ai_ungrounded_party_inn", "quote_ai_input_budget_error", "quote_ai_invalid_cache"].includes(code))
    return "Не удалось обработать данные КП.";
  return "Не удалось выполнить AI-анализ КП.";
}
type SourceAnalysis = QuoteAnalysisSuccess["analysis"];
type SourceView = { ref: string; loading: boolean; text?: string; error?: string; analysis?: SourceAnalysis };
export function quoteSourceError(error: unknown) {
  return error instanceof ApiError && error.status === 410 ? "Источник изменён или больше недоступен." :
    error instanceof ApiError && error.status === 404 ? "Источник не найден." : "Не удалось загрузить источник.";
}

export function OfferCard({ supplier, response, onSource }: {
  supplier: Supplier;
  response: QuoteAnalysisSuccess;
  onSource: (id: number, ref: string, analysis: SourceAnalysis) => void;
}) {
  const a = response.analysis;
  const allSourceRefs = [
    ...new Set([
      ...a.supplier_inn_source_refs,
      ...a.evidence.flatMap((item) => item.source_refs),
    ]),
  ];
  const primarySourceRef = allSourceRefs[0] || null;
  const vat = a.vat_mode === "included" ? `с НДС${a.vat_rate_percent !== null ? ` ${formatQuoteDecimal(a.vat_rate_percent)}%` : ""}` :
    a.vat_mode === "excluded" ? "без НДС" : a.vat_mode === "no_vat" ? "НДС не облагается" : "НДС не указан";
  const currency = a.currency === "RUB" ? "₽" : a.currency === "UNKNOWN" ? "Валюта не указана" : a.currency === "OTHER" ? "Другая валюта" : a.currency;
  const days = a.delivery_days_min !== null && a.delivery_days_max !== null ?
    `${a.delivery_days_min}${a.delivery_days_min !== a.delivery_days_max ? `–${a.delivery_days_max}` : ""} дней` :
    a.delivery_days_min !== null ? `От ${a.delivery_days_min} дней` : a.delivery_days_max !== null ? `До ${a.delivery_days_max} дней` : null;
  const update = response.supplier_inn_update;
  const primaryName = formatLegalCompanyName(a.supplier_name || supplier.supplier_name || supplier.contact || supplier.source_url);
  const secondaryName = [supplier.contact, supplier.supplier_name, supplier.source_url]
    .find(value => value && value !== primaryName);
  return <article className="min-w-0 space-y-4 rounded-xl border border-white/10 bg-[#151f2d] p-4 text-sm [overflow-wrap:anywhere]">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-semibold text-white">{primaryName}</h3>
        {secondaryName && <p className="text-slate-300">{secondaryName}</p>}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-slate-400">
          {response.cached ? "Из сохранённого анализа" : "Анализ готов"}
        </span>

        {primarySourceRef && (
          <button
            type="button"
            onClick={() => onSource(response.analysis_id, primarySourceRef, response.analysis)}
            className="text-xs text-sky-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-sky-300"
          >
            Источник КП
          </button>
        )}
      </div>
    </header>
    <div>
      <span>ИНН: {a.supplier_inn || "—"}</span>
    </div>
    {update.status === "applied" && <p className="text-xs text-emerald-300">ИНН найден в КП</p>}
    {update.status === "conflict" && <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
      В КП найден ИНН {update.detected_inn}, сохранён ИНН {update.current_inn}</p>}
    {update.status === "ambiguous" && <p role="status" className="text-amber-100">В документе найдено несколько возможных ИНН поставщика</p>}
    {a.status === "insufficient_data" && <p className="text-slate-300">В КП недостаточно данных для структурированного анализа.</p>}
    <div><div className="flex flex-wrap items-baseline gap-2"><span className="text-2xl font-semibold text-white">{formatQuoteDecimal(a.total_amount)} {a.total_amount !== null ? currency : ""}</span>
      </div><p className="flex flex-wrap gap-2 text-slate-400">{vat} </p></div>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div><h4 className="mb-2 font-medium text-slate-200">Оплата</h4>
        <div className="flex flex-wrap gap-2">{a.payment_stages.map((stage, i) => <div key={i} className="max-w-full rounded-lg border border-white/10 px-3 py-2">
          <p>{stage.percent !== null ? `${formatQuoteDecimal(stage.percent)}% — ` : ""}{PAYMENT_LABELS[stage.timing]}
            {stage.delay_days !== null ? `, через ${stage.delay_days} дней` : ""}</p>
          {stage.description && <p className="text-xs text-slate-400">{stage.description}</p>}
        </div>)}</div>
        {a.payment_terms && <p className="mt-2 text-slate-400">{a.payment_terms}</p>}
        {!a.payment_stages.length && !a.payment_terms && <p className="text-slate-400">Не указана</p>}
      </div>
      <div><h4 className="mb-2 font-medium text-slate-200">Поставка</h4><p>{days || "Срок не указан"}</p>
        {a.delivery_terms && <p className="text-slate-400">{a.delivery_terms}</p>}
        {a.delivery_included !== null && <p className="text-slate-400">{a.delivery_included ? "Доставка включена" : "Доставка не включена"}</p>}
        </div>
      <div><h4 className="mb-2 font-medium text-slate-200">Гарантия</h4><p>{a.warranty_months !== null ? `${a.warranty_months} мес.` : a.warranty_terms ? "" : "Не указана"}</p>
        {a.warranty_terms && <p className="text-slate-400">{a.warranty_terms}</p>}</div>
      <div><h4 className="mb-2 font-medium text-slate-200">Действие предложения</h4>
        <p>{a.valid_until ? `До ${a.valid_until.split("-").reverse().join(".")}` : a.validity_terms ? "" : "Не указано"}</p>
        {a.validity_terms && <p className="text-slate-400">{a.validity_terms}</p>}</div>
    </div>
    <p className="whitespace-pre-wrap text-slate-300">{a.summary}</p>
    {!!a.items.length && <details open={a.items.length === 1} className="min-w-0 rounded-lg border border-white/10 p-3">
      <summary className="cursor-pointer font-medium text-slate-200">Позиции КП ({a.items.length})</summary>
      <div className="mt-3 space-y-3">{a.items.map((item, i) => <div key={i} className="min-w-0 border-t border-white/10 pt-3">
        <p className="font-medium">{item.description}</p><p className="text-slate-400">{[item.manufacturer, item.model].filter(Boolean).join(" · ")}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-300"><span>Количество: {formatQuoteDecimal(item.quantity)} {item.unit}</span>
          <span>Цена: {formatQuoteDecimal(item.unit_price)} {item.currency !== "UNKNOWN" ? item.currency : ""}</span>
          <span>Итого: {formatQuoteDecimal(item.total_price)} {item.currency !== "UNKNOWN" ? item.currency : ""}</span></div>
      </div>)}</div>
    </details>}
  </article>;
}

function quoteCurrencyLabel(value: SourceAnalysis["currency"]): string {
  if (value === "RUB") return "₽";
  if (value === "UNKNOWN") return "";
  if (value === "OTHER") return "";
  return value;
}

function quoteVatLabel(analysis: SourceAnalysis): string {
  if (analysis.vat_mode === "no_vat") return "Без НДС";
  if (analysis.vat_rate_percent !== null) {
    return `${formatQuoteDecimal(analysis.vat_rate_percent)}%`;
  }
  if (analysis.vat_mode === "included") return "Включён";
  if (analysis.vat_mode === "excluded") return "Не включён";
  return "—";
}

function quoteOfferDate(value: string | null): string {
  if (!value) return "—";
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : value;
}

function formatSourceBlocks(text: string | undefined): string[] {
  if (!text) return [];

  const lines = text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());

  const blocks: string[] = [];
  let current = "";

  const flush = () => {
    const value = current.trim();
    if (value) blocks.push(value);
    current = "";
  };

  const startsNewBlock = (line: string) => {
    if (!line) return true;

    // Нумерованные условия договора / счета.
    if (/^\d+[.)]\s+/.test(line)) return true;

    // Отдельные реквизиты и итоговые поля.
    if (
      /^(?:Поставщик|Покупатель|Получатель|Плательщик|Банк получателя|Назначение платежа|Счет на оплату|Сч\.\s*№|ИНН\b|КПП\b|Итого\b|Всего\b|Вес\b|Объ[её]м\b|Руководитель\b|Главный бухгалтер\b|Подготовил\b|Менеджер\b|Телефон\b|Почта\b)/i.test(
        line,
      )
    ) {
      return true;
    }

    return false;
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }

    if (startsNewBlock(line)) {
      flush();
      current = line;
      continue;
    }

    current = current ? `${current} ${line}` : line;
  }

  flush();

  return blocks;
}

export function QuoteAnalysisPanel({ suppliers, onInnSync, jobId, onComparisonChange, benefitIndex, onBenefitFxCalculate }: {
  suppliers: Supplier[]; onInnSync: (resultId: number, update: SupplierInnUpdate) => void; jobId: number;
  onComparisonChange?: (comparison: QuoteComparisonSuccess | null) => void;
  benefitIndex?: BenefitIndexSuccess | null;
  onBenefitFxCalculate?: (rates: Record<string, string>) => Promise<void>;
}) {
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [source, setSource] = useState<SourceView | null>(null);
  const [rawSourceText, setRawSourceText] = useState(false);
  const sourceSequence = useRef(0);
  const requests = useRef(new Map<number, { revision: string; promise: Promise<QuoteAnalysisResponse> }>());
  const signature = suppliers.map(s => `${s.backend_result_id}:${s.last_reply_at}:${s.quote_file_count}:${s.latest_reply?.id}`).join("|");
  useEffect(() => {
    let cancelled = false;
    for (const supplier of suppliers) {
      const id = supplier.backend_result_id;
      if (!id) continue;
      const revision = `${supplier.last_reply_at}:${supplier.quote_file_count}:${supplier.latest_reply?.id}`;
      let request = requests.current.get(id);
      if (!request || request.revision !== revision) {
        setEntries(old => ({ ...old, [id]: { status: "checking_cache" } }));
        const promise = analyzeResultQuote(id, false, () => {
          if (!cancelled) setEntries(old => ({ ...old, [id]: { status: "analyzing" } }));
        }, revision);
        request = { revision, promise };
        requests.current.set(id, request);
      }
      request.promise.then(response => {
        if (cancelled || requests.current.get(id) !== request) return;
        if (response.ok === true) {
          setEntries(old => ({ ...old, [id]: { status: response.analysis.status === "insufficient_data" ? "insufficient_data" : "ready", response } }));
          onInnSync(id, response.supplier_inn_update);
        } else setEntries(old => ({ ...old, [id]: { status: response.state === "no_quote" ? "no_quote" : "error", error: quoteAnalysisError(response) } }));
      }).catch(error => { if (!cancelled && requests.current.get(id) === request) setEntries(old => ({ ...old, [id]: { status: "error", error: quoteAnalysisError(error) } })); });
    }
    return () => { cancelled = true; };
  }, [signature, onInnSync]);

  async function retry(id: number) {
    setEntries(old => ({ ...old, [id]: { status: "analyzing" } }));
    const existing = requests.current.get(id);
    const promise = analyzeResultQuote(id, true, undefined, existing?.revision);
    const request = { revision: existing?.revision || "", promise };
    requests.current.set(id, request);
    try {
      const response = await promise;
      if (requests.current.get(id) !== request) return;
      if (response.ok === true) {
        setEntries(old => ({ ...old, [id]: { status: response.analysis.status === "insufficient_data" ? "insufficient_data" : "ready", response } }));
        onInnSync(id, response.supplier_inn_update);
      } else setEntries(old => ({ ...old, [id]: { status: response.state === "no_quote" ? "no_quote" : "error", error: quoteAnalysisError(response) } }));
    } catch (error) { if (requests.current.get(id) === request) setEntries(old => ({ ...old, [id]: { status: "error", error: quoteAnalysisError(error) } })); }
  }
  async function openSource(id: number, ref: string, analysis: SourceAnalysis) {
    const sequence = ++sourceSequence.current;
    setRawSourceText(false);
    setSource({ ref, loading: true, analysis });
    try {
      const value = await getQuoteAnalysisSource(id, ref);
      if (sourceSequence.current === sequence) {
        setSource({ ref, loading: false, text: value.text, analysis });
      }
    } catch (error) {
      const message = quoteSourceError(error);
      if (sourceSequence.current === sequence) {
        setSource({ ref, loading: false, error: message, analysis });
      }
    }
  }
  const visible = suppliers.filter(s => entries[s.backend_result_id]?.status !== "no_quote");
  const analyzed = visible.filter(s => ["ready", "insufficient_data"].includes(entries[s.backend_result_id]?.status)).length;
  const readyIds = visible.filter(s => entries[s.backend_result_id]?.status === "ready").map(s => s.backend_result_id);
  const settled = suppliers.every(s => ["ready", "insufficient_data", "no_quote", "error"].includes(entries[s.backend_result_id]?.status));
  return <div className="mt-6 min-w-0 space-y-4 text-slate-200">
    <header><h2 className="text-lg font-semibold text-white">AI-анализ коммерческих предложений</h2>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>КП получено: {visible.length}</span>
        <span>Проанализировано: {analyzed}</span><span>Ожидает анализа: {visible.length - analyzed}</span></div></header>
    {!visible.length && <p className="text-sm text-slate-400">Коммерческие предложения пока не получены.</p>}
    {visible.map(supplier => {
      const id = supplier.backend_result_id; const entry = entries[id];
      if (entry?.response) return <OfferCard key={id} supplier={supplier} response={entry.response} onSource={openSource} />;
      return <div key={id} className="min-w-0 rounded-xl border border-white/10 bg-[#151f2d] p-4 text-sm [overflow-wrap:anywhere]">
        <p className="mb-2 font-medium">{supplier.supplier_name || supplier.contact || supplier.source_url}</p>
        {entry?.status === "error" ? <><p role="status">{entry.error || "Не удалось выполнить AI-анализ КП."}</p><Button variant="outline" className="mt-3" onClick={() => void retry(id)}>Повторить</Button></> :
          <p role="status" className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />Анализируем КП…</p>}
      </div>;
    })}
    <QuoteComparisonPanel jobId={jobId} suppliers={suppliers} receivedCount={visible.length} analyzedCount={analyzed}
      readyIds={readyIds} settled={settled} onComparisonChange={onComparisonChange}
      benefitIndex={benefitIndex} onBenefitFxCalculate={onBenefitFxCalculate} />
        <Dialog
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) {
          sourceSequence.current++;
          setSource(null);
          setRawSourceText(false);
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="
          flex max-h-[88dvh] w-[calc(100%_-_2rem)] max-w-4xl
          flex-col gap-0 overflow-hidden
          border-white/10 bg-[#111827] p-0 text-white
        "
      >
        <DialogHeader className="shrink-0 border-b border-white/10 px-6 py-5 pr-14">
          <div className="flex items-start justify-between gap-6">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Источник КП
              </DialogTitle>

              <DialogDescription className="mt-1 text-sm text-slate-400">
                {source ? sourceLabel(source.ref) : ""}
                {source && !source.loading && !source.error
                  ? " · Извлечённый текст документа"
                  : ""}
              </DialogDescription>
            </div>

            {source?.text && !source.loading && !source.error && (
              <button
                type="button"
                onClick={() => setRawSourceText((value) => !value)}
                className="
                  shrink-0 text-xs text-slate-400
                  transition-colors hover:text-slate-200
                "
              >
                {rawSourceText ? "Читаемый вид" : "Исходный текст"}
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {source?.loading ? (
            <div
              role="status"
              className="py-10 text-center text-sm text-slate-400"
            >
              Загружаем источник…
            </div>
          ) : source?.error ? (
            <div
              role="status"
              className="
                rounded-lg border border-red-500/20
                bg-red-500/10 px-4 py-3
                text-sm text-red-200
              "
            >
              {source.error}
            </div>
          ) : rawSourceText ? (
            <div
              className="
                mx-auto max-w-[78ch]
                whitespace-pre-wrap break-words
                text-[14px] leading-7 text-slate-300
                [overflow-wrap:anywhere]
              "
            >
              {source?.text?.trim()}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1100px] space-y-6">
              {source?.analysis && (
                <>
                  <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="text-xs text-slate-500">Поставщик</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {source.analysis.supplier_name || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">ИНН</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {source.analysis.supplier_inn || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Документ</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {source.analysis.offer_number
                          ? `№ ${source.analysis.offer_number}`
                          : "Номер не указан"}
                        {source.analysis.offer_date
                          ? ` от ${quoteOfferDate(source.analysis.offer_date)}`
                          : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Итого</div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {formatQuoteDecimal(source.analysis.total_amount)}
                        {source.analysis.total_amount !== null
                          ? ` ${quoteCurrencyLabel(source.analysis.currency)}`
                          : ""}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        НДС: {quoteVatLabel(source.analysis)}
                      </div>
                    </div>
                  </div>

                  {source.analysis.items.length > 0 && (
                    <section className="overflow-hidden rounded-lg border border-white/10">
                      <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
                        <h3 className="text-sm font-semibold text-white">
                          Позиции КП ({source.analysis.items.length})
                        </h3>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-sm">
                          <thead className="bg-white/[0.025] text-xs text-slate-400">
                            <tr>
                              <th className="w-12 px-3 py-2.5 text-left font-medium">№</th>
                              <th className="px-3 py-2.5 text-left font-medium">Наименование</th>
                              <th className="w-20 px-3 py-2.5 text-right font-medium">Кол.</th>
                              <th className="w-20 px-3 py-2.5 text-left font-medium">Ед.</th>
                              <th className="w-32 px-3 py-2.5 text-right font-medium">Цена</th>
                              <th className="w-20 px-3 py-2.5 text-right font-medium">НДС</th>
                              <th className="w-36 px-3 py-2.5 text-right font-medium">Сумма</th>
                            </tr>
                          </thead>

                          <tbody>
                            {source.analysis.items.map((item, index) => (
                              <tr
                                key={`${index}-${item.description}`}
                                className="border-t border-white/10 align-top"
                              >
                                <td className="px-3 py-3 text-slate-500">
                                  {index + 1}
                                </td>

                                <td className="px-3 py-3">
                                  <div className="font-medium leading-5 text-slate-100">
                                    {item.description}
                                  </div>
                                  {(item.manufacturer || item.model) && (
                                    <div className="mt-1 text-xs leading-5 text-slate-400">
                                      {[item.manufacturer, item.model]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </div>
                                  )}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-200">
                                  {formatQuoteDecimal(item.quantity)}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                                  {item.unit || "—"}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-200">
                                  {formatQuoteDecimal(item.unit_price)}
                                  {item.unit_price !== null && item.currency !== "UNKNOWN"
                                    ? ` ${item.currency === "RUB" ? "₽" : item.currency}`
                                    : ""}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-300">
                                  {quoteVatLabel(source.analysis)}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-100">
                                  {formatQuoteDecimal(item.total_price)}
                                  {item.total_price !== null && item.currency !== "UNKNOWN"
                                    ? ` ${item.currency === "RUB" ? "₽" : item.currency}`
                                    : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          {source.analysis.total_amount !== null && (
                            <tfoot>
                              <tr className="border-t border-white/15 bg-white/[0.035]">
                                <td
                                  colSpan={6}
                                  className="px-3 py-3 text-right font-semibold text-slate-300"
                                >
                                  Итого
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-white">
                                  {formatQuoteDecimal(source.analysis.total_amount)}
                                  {" "}
                                  {quoteCurrencyLabel(source.analysis.currency)}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </section>
                  )}
                </>
              )}

              {source?.text && (
                <details className="rounded-lg border border-white/10 bg-white/[0.015]">
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-300 hover:text-white">
                    Текст страницы
                  </summary>

                  <div className="space-y-4 border-t border-white/10 px-4 py-4">
                    {formatSourceBlocks(source.text).map((block, index) => (
                      <p
                        key={index}
                        className="
                          max-w-[78ch] text-[14px] leading-7 text-slate-300
                          [overflow-wrap:anywhere]
                        "
                      >
                        {block}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
