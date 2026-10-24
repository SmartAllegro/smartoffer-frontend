import { preopenDownloadTab, safeWebsiteUrl } from "@/shared/utils/browserSecurity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  createEquipmentAnalysis,
  createSupplierAnalysis,
  type EquipmentAnalysisData,
  type SupplierAnalysisData,
  type SupplierCompanyFinancialYear,
} from "@/api/ai";

import { Button } from "@/shared/ui/button";
import { ChartContainer } from "@/shared/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/shared/utils/utils";
import type { Supplier, SupplierReplyStatus } from "@/shared/types/rfq";

import { SupplierTable } from "@/features/search/components/SupplierTable";
import { QuoteAnalysisPanel } from "@/features/search/components/QuoteAnalysisPanel";
import { calculateQuoteBenefitIndexFx, type BenefitIndexResponse, type BenefitIndexSuccess } from "@/api/quoteBenefitIndex";
import type { QuoteComparisonSuccess } from "@/api/quoteComparison";
import { getBenefitIndexOnce } from "@/features/search/quoteBenefitIndexFlow";
import type { SupplierInnUpdate } from "@/api/quoteAnalysis";
import { syncSupplierQuoteInn } from "@/features/search/quoteAnalysisFlow";

import {
  downloadQuoteFile,
  getHistoryDetail,
  getResultReplies,
  markResultRepliesRead,
  setQuoteReceived,
  updateResultReplyStatus,
  updateResultSupplierInn,
  uploadQuoteFile,
  type HistoryDetailResponse,
  type ReplyStatus,
} from "@/api/history";

import { getTeamHistoryDetail } from "@/api/team";

type HistoryScope = "personal" | "team";

function normalizeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function hasQuoteEvidence(supplier?: Supplier | null): boolean {
  if (!supplier) return false;

  return Boolean(
    supplier.quote_received ||
      supplier.reply_status === "quote_received" ||
      normalizeNumber(supplier.quote_file_count) > 0 ||
      supplier.quote_source === "attachment" ||
      supplier.quote_source === "text" ||
      supplier.quote_source === "link" ||
      supplier.latest_reply?.is_quote
  );
}

type FinancialTab = "results" | "balance";

type FinancialChartPoint = {
  year: number;
  revenue: number | null;
  profit: number | null;
  assets: number | null;
  equity: number | null;
  payable: number | null;
  cash: number | null;
  inventories: number | null;
};

const RUB_FORMATTER = new Intl.NumberFormat("ru-RU");

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sortedFinancialYears(
  years: SupplierCompanyFinancialYear[] | undefined
): SupplierCompanyFinancialYear[] {
  return [...(years || [])]
    .filter((item) => typeof item.year === "number" && Number.isFinite(item.year))
    .sort((a, b) => a.year - b.year);
}

function formatRubExact(value: number | null | undefined): string {
  const n = toNullableNumber(value);
  return n === null ? "—" : `${RUB_FORMATTER.format(n)} ₽`;
}

function formatRubCompact(value: number | null | undefined): string {
  const n = toNullableNumber(value);
  if (n === null) return "—";

  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 1,
    })} млрд ₽`;
  }

  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 1,
    })} млн ₽`;
  }

  if (abs >= 1_000) {
    return `${(n / 1_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 1,
    })} тыс. ₽`;
  }

  return `${RUB_FORMATTER.format(n)} ₽`;
}

function formatAxisRub(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 1,
    })} млрд`;
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 0,
    })} млн`;
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 0,
    })} тыс.`;
  }

  return RUB_FORMATTER.format(value);
}

function mapFinancialChartPoints(
  years: SupplierCompanyFinancialYear[]
): FinancialChartPoint[] {
  return years.map((item) => ({
    year: item.year,
    revenue: toNullableNumber(item.revenue_rub),
    profit: toNullableNumber(item.net_profit_rub),
    assets: toNullableNumber(item.assets_rub),
    equity: toNullableNumber(item.equity_rub),
    payable: toNullableNumber(item.accounts_payable_rub),
    cash: toNullableNumber(item.cash_rub),
    inventories: toNullableNumber(item.inventories_rub),
  }));
}

function FinancialMetricCard({
  label,
  value,
  year,
}: {
  label: string;
  value: number | null | undefined;
  year?: number | null;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 text-base font-semibold leading-tight text-white">
        {formatRubCompact(value)}
      </div>
      <div className="mt-1 text-xs text-white/40">{year || "—"}</div>
    </div>
  );
}

function FinancialDynamicsChart({
  points,
  activeTab,
  onTabChange,
}: {
  points: FinancialChartPoint[];
  activeTab: FinancialTab;
  onTabChange: (tab: FinancialTab) => void;
}) {
  const series =
    activeTab === "results"
      ? [
          { key: "revenue", label: "Выручка", color: "#38bdf8" },
          { key: "profit", label: "Чистая прибыль", color: "#facc15" },
        ]
      : [
          { key: "assets", label: "Активы", color: "#38bdf8" },
          { key: "equity", label: "Капитал", color: "#34d399" },
          { key: "payable", label: "Кредиторская задолженность", color: "#facc15" },
          { key: "cash", label: "Денежные средства", color: "#a78bfa" },
          { key: "inventories", label: "Запасы", color: "#fb7185" },
        ];

  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1220]/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-white/70">
          Финансовая динамика
        </div>

        <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-0.5">
          {(["results", "balance"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                activeTab === tab
                  ? "bg-sky-400/15 text-sky-100"
                  : "text-white/45 hover:text-white/80"
              )}
            >
              {tab === "results" ? "Результаты" : "Баланс"}
            </button>
          ))}
        </div>
      </div>

      {points.length > 1 ? (
        <ChartContainer
          config={{}}
          className="h-56 w-full aspect-auto text-white/55"
        >
          <RechartsLineChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="rgba(255,255,255,0.45)"
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="rgba(255,255,255,0.45)"
              tickFormatter={(value) => formatAxisRub(Number(value))}
            />
            <Tooltip
              cursor={{ stroke: "rgba(125,211,252,0.35)", strokeWidth: 1 }}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#e5e7eb",
              }}
              labelFormatter={(label) => `Год: ${label}`}
              formatter={(value, name) => [
                formatRubExact(typeof value === "number" ? value : null),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}
              iconType="plainline"
            />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </RechartsLineChart>
        </ChartContainer>
      ) : (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
          Недостаточно исторических данных для динамики.
        </div>
      )}
    </div>
  );
}

function deriveSupplierStatus(r: any): {
  status: Supplier["status"];
  error_message?: string;
  error_details?: string;
} {
  const statuses = Array.isArray(r?.email_statuses) ? r.email_statuses : [];

  const failed = statuses.find((x: any) => x?.status === "failed");
  if (failed) {
    const msg = failed?.last_error || "Ошибка отправки";
    return {
      status: "error",
      error_message: msg,
      error_details: failed?.last_error ? String(failed.last_error) : undefined,
    };
  }

  const sent = statuses.find((x: any) => x?.status === "sent");
  if (sent) return { status: "sent" };

  return { status: "found" };
}

function mapResultsToSuppliers(
  detail: HistoryDetailResponse,
  jobId: number
): Supplier[] {
  const createdAt = detail.job?.created_at
    ? new Date(detail.job.created_at)
    : new Date();

  return (detail.results || []).map((r: any) => {
    const derived = deriveSupplierStatus(r);

    const title =
      typeof r?.title === "string" && r.title.trim()
        ? r.title
        : r?.domain || "—";

    const firstEmail =
      Array.isArray(r?.emails) && r.emails.length ? r.emails[0] : "";

    return {
      id: `request-${jobId}-${r.id ?? Math.random().toString(16).slice(2)}`,
      request_id: `job-${jobId}`,
      supplier_name: title,
      contact: firstEmail || "",
      contact_status: firstEmail ? "email" : "site",
      contact_label: firstEmail || "Контакт через сайт",
      source_url: r?.url || "",
      selected: true,
      status: derived.status,
      created_at: createdAt,
      backend_result_id: typeof r?.id === "number" ? r.id : undefined,

      supplier_inn: r?.supplier_inn || null,
      supplier_inn_updated_at: r?.supplier_inn_updated_at
        ? new Date(r.supplier_inn_updated_at)
        : null,

      error_message: derived.error_message,
      error_details: derived.error_details,
      quote_received: !!r?.quote_received,
      quote_received_at: r?.quote_received_at ? new Date(r.quote_received_at) : null,
      reply_status: r?.reply_status || "no_reply",
      quote_source: r?.quote_source || null,
      quote_file_count: normalizeNumber(r?.quote_file_count),
      supplier_replies_count: normalizeNumber(r?.supplier_replies_count),
      unread_supplier_replies_count: normalizeNumber(r?.unread_supplier_replies_count),
      last_reply_at: r?.last_reply_at ? new Date(r.last_reply_at) : null,
      latest_reply: r?.latest_reply || null,
    } as Supplier;
  });
}

function statusLabel(status?: string | null) {
  if (status === "completed") return "Завершён";
  if (status === "processing") return "В работе";
  if (status === "queued") return "В очереди";
  if (status === "failed") return "Ошибка";
  return status || "—";
}

function replyStatusLabel(status?: string | null) {
  if (status === "quote_received") return "КП получено";
  if (status === "in_progress") return "В работе";
  if (status === "clarification_requested") return "Нужны уточнения";
  if (status === "declined") return "Отказ";
  if (status === "manual_review") return "Требует проверки";
  return "КП пока не получено";
}

function safeHost(rawUrl?: string) {
  const value = (rawUrl || "").trim();
  if (!value) return "—";

  try {
    const withProtocol = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
    return new URL(withProtocol).hostname;
  } catch {
    return value;
  }
}

function supplierEmailLabel(s: Supplier): string {
  const email = (s.contact || "").trim();

  if (email && email.includes("@")) {
    return email;
  }

  const label = (s.contact_label || "").trim();

  if (label && label.includes("@")) {
    return label;
  }

  return "Email не найден";
}

function formatCompanyRegistrationDate(value?: string | null): string {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  return value;
}

function supplierRiskLabel(value?: string | null): string {
  if (value === "low") return "Низкий риск";
  if (value === "medium") return "Средний риск";
  if (value === "high") return "Высокий риск";
  return "Недостаточно данных";
}

function supplierRiskClass(value?: string | null): string {
  if (value === "low") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (value === "medium") return "border-[#ffbf00]/25 bg-[#ffbf00]/10 text-[#ffdf72]";
  if (value === "high") return "border-red-500/25 bg-red-500/10 text-red-200";
  return "border-white/10 bg-black/20 text-white/60";
}

function EquipmentAiPanel({ query }: { query: string }) {
  const [analysis, setAnalysis] = useState<EquipmentAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const cleanQuery = query.trim();
  const canAnalyze = cleanQuery.length > 0;

  const loadAnalysis = useCallback(async () => {
    if (!canAnalyze) return;

    setLoading(true);
    setErrorText(null);

    try {
      const result = await createEquipmentAnalysis(cleanQuery);

      if (!result.ok || !result.analysis) {
        throw new Error(result.error || "AI-сервис не вернул анализ");
      }

      setAnalysis(result.analysis);
      setCached(Boolean(result.cached));
    } catch (e) {
      setAnalysis(null);

      const message = e instanceof Error ? e.message : "";

      setErrorText(
        message.includes("AI-сервис временно недоступен")
          ? "AI-сервис временно недоступен. Сохранённой AI-справки для этого оборудования пока нет."
          : "AI-справка временно недоступна. Сохранённой справки для этого оборудования пока нет."
      );
    } finally {
      setLoading(false);
    }
  }, [canAnalyze, cleanQuery]);

  useEffect(() => {
    if (!canAnalyze) return;
    loadAnalysis().catch(() => {});
  }, [canAnalyze, loadAnalysis]);

  return (
    <aside className="h-full rounded-2xl border border-[#2d4059] bg-[#111827] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffbf00]/15 text-[#ffbf00]">
          <Brain className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-base font-semibold">AI-справка</div>
          <div className="text-xs text-white/45">
             по оборудованию
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-1 text-xs text-white/45">Запрос</div>
        <div className="text-sm font-semibold text-white">
          {query || "—"}
        </div>

        {analysis && (
          <div className="mt-2 text-xs text-white/35">
            {cached ? "Сохранённая AI-справка" : "AI-справка сохранена"}
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 rounded-xl border border-[#ffbf00]/20 bg-[#ffbf00]/10 p-3 text-sm text-[#ffdf72]">
          Загружаем AI-справку. Если она уже сохранена, AI-сервис повторно не вызывается.
        </div>
      )}

      {errorText && !loading && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
          {errorText}
        </div>
      )}

      {!loading && !errorText && analysis && (
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/72">
          <section>
            <div className="mb-2 text-sm font-semibold text-white">
              Кратко
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-white/80">
              {analysis.short_summary}
            </div>
          </section>

          {analysis.key_features?.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-semibold text-white">
                Ключевые особенности
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {analysis.key_features.map((item, index) => (
                  <li key={`feature-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {analysis.important_modifications?.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-semibold text-white">
                Модификации и отличия
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {analysis.important_modifications.map((item, index) => (
                  <li key={`mod-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}
{analysis.analogs?.length > 0 && (
  <section>
    <div className="mb-2 text-sm font-semibold text-white">
      Аналоги / альтернативы
    </div>
    <ul className="list-disc space-y-1 pl-5">
      {analysis.analogs.map((item, index) => (
        <li key={`analog-${index}`}>{item}</li>
      ))}
    </ul>
  </section>
)}

          {analysis.rfq_checklist?.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-semibold text-white">
                Что указать в запросе КП
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {analysis.rfq_checklist.map((item, index) => (
                  <li key={`rfq-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {analysis.supplier_questions?.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-semibold text-white">
                Что уточнить у поставщика
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {analysis.supplier_questions.map((item, index) => (
                  <li key={`question-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {analysis.selection_risks?.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-semibold text-white">
                Риски ошибки подбора
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {analysis.selection_risks.map((item, index) => (
                  <li key={`risk-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Важно
            </div>
            {analysis.disclaimer ||
              "AI-справка является вспомогательной. Перед закупкой данные нужно сверять с паспортом, даташитом или официальным каталогом производителя."}
          </section>
        </div>
      )}

      {!loading && !errorText && !analysis && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/55">
          AI-справка появится после первого анализа оборудования.
        </div>
      )}
    </aside>
  );
}

function SupplierAnalysisPanel({
  supplier,
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
}: {
  supplier: Supplier | null;
  suppliers: Supplier[];
  selectedSupplierId: string;
  onSelectSupplier: (supplierId: string) => void;
}) {
  const [supplierAnalysis, setSupplierAnalysis] =
    useState<SupplierAnalysisData | null>(null);
  const [supplierAnalysisLoading, setSupplierAnalysisLoading] = useState(false);
  const [supplierAnalysisError, setSupplierAnalysisError] = useState<string | null>(null);
  const [supplierAnalysisCached, setSupplierAnalysisCached] = useState(false);
  const [financialTab, setFinancialTab] = useState<FinancialTab>("results");

    const backendResultId = supplier?.backend_result_id;

  useEffect(() => {
    let cancelled = false;

    async function loadSupplierAnalysis() {
      if (!backendResultId) {
        setSupplierAnalysis(null);
        setSupplierAnalysisError(null);
        setSupplierAnalysisCached(false);
        return;
      }

      setSupplierAnalysisLoading(true);
      setSupplierAnalysisError(null);

      try {
        const result = await createSupplierAnalysis(backendResultId);

        if (cancelled) return;

        if (!result.ok || !result.analysis) {
          throw new Error(result.error || "AI-анализ поставщика недоступен");
        }

        setSupplierAnalysis(result.analysis);
        setSupplierAnalysisCached(Boolean(result.cached));
      } catch (e) {
        if (cancelled) return;

        setSupplierAnalysis(null);
        setSupplierAnalysisCached(false);
        setSupplierAnalysisError(
          e instanceof Error
            ? e.message
            : "AI-анализ поставщика временно недоступен"
        );
      } finally {
        if (!cancelled) {
          setSupplierAnalysisLoading(false);
        }
      }
    }

    loadSupplierAnalysis().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [backendResultId, supplier?.supplier_inn]);

  if (!supplier) {
  return (
    <aside className="h-full rounded-2xl border border-[#2d4059] bg-[#111827] p-4 text-white">
      <div className="text-base font-semibold">Анализ поставщика</div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 text-xs text-white/45">
          Поставщик
        </div>

        <select
          value={selectedSupplierId}
          onChange={(e) => onSelectSupplier(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#2f3a4d] bg-[#151f2d] px-3 text-sm text-white outline-none focus:border-[#ffbf00]"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
            {supplierEmailLabel(s)}
          </option>
          ))}
        </select>
      </div>

      <div className="mt-4 text-sm text-white/50">
        Выберите поставщика для просмотра карточки.
      </div>
    </aside>
  );
}

  const hasSource = supplier.source_url && supplier.source_url !== "#";
  const companyByInn = supplierAnalysis?.company_by_inn ?? null;
  const isOfficialFnsCompany =
    companyByInn?.source_type === "official_fns";
  const financialYears = sortedFinancialYears(companyByInn?.financial_years);
  const financialChartPoints = mapFinancialChartPoints(financialYears);
  const latestFinancialYear =
    financialYears.length > 0 ? financialYears[financialYears.length - 1] : null;
  const localTax = companyByInn?.local_tax ?? null;
  const profitFinancialYear =
    financialYears.find((item) => item.year === localTax?.year) ||
    latestFinancialYear;
  const hasBfoFinancials = financialYears.length > 0;

  const hasLocalTaxData =
    localTax?.total_income_rub != null ||
    localTax?.total_expenses_rub != null ||
    localTax?.employee_count != null;

  const hasStructuredCompanyData =
    hasBfoFinancials || hasLocalTaxData;
  const domainAssessment = supplierAnalysis?.domain_assessment?.trim() || "";
  const strengths = supplierAnalysis?.strengths || [];
  const dealAssessment = supplierAnalysis?.deal_assessment?.trim() || "";

  return (
    <aside className="h-full rounded-2xl border border-[#2d4059] bg-[#111827] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
  <div className="flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
      <FileText className="h-5 w-5" />
    </div>

    <div className="min-w-0">
      <div className="text-base font-semibold leading-tight text-white">
        Анализ поставщика
      </div>
      <div className="mt-1 truncate text-xs text-white/45">
        {safeHost(supplier.source_url)}
      </div>
    </div>
  </div>

  <div className="mt-4">
    <div className="mb-2 text-xs font-medium text-white/45">
      Выбор по email поставщика
    </div>

    <select
      value={selectedSupplierId}
      onChange={(e) => onSelectSupplier(e.target.value)}
      className="
        h-11
        w-full
        rounded-xl
        border
        border-[#2f3a4d]
        bg-[#151f2d]
        px-3
        text-sm
        font-semibold
        text-white
        outline-none
        transition
        hover:border-[#ffbf00]/60
        focus:border-[#ffbf00]
      "
    >
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {supplierEmailLabel(s)}
        </option>
      ))}
    </select>
  </div>
</div>
       
      <div className="mt-4 space-y-3 text-sm">
        

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/45">Email</div>
          <div className="mt-1 break-all font-semibold text-white">
            {supplier.contact || supplier.contact_label || "—"}
          </div>
        </div>

<div className="rounded-xl border border-white/10 bg-black/20 p-3">
    <div className="mb-2 text-xs text-white/45">
      ИНН
    </div>

    <div className="text-sm font-semibold text-white">
      {supplier.supplier_inn || "Не указан"}
    </div>

    {supplier.supplier_inn ? (
      <div className="mt-1 text-xs text-emerald-300">
        Сохранён вручную
      </div>
    ) : (
      <div className="mt-1 text-xs text-white/45">
        Можно указать вручную в таблице
      </div>
    )}
  </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className={cn(
              "rounded-xl border p-3",
              supplier.status === "sent"
                ? "border-[#ffbf00]/25 bg-[#ffbf00]/10 text-[#ffdf72]"
                : supplier.status === "error"
                  ? "border-red-500/25 bg-red-500/10 text-red-200"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            )}
          >
            <div className="text-xs opacity-70">Письмо</div>
            <div className="mt-1 font-semibold">
              {supplier.status === "sent"
                ? "Отправлено"
                : supplier.status === "error"
                  ? "Ошибка"
                  : "Найден"}
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border p-3",
              hasQuoteEvidence(supplier)
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-black/20 text-white/65"
            )}
          >
            <div className="text-xs opacity-70">КП</div>
            <div className="mt-1 font-semibold">
              {hasQuoteEvidence(supplier)
                ? normalizeNumber(supplier.quote_file_count) > 0
                  ? `Получено · файлов: ${normalizeNumber(supplier.quote_file_count)}`
                  : "Получено"
                : "Нет"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/45">Статус ответа</div>
          <div className="mt-1 font-semibold text-white">
            {replyStatusLabel(supplier.reply_status)}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/45">Диалоги / вложения</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-xs text-white/45">Ответов</div>
              <div className="text-lg font-semibold text-white">
                {normalizeNumber(supplier.supplier_replies_count)}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-xs text-white/45">Файлов КП</div>
              <div className="text-lg font-semibold text-white">
                {normalizeNumber(supplier.quote_file_count)}
              </div>
            </div>
          </div>
        </div>

        {supplier.error_message && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-red-200">
            <div className="text-xs opacity-70">Ошибка</div>
            <div className="mt-1 text-sm">{supplier.error_message}</div>
          </div>
        )}

        {hasSource && (
          <a
            href={safeWebsiteUrl(supplier.source_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#2f3a4d] bg-[#151f2d] px-3 py-2 text-sm font-semibold text-white transition hover:border-[#ffbf00] hover:bg-[#ffbf00] hover:text-[#2b2100]"
          >
            Открыть сайт
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {supplierAnalysisLoading && (
          <div className="rounded-xl border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.10)]">
            AI анализирует данные поставщика, коммуникацию и официальные сведения компании по ИНН, если они доступны.
          </div>
        )}

        {!supplierAnalysisLoading && supplierAnalysisError && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
            {supplierAnalysisError}
          </div>
        )}

        {!supplierAnalysisLoading && !supplierAnalysisError && supplierAnalysis && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-white/70">
            Данные компании по ИНН
          </div>
          {isOfficialFnsCompany && (
            <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
              ФНС / БФО ФНС
            </div>
          )}
        </div>

        {!supplier.supplier_inn ? (
          <div className="text-white/60">
            Укажите ИНН в таблице результатов, чтобы SmartOffer загрузил официальные данные компании и обновил анализ.
          </div>
        ) : companyByInn?.available ? (
          <div className="space-y-2">
            <div>
              <div className="text-xs text-white/45">Компания</div>
              <div className="font-semibold text-white">
                {companyByInn.company_name || "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-white/45">ИНН</div>
                <div>{companyByInn.inn || supplier.supplier_inn || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-white/45">Статус</div>
                <div>{companyByInn.status || "—"}</div>
              </div>
            </div>

            {companyByInn.registration_date && (
              <div>
                <div className="text-xs text-white/45">
                  Дата регистрации
                </div>
                <div>
                  {formatCompanyRegistrationDate(
                    companyByInn.registration_date
                  )}
                </div>
              </div>
            )}

            {companyByInn.legal_address && (
              <div>
                <div className="text-xs text-white/45">Юридический адрес</div>
                <div>{companyByInn.legal_address}</div>
              </div>
            )}

            {companyByInn.main_activity && (
              <div>
                <div className="text-xs text-white/45">Основной ОКВЭД / вид деятельности</div>
                <div>{companyByInn.main_activity}</div>
              </div>
            )}

            {isOfficialFnsCompany && !hasBfoFinancials && (
              <div className="rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100/90">
                {companyByInn.status === "Действует"
                  ? "Компания зарегистрирована и действует, но бухгалтерская отчётность в БФО ФНС пока отсутствует. Финансовая оценка будет доступна после публикации отчётности."
                  : "Бухгалтерская отчётность компании в БФО ФНС пока отсутствует. Финансовая оценка будет доступна после публикации отчётности."}
              </div>
            )}

            {hasStructuredCompanyData ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <FinancialMetricCard
                    label="Доходы"
                    value={localTax?.total_income_rub}
                    year={localTax?.year}
                  />
                  <FinancialMetricCard
                    label="Чистая прибыль"
                    value={profitFinancialYear?.net_profit_rub}
                    year={profitFinancialYear?.year}
                  />
                  <FinancialMetricCard
                    label="Расходы"
                    value={localTax?.total_expenses_rub}
                    year={localTax?.year}
                  />
                </div>

                {localTax?.employee_count != null ? (
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-white/65">
                    ССЧР {localTax.year}: {localTax.employee_count}
                  </div>
                ) : null}

                {financialYears.length > 0 ? (
                  <FinancialDynamicsChart
                    points={financialChartPoints}
                    activeTab={financialTab}
                    onTabChange={setFinancialTab}
                  />
                ) : (
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
                    Недостаточно исторических данных для динамики.
                  </div>
                )}
              </>
            ) : companyByInn.financials?.length ? (
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">
                  Финансовые показатели
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {companyByInn.financials.map((item, index) => (
                    <li key={`company-fin-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!localTax && companyByInn.reliability_notes?.length ? (
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">
                  ССЧР / замечания по данным ФНС
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {companyByInn.reliability_notes.map((item, index) => (
                    <li key={`company-rel-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {isOfficialFnsCompany && (
              <div className="mt-3 rounded-md border border-sky-300/15 bg-sky-950/25 p-2 text-xs text-sky-100/80">
                Сведения о компании получены из официальных источников ФНС и БФО ФНС. Связь найденного сайта и email с указанным ИНН оценивается отдельно.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-white/60">
            <div>
              Официальные данные компании по указанному ИНН недоступны для текущего анализа.
            </div>
            {companyByInn?.limitations && (
              <div className="text-xs text-white/45">
                {companyByInn.limitations}
              </div>
            )}
          </div>
        )}
            </div>

            <div className="rounded-xl border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.10)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-sky-100">
                  <Brain className="h-4 w-4 text-sky-300" />
                  AI-анализ
                </div>

                <div
                  className={cn(
                    "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                    supplierRiskClass(supplierAnalysis.risk_level)
                  )}
                >
                  {supplierRiskLabel(supplierAnalysis.risk_level)}
                </div>
              </div>

              {supplierAnalysis.summary?.trim() && (
                <div>
                  <div className="mb-1 text-xs font-semibold text-white/70">
                    Краткий вывод
                  </div>
                  <div className="text-white/75">
                    {supplierAnalysis.summary}
                  </div>
                </div>
              )}

              {strengths.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-white/70">
                    Сильные стороны
                  </div>
                  <ul className="space-y-1 text-white/70">
                    {strengths.map((item, index) => (
                      <li key={`supplier-strength-${index}`} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {supplierAnalysis.risk_factors?.length > 0 ? (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-white/70">
                    Риски
                  </div>
                  <ul className="space-y-1 text-white/70">
                    {supplierAnalysis.risk_factors.map((item, index) => (
                      <li key={`supplier-risk-${index}`} className="flex gap-2">
                        <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffbf00]/80" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : supplierAnalysis.risk_level === "low" ? (
                <div className="mt-3 text-white/60">
                  Существенных факторов риска не выявлено.
                </div>
              ) : null}

              {dealAssessment && (
                <div className="mt-3 rounded-lg border border-sky-300/15 bg-sky-950/25 p-2 text-white/75">
                  <div className="mb-1 text-xs font-semibold text-white/70">
                    Оценка для сделки
                  </div>
                  <div>{dealAssessment}</div>
                </div>
              )}

              {domainAssessment && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs text-white/65">
                  {domainAssessment}
                </div>
              )}

              <div className="mt-3 text-xs text-white/40">
                {supplierAnalysisCached ? "Сохранённый AI-анализ" : "AI-анализ сохранён"}
              </div>
            </div>
          </div>
        )}

        {!supplierAnalysisLoading && !supplierAnalysisError && !supplierAnalysis && (
          <div className="rounded-xl border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-100">
            AI-анализ появится после выбора поставщика.
          </div>
        )}
      </div>
    </aside>
  );
}

export default function RequestDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const historySearch = typeof location.state?.historySearch === "string" ? location.state.historySearch : "";
  const { toast } = useToast();

  const numericJobId = Number(jobId);

  const [scope, setScope] = useState<HistoryScope>("personal");
  const [detail, setDetail] = useState<HistoryDetailResponse | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [comparison, setComparison] = useState<QuoteComparisonSuccess | null>(null);
  const comparisonRef = useRef<QuoteComparisonSuccess | null>(null);
  const [benefitIndex, setBenefitIndex] = useState<BenefitIndexSuccess | null>(null);
  const benefitRequests = useRef(new Map<string, Promise<BenefitIndexResponse>>());
  const onComparisonChange = useCallback((value: QuoteComparisonSuccess | null) => {
    comparisonRef.current = value;
    setComparison(value);
  }, []);
  useEffect(() => {
    if (!comparison || comparison.job_id !== numericJobId) {
      setBenefitIndex(null);
      return;
    }
    setBenefitIndex(null);
    let cancelled = false;
    getBenefitIndexOnce(numericJobId, comparison.comparison_id, benefitRequests.current)
      .then(value => { if (!cancelled && value.ok && value.comparison_id === comparison.comparison_id) setBenefitIndex(value); })
      .catch(() => { if (!cancelled) setBenefitIndex(null); });
    return () => { cancelled = true; };
  }, [comparison, numericJobId]);
  const onBenefitFxCalculate = useCallback(async (rates: Record<string, string>) => {
    if (!comparison || comparison.job_id !== numericJobId) return;
    const value = await calculateQuoteBenefitIndexFx(numericJobId, rates);
    if (value.ok && value.comparison_id === comparisonRef.current?.comparison_id) setBenefitIndex(value);
  }, [comparison, numericJobId]);
  const quoteSuppliers = useMemo(() => suppliers.filter(s => hasQuoteEvidence(s) && s.backend_result_id), [suppliers]);
  const syncQuoteInn = useCallback((resultId: number, update: SupplierInnUpdate) => {
    setSuppliers(current => syncSupplierQuoteInn(current, resultId, update));
  }, []);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0] || null;
  }, [suppliers, selectedSupplierId]);

  const loadDetail = useCallback(async () => {
    if (!Number.isFinite(numericJobId) || numericJobId <= 0) {
      throw new Error("Некорректный ID запроса");
    }

    setLoading(true);

    try {
      let loaded: HistoryDetailResponse;
      let loadedScope: HistoryScope = "personal";

      try {
        loaded = await getHistoryDetail(numericJobId);
      } catch (personalError) {
        loaded = await getTeamHistoryDetail(numericJobId);
        loadedScope = "team";
      }

      const mapped = mapResultsToSuppliers(loaded, numericJobId);

      setScope(loadedScope);
      setDetail(loaded);
      setSuppliers(mapped);
      setSelectedSupplierId((prev) => {
        if (prev && mapped.some((s) => s.id === prev)) return prev;
        return mapped[0]?.id || "";
      });
    } catch (e) {
      toast({
        title: "Не удалось открыть запрос",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [numericJobId, toast]);

  useEffect(() => {
    loadDetail().catch(() => {});
  }, [loadDetail]);

  async function handleToggleQuote(
    supplierId: string,
    backendResultId: number,
    next: boolean
  ) {
    const prev = suppliers;

    setSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              quote_received: next,
              quote_received_at: next ? new Date() : null,
              reply_status: next ? "quote_received" : "no_reply",
              quote_source: next ? "manual" : null,
            }
          : s
      )
    );

    try {
      const res = await setQuoteReceived(backendResultId, next);

      setSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                quote_received: !!res.quote_received,
                quote_received_at: res.quote_received_at
                  ? new Date(res.quote_received_at)
                  : null,
                reply_status:
                  res.reply_status ||
                  (res.quote_received ? "quote_received" : "no_reply"),
                quote_source: res.quote_source || null,
                quote_file_count: normalizeNumber(res.quote_file_count),
                last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
              }
            : s
        )
      );
    } catch (e) {
      setSuppliers(prev);
      toast({
        title: "Не удалось сохранить отметку КП",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  }

  async function handleSetReplyStatus(
    supplierId: string,
    backendResultId: number,
    status: SupplierReplyStatus
  ) {
    const prev = suppliers;
    const nextReceived = status === "quote_received";

    setSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              reply_status: status,
              quote_received: nextReceived,
              quote_received_at: nextReceived ? new Date() : null,
              quote_source: nextReceived ? "manual" : null,
            }
          : s
      )
    );

    try {
      const res = await updateResultReplyStatus(backendResultId, {
        status: status as ReplyStatus,
        quote_source: status === "quote_received" ? "manual" : null,
        comment: null,
      });

      setSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                reply_status: res.reply_status || status,
                quote_received: !!res.quote_received,
                quote_received_at: res.quote_received_at
                  ? new Date(res.quote_received_at)
                  : null,
                quote_source: res.quote_source || null,
                quote_file_count: normalizeNumber(res.quote_file_count),
                last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
              }
            : s
        )
      );
    } catch (e) {
      setSuppliers(prev);
      toast({
        title: "Не удалось сохранить статус ответа",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  }

async function handleUpdateSupplierInn(
  supplierId: string,
  backendResultId: number,
  supplierInn: string | null
) {
  const prev = suppliers;

  const cleanInn = (supplierInn || "").replace(/\D/g, "");

  if (cleanInn && cleanInn.length !== 10 && cleanInn.length !== 12) {
    toast({
      title: "Некорректный ИНН",
      description: "ИНН должен содержать 10 или 12 цифр.",
      variant: "destructive",
    });
    return;
  }

  setSuppliers((cur) =>
    cur.map((s) =>
      s.id === supplierId
        ? {
            ...s,
            supplier_inn: cleanInn || null,
            supplier_inn_updated_at: cleanInn ? new Date() : null,
          }
        : s
    )
  );

  try {
    const res = await updateResultSupplierInn(
      backendResultId,
      cleanInn || null
    );

    setSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              supplier_inn: res.supplier_inn || null,
              supplier_inn_updated_at: res.supplier_inn_updated_at
                ? new Date(res.supplier_inn_updated_at)
                : null,
            }
          : s
      )
    );

    toast({
      title: res.supplier_inn ? "ИНН сохранён" : "ИНН очищен",
      description: res.supplier_inn || undefined,
    });
  } catch (e) {
    setSuppliers(prev);

    toast({
      title: "Не удалось сохранить ИНН",
      description: e instanceof Error ? e.message : "Ошибка",
      variant: "destructive",
    });
  }
}

  async function handleUploadQuoteFile(
    supplierId: string,
    backendResultId: number,
    file: File
  ) {
    const prev = suppliers;

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла КП — 20 МБ.",
        variant: "destructive",
      });
      return;
    }

    setSuppliers((cur) =>
      cur.map((s) =>
        s.id === supplierId
          ? {
              ...s,
              reply_status: "quote_received",
              quote_received: true,
              quote_received_at: new Date(),
              quote_source: "attachment",
              quote_file_count: normalizeNumber(s.quote_file_count) + 1,
            }
          : s
      )
    );

    try {
      const res = await uploadQuoteFile(backendResultId, file);

      setSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                reply_status: res.reply_status || "quote_received",
                quote_received: !!res.quote_received,
                quote_received_at: res.quote_received_at
                  ? new Date(res.quote_received_at)
                  : null,
                quote_source: res.quote_source || "attachment",
                quote_file_count: normalizeNumber(res.quote_file_count),
                last_reply_at: res.last_reply_at ? new Date(res.last_reply_at) : null,
              }
            : s
        )
      );

      toast({
        title: "КП загружено",
        description: file.name,
      });
    } catch (e) {
      setSuppliers(prev);
      toast({
        title: "Не удалось загрузить КП",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  }

async function handleOpenQuoteFile(
  supplierId: string,
  backendResultId: number
) {
  const tab = preopenDownloadTab();

  try {
    const replies = await getResultReplies(backendResultId);

    const attachments = (replies.items || [])
      .flatMap((reply) => reply.attachments || [])
      .filter((file) => typeof file.id === "number");

    if (!attachments.length) {
      throw new Error("Файл КП не найден. Попробуйте обновить страницу.");
    }

    const file = attachments[0];
    const downloaded = await downloadQuoteFile(file.id);

    const url = URL.createObjectURL(downloaded.blob);

    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = downloaded.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  } catch (e) {
    if (tab && !tab.closed) {
      tab.close();
    }

    toast({
      title: "Не удалось открыть КП",
      description: e instanceof Error ? e.message : "Ошибка",
      variant: "destructive",
    });
  }
}

  async function handleMarkSupplierDialogRead(
    supplierId: string,
    backendResultId: number
  ) {
    if (scope !== "personal") return;

    try {
      const res = await markResultRepliesRead(backendResultId);

      setSuppliers((cur) =>
        cur.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                unread_supplier_replies_count: normalizeNumber(
                  res.unread_supplier_replies_count
                ),
              }
            : s
        )
      );
    } catch {
      // Чтение диалога не должно ломать страницу запроса.
    }
  }

  const job = detail?.job;
  const title = job?.email_subject?.trim() || `Запрос КП — ${job?.query || numericJobId}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3">
  <Button
    type="button"
    variant="outline"
    onClick={() => navigate(historySearch ? `/history?${historySearch}` : "/history")}
    className="
      h-10
      border-[#2f3a4d]
      bg-[#151f2d]
      px-4
      text-white
      hover:border-[#ffbf00]
      hover:bg-[#ffbf00]
      hover:text-[#2b2100]
      active:border-[#ffbf00]
      active:bg-[#ffbf00]
      active:text-[#2b2100]
    "
  >
    <ArrowLeft className="mr-2 h-4 w-4" />
    Назад к истории
  </Button>
</div>

<h1 className="truncate text-2xl font-semibold text-white">
  {loading ? "Загрузка запроса…" : title}
</h1>

{scope === "team" && (
  <div className="mt-2 text-sm text-white/45">
    Командная история
  </div>
)}
          </div>

          <Button
            variant="outline"
            onClick={() => loadDetail()}
            disabled={loading}
            className="h-10 border-[#2f3a4d] bg-[#151f2d] text-white hover:border-[#ffbf00] hover:bg-[#ffbf00] hover:text-[#2b2100]"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Обновить
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-[#2d4059] bg-[#111827] text-white/55">
            Загрузка страницы запроса…
          </div>
        ) : !detail ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-200">
            Запрос не найден или нет доступа.
          </div>
        ) : (
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(560px,1fr)_360px] 2xl:grid-cols-[360px_minmax(640px,1fr)_480px]">
            <div className="min-h-[420px] xl:min-h-0">
              <EquipmentAiPanel query={job?.query || ""} />
            </div>

            <section className="min-h-[520px] min-w-0 overflow-visible rounded-2xl border border-[#2d4059] bg-[#111827] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Поставщики
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    Найдено: {suppliers.length}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    КП: {suppliers.filter((s) => hasQuoteEvidence(s)).length}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-[#ffbf00]/25 bg-[#ffbf00]/10 px-3 py-1 text-[#ffdf72]">
                    <Mail className="h-3.5 w-3.5" />
                    Отправлено: {suppliers.filter((s) => s.status === "sent").length}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-blue-200">
                    <Clock3 className="h-3.5 w-3.5" />
                    Ответов:{" "}
                    {suppliers.reduce(
                      (sum, s) => sum + normalizeNumber(s.supplier_replies_count),
                      0
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
  <Button
    type="button"
    variant="outline"
    onClick={() => setRequestModalOpen(true)}
    className="
      h-10
      border-[#2f3a4d]
      bg-[#151f2d]
      px-4
      text-white
      hover:border-[#ffbf00]
      hover:bg-[#ffbf00]
      hover:text-[#2b2100]
      active:border-[#ffbf00]
      active:bg-[#ffbf00]
      active:text-[#2b2100]
    "
  >
    <FileText className="mr-2 h-4 w-4" />
    Показать исходный запрос
  </Button>
</div>

              <div className="rounded-xl border border-white/10">
                <SupplierTable
                  suppliers={suppliers}
                  benefitIndexItems={benefitIndex?.items || []}
                  onToggleSelect={() => {}}
                  onDelete={() => {}}
                  onAdd={() => {}}
                  disabled={false}
                  readOnly={true}
                  requestAnalysisMode={true}
                  historyScope={scope}
                  onToggleQuote={handleToggleQuote}
                  onSetReplyStatus={handleSetReplyStatus}
                  onUpdateSupplierInn={handleUpdateSupplierInn}
                  onUploadQuoteFile={handleUploadQuoteFile}
                  onOpenQuoteFile={handleOpenQuoteFile}
                  onMarkSupplierDialogRead={handleMarkSupplierDialogRead}
                />
              </div>
              <QuoteAnalysisPanel key={numericJobId} jobId={numericJobId} suppliers={quoteSuppliers}
                onInnSync={syncQuoteInn} onComparisonChange={onComparisonChange}
                benefitIndex={benefitIndex} onBenefitFxCalculate={onBenefitFxCalculate} />
            </section>

            <div className="min-h-[420px] min-w-0 xl:min-h-0">
              <SupplierAnalysisPanel
                supplier={selectedSupplier}
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
              />
            </div>
          </div>
        )}
            </div>

      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col border-white/10 bg-[#111827] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              Исходный запрос
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-auto">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 text-xs text-white/45">
                Оборудование
              </div>
              <div className="whitespace-pre-wrap text-sm font-semibold text-white">
                {job?.query || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 text-xs text-white/45">
                Тема письма
              </div>
              <div className="whitespace-pre-wrap text-sm text-white">
                {job?.email_subject || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 text-xs text-white/45">
                Текст письма
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {job?.email_body || "Текст письма не найден."}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <Button
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
              className="
                w-full
                border-[#2f3a4d]
                bg-[#151f2d]
                text-white
                hover:border-[#ffbf00]
                hover:bg-[#ffbf00]
                hover:text-[#2b2100]
              "
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
