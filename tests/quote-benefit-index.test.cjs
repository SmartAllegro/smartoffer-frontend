const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
const tag = name => ({ children, ...props }) => React.createElement(name, props, children);
const table = Object.fromEntries([
  ["Table", "table"], ["TableBody", "tbody"], ["TableCell", "td"],
  ["TableHead", "th"], ["TableHeader", "thead"], ["TableRow", "tr"],
].map(([name, html]) => [name, tag(html)]));
const tooltip = {
  TooltipProvider: tag("div"), Tooltip: tag("div"), TooltipTrigger: ({ children }) => children,
  TooltipContent: tag("span"),
};
const stubs = {
  "@/shared/ui/table": table,
  "@/shared/ui/button": { Button: tag("button") },
  "@/shared/ui/input": { Input: tag("input") },
  "@/shared/ui/textarea": { Textarea: tag("textarea") },
  "@/shared/ui/select": Object.fromEntries(
    ["Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"].map(name => [name, () => null])
  ),
  "@/shared/ui/checkbox": { Checkbox: () => null },
  "@/shared/ui/popover": { Popover: () => null, PopoverContent: () => null, PopoverTrigger: () => null },
  "@/shared/ui/dialog": { Dialog: () => null, DialogContent: () => null, DialogHeader: () => null, DialogTitle: () => null },
  "@/shared/ui/collapsible": { Collapsible: () => null, CollapsibleContent: () => null, CollapsibleTrigger: () => null },
  "@/shared/ui/tooltip": tooltip,
  "@/shared/hooks/use-toast": { useToast: () => ({ toast: () => {} }) },
  "@/shared/utils/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
  "@/api/history": {}, "@/api/team": {}, "@/api/emailSignatures": {},
  "@/features/search/components/AddSupplierModal": { AddSupplierModal: () => null },
};
function load(relative, overrides = {}) {
  const compiled = ts.transpileModule(source(relative), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, URL,
    require: name => name in overrides ? overrides[name] : name === "../quoteFormat"
      ? load("src/features/search/quoteFormat.ts") : name === "@/shared/utils/browserSecurity"
      ? load("src/shared/utils/browserSecurity.ts") : stubs[name] || require(name),
  }, { filename: relative });
  return module.exports;
}
const supplier = (id, quote = false, inn = null) => ({
  id: `supplier-${id}`, backend_result_id: id, supplier_name: `Поставщик ${id}`,
  supplier_inn: inn, source_url: "", contact: "", contact_label: "Контакт через сайт",
  status: "found", selected: false, reply_status: quote ? "quote_received" : "no_reply", quote_received: quote,
});
const benefit = (id, total = "7.4", financial = "2", reasons = []) => ({
  result_id: id, status: "ready", total_score: total, reason_codes: reasons,
  ...Object.fromEntries(["product_match", "supply_coverage", "delivery", "price", "payment",
    "warranty", "commercial_completeness"].map(key => [key, { score: "1", reason_codes: [] }])),
  financial: { score: financial, reason_codes: reasons },
});
function renderTable(suppliers, benefits = []) {
  const { SupplierTable } = load("src/features/search/components/SupplierTable.tsx");
  return renderToStaticMarkup(React.createElement(SupplierTable, {
    suppliers, benefitIndexItems: benefits, readOnly: true, requestAnalysisMode: true,
    onToggleSelect: () => {}, onDelete: () => {}, onAdd: () => {}, onUpdateSupplierInn: () => {},
  }));
}
function renderMatrix(items, required = []) {
  const { QuoteBenefitIndexMatrix } = load("src/features/search/components/QuoteBenefitIndexMatrix.tsx");
  return renderToStaticMarkup(React.createElement(QuoteBenefitIndexMatrix, {
    benefit: { ok: true, comparison_id: 1, requires_fx: required.length > 0,
      required_fx_currencies: required, items },
    offers: [{ result_id: 2 }, { result_id: 1 }],
    names: new Map([[1, "ООО Первый"], [2, "ООО Второй"]]), onFxCalculate: async () => {},
  }));
}

test("supplier table keeps manual quote gate, INN placeholder and compact /10", () => {
  const html = renderTable([supplier(1, false), supplier(2, true, "7701234567")], [benefit(1), benefit(2, "8.5")]);
  assert.match(html, /placeholder="10 или 12 цифр"/);
  assert.match(html, /ИНН сохранён/);
  assert.equal((html.match(/Индекс выгоды: /g) || []).length, 1);
  assert.match(html, /Индекс выгоды: 8,5\/10/);
  assert.doesNotMatch(html, /\/100|Соответствие товара/);
});

test("matrix preserves supplier order, eight rows, /10 and a financial warning", () => {
  const html = renderMatrix([benefit(1), benefit(2, "0", "-10",
    ["negative_equity", "current_ratio_below_one"])]);
  assert.ok(html.indexOf("ООО Второй") < html.indexOf("ООО Первый"));
  assert.equal((html.match(/<tr class="border-b border-white\/10"/g) || []).length, 8);
  assert.match(html, /Итого \/10/);
  assert.match(html, /-10 \/ 2/);
  assert.match(html, /Критический финансовый риск/);
  assert.match(html, /Отрицательный собственный капитал/);
  assert.match(html, /Текущая ликвидность ниже 1/);
  assert.match(html, /overflow-x-auto/);
  assert.doesNotMatch(html, /negative_equity|победитель|рекомендуем/);
  const noWarning = renderMatrix([benefit(1), benefit(2)]);
  assert.doesNotMatch(noWarning, /Критический финансовый риск/);
});

test("whole criterion label triggers tooltip without info icon or formulas", () => {
  const code = source("src/features/search/components/QuoteBenefitIndexMatrix.tsx");
  assert.match(code, /<TooltipTrigger asChild>\s*<button[^>]*>\{criterion.label\}<\/button>/);
  assert.match(code, /Оценивается соответствие предложенного оборудования исходному запросу/);
  assert.match(code, /Оценивается наличие необходимых коммерческих условий/);
  assert.doesNotMatch(code, /ⓘ|InfoIcon|price_score\s*=|normalized_cost\s*\/|total_score\s*[+*-]/);
});

test("FX fields only appear for required currencies and scores remain backend values", () => {
  const pending = [benefit(1, null), benefit(2, null)];
  pending.forEach(item => { item.price.score = null; });
  const html = renderMatrix(pending, ["USD", "CNY"]);
  assert.equal((html.match(/Курс (USD|CNY) к рублю/g) || []).length, 2);
  assert.match(html, /— \/ 2/);
  assert.match(html, /— \/ 10/);
  assert.match(html, /Рассчитать/);
  assert.doesNotMatch(html, /Курс EUR/);
  assert.doesNotMatch(source("src/features/search/components/QuoteBenefitIndexMatrix.tsx"), /localStorage|fetch\(|getQuoteBenefitIndex|setTotalScore/);
  const code = source("src/features/search/components/QuoteBenefitIndexMatrix.tsx");
  assert.match(code, /<form onSubmit=\{submit\}/);
  assert.match(code, /await onFxCalculate\(rates\)/);
  assert.match(code, /inFlight\.current = true/);
});

test("one GET per comparison is shared by page callers", async () => {
  let calls = 0;
  const flow = load("src/features/search/quoteBenefitIndexFlow.ts", {
    "@/api/quoteBenefitIndex": { getQuoteBenefitIndex: async jobId => {
      calls++;
      return { ok: true, job_id: jobId, comparison_id: 9, items: [benefit(1)] };
    } },
  });
  const requests = new Map();
  const first = flow.getBenefitIndexOnce(4, 9, requests);
  assert.equal(first, flow.getBenefitIndexOnce(4, 9, requests));
  assert.equal((await first).items[0].total_score, "7.4");
  assert.equal(calls, 1);
  await flow.getBenefitIndexOnce(4, 10, requests);
  assert.equal(calls, 2);
});

test("page owns index and matrix starts the analysis after counters and partial warning", () => {
  const page = source("src/pages/RequestDetailPage.tsx");
  const comparison = source("src/features/search/components/QuoteComparisonPanel.tsx");
  const tableSource = source("src/features/search/components/SupplierTable.tsx");
  assert.match(page, /getBenefitIndexOnce\(numericJobId, comparison\.comparison_id, benefitRequests\.current\)/);
  assert.match(page, /benefitIndexItems=\{benefitIndex\?\.items \|\| \[\]\}/);
  assert.ok(comparison.indexOf('В сравнении: {response.offers.length}') < comparison.indexOf("<QuoteBenefitIndexMatrix"));
  assert.ok(comparison.indexOf('response.partial &&') < comparison.indexOf("<QuoteBenefitIndexMatrix"));
  const matrixPos = comparison.indexOf("<QuoteBenefitIndexMatrix");
  const scopePos = comparison.indexOf('"Сопоставимость с запросом"');
  const termsPos = comparison.indexOf('"Коммерческие условия"');
  const aiPos = comparison.indexOf(">AI-анализ<");

  assert.ok(matrixPos >= 0);
  assert.ok(scopePos >= 0);
  assert.ok(termsPos >= 0);
  assert.ok(aiPos >= 0);

  assert.ok(matrixPos < scopePos);
  assert.ok(scopePos < termsPos);
  assert.ok(termsPos < aiPos);

  assert.match(comparison, /"Сопоставимость предложений"/);
  assert.match(comparison, /"Сравнение условий"/);
  assert.doesNotMatch(tableSource, /getQuoteBenefitIndex|total_score\s*[+*/-]|\.sort\(.*total_score/);
  assert.doesNotMatch(page, /\/100/);
});
