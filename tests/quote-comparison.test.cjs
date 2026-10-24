const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relative, stubs = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, localStorage: { getItem: () => "synthetic-actor" },
    require: name => {
      if (name === "@/shared/utils/auth") return { getAuthContextKey: () => 1 };
      if (name in stubs) return stubs[name];
      if (name === "../quoteFormat") return load("src/features/search/quoteFormat.ts");
      if (name === "./QuoteBenefitIndexPanel") return { QuoteBenefitIndexPanel: () => null };
      if (name === "./QuoteBenefitIndexMatrix") return { QuoteBenefitIndexMatrix: () => null };
      if (name === "@/shared/ui/button") return { Button: ({ children }) => React.createElement("button", null, children) };
      return require(name);
    },
  }, { filename: relative });
  return module.exports;
}
const flowPath = "src/features/search/quoteComparisonFlow.ts";
const panelPath = "src/features/search/components/QuoteComparisonPanel.tsx";
const success = { ok: true };
const tick = () => new Promise(resolve => setImmediate(resolve));

test("one ready quote is allowed and uses single-offer analysis mode", () => {
  const panel = load(panelPath, {
    "../quoteComparisonFlow": {
      analyzeQuoteComparison: async () => ({ ok: false, state: "cache_missing_or_stale" }),
    },
  });

  const html = renderToStaticMarkup(
    React.createElement(panel.QuoteComparisonPanel, {
      jobId: 1,
      suppliers: [],
      receivedCount: 1,
      analyzedCount: 1,
      readyIds: [1],
      settled: true,
    }),
  );

  assert.match(html, /Анализ предложения/);
  assert.doesNotMatch(html, /минимум два КП/);
});

test("one ready quote uses normal GET cache then POST analysis flow", async () => {
  const calls = [];

  const flow = load(flowPath, {
    "@/api/quoteComparison": {
      getQuoteComparison: async () => {
        calls.push("GET");
        return {
          ok: false,
          state: "cache_missing_or_stale",
        };
      },

      createQuoteComparison: async () => {
        calls.push("POST");
        return success;
      },
    },
  });

  const result = await flow.analyzeQuoteComparison(
    10,
    false,
    "1",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["GET", "POST"]);
});

test("two ready: GET cache miss then one POST, concurrent callers share flight", async () => {
  const calls = [];
  const flow = load(flowPath, { "@/api/quoteComparison": {
    getQuoteComparison: async () => { calls.push("GET"); await tick(); return { ok: false, state: "cache_missing_or_stale" }; },
    createQuoteComparison: async () => { calls.push("POST"); return success; },
  } });
  const first = flow.analyzeQuoteComparison(10, false, "1,2");
  const second = flow.analyzeQuoteComparison(10, false, "1,2");
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.deepEqual(calls, ["GET", "POST"]);
});

test("valid cache never POSTs; retry POSTs only when explicitly requested", async () => {
  const calls = [];
  const flow = load(flowPath, { "@/api/quoteComparison": {
    getQuoteComparison: async () => { calls.push("GET"); return success; },
    createQuoteComparison: async () => { calls.push("POST"); return success; },
  } });
  await flow.analyzeQuoteComparison(11);
  assert.deepEqual(calls, ["GET"]);
  await flow.analyzeQuoteComparison(11, true);
  assert.deepEqual(calls, ["GET", "POST"]);
});

test("new ready set queues after current flight and refreshes", async () => {
  let release;
  const calls = [];
  const flow = load(flowPath, { "@/api/quoteComparison": {
    getQuoteComparison: async () => { calls.push("GET"); return { ok: false, state: "cache_missing_or_stale" }; },
    createQuoteComparison: async () => { calls.push("POST"); if (calls.filter(x => x === "POST").length === 1)
      await new Promise(resolve => { release = resolve; }); return success; },
  } });
  const first = flow.analyzeQuoteComparison(12, false, "1,2");
  await tick();
  const next = flow.analyzeQuoteComparison(12, false, "1,2,3");
  assert.deepEqual(calls, ["GET", "POST"]);
  release();
  await Promise.all([first, next]);
  assert.deepEqual(calls, ["GET", "POST", "GET", "POST"]);
});

test("comparison cards render partial, scope labels, currencies and neutral terms", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const offers = [
    { result_id: 1, supplier_name: "Альфа", total_amount: "100", currency: "RUB", vat_mode: "included", vat_rate_percent: "22", payment_stages: [], payment_terms: "После поступления денег", delivery_days_min: 10, delivery_days_max: 15, delivery_terms: "Часть на складе", availability: "На складе", delivery_included: null, warranty_months: 12 },
    { result_id: 2, supplier_name: "Бета", total_amount: "200", currency: "USD", vat_mode: "excluded", vat_rate_percent: null, payment_stages: [], delivery_days_min: null, delivery_days_max: null, delivery_included: false, warranty_months: null },
    { result_id: 3, supplier_name: "Гамма", total_amount: null, currency: "UNKNOWN", vat_mode: "unknown", vat_rate_percent: null, payment_stages: [], delivery_days_min: null, delivery_days_max: null, delivery_included: null, warranty_months: null },
  ];
  const response = { ok: true, partial: true, offers, excluded_result_ids: [4], financial_contexts: [], analysis: {
    executive_summary: "Состав поставки отличается", key_differences: ["Иные материалы"],
    commercial_terms_notes: ["Уточнить оплату"], financial_notes: ["Финансовый контекст ограничен"],
    clarification_questions: ["Уточнить доставку"], scope_assessments: [
      { result_id: 1, scope_match: "full", match_type: "exact", notes: [], missing_items: [], extra_or_different_items: [] },
      { result_id: 2, scope_match: "full", match_type: "analog", notes: ["Иная модель"], missing_items: [], extra_or_different_items: [] },
      { result_id: 3, scope_match: "unclear", match_type: "unclear", notes: [], missing_items: [], extra_or_different_items: [] },
    ],
  } };
  const html = renderToStaticMarkup(React.createElement(panel.ComparisonContent, {
    response, suppliers: [], receivedCount: 4, analyzedCount: 3,
  }));
  for (const value of ["3 из 4 КП", "Точное соответствие", "Предложен аналог", "Недостаточно данных", "USD", "₽", "с НДС 22%", "без НДС", "Доставка: не указано", "Оплата: После поступления денег", "Наличие: На складе", "Что уточнить", "Краткий вывод", "Ключевые различия", "Коммерческие условия", "Финансовое состояние", "Финансовый контекст ограничен", "Недостаточно официальных финансовых данных"])
    assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /Требует проверки аналога|✓ Соответствует запросу/);
  assert.doesNotMatch(html, /Лучший поставщик|Победитель|Ограничения сравнения|Наблюдения|<table|overflow-x-auto/);
  assert.match(html, /grid gap-2 sm:grid-cols-2/);
  assert.match(html, /font-semibold text-\[#ffbf00\]/);
});

test("match_type alone defines all four visible product verdicts", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const kinds = ["exact", "analog", "mismatch", "unclear"];
  const offers = kinds.map((_, index) => ({
    result_id: index + 1, supplier_name: `Поставщик ${index + 1}`, total_amount: "100",
    currency: "RUB", vat_mode: "included", vat_rate_percent: null, payment_stages: [],
    payment_terms: null, delivery_days_min: null, delivery_days_max: null, delivery_terms: null,
    availability: null, delivery_included: null, warranty_months: null,
  }));
  const response = { ok: true, partial: false, offers, excluded_result_ids: [], financial_contexts: [],
    analysis: { executive_summary: "Кратко", key_differences: [], commercial_terms_notes: [],
      financial_notes: [], clarification_questions: [], scope_assessments: kinds.map((match_type, index) => ({
        result_id: index + 1, scope_match: "full", match_type, notes: [], missing_items: [],
        extra_or_different_items: [],
      })) } };
  const html = renderToStaticMarkup(React.createElement(panel.ComparisonContent, {
    response, suppliers: [], receivedCount: 4, analyzedCount: 4,
  }));
  for (const label of ["✓ Точное соответствие", "~ Предложен аналог",
    "✕ Не соответствует запросу", "? Недостаточно данных"])
    assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /✓ Соответствует запросу|Требует проверки аналога/);
  const source = fs.readFileSync(path.join(__dirname, "..", panelPath), "utf8");
  assert.match(source, /MATCH_LABELS\[assessment\.match_type\]/);
  assert.doesNotMatch(source, /SCOPE_LABELS\[assessment\.scope_match\]/);
});

test("structured financial cards show backend metrics and hide null values", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const makeOffer = (id, name) => ({ result_id: id, supplier_name: name,
    total_amount: "200000", currency: "RUB", vat_mode: "included", vat_rate_percent: "22",
    payment_stages: [], payment_terms: null, delivery_days_min: null, delivery_days_max: null,
    delivery_terms: null, availability: null, delivery_included: null, warranty_months: null });
  const offers = [makeOffer(55, 'Общество с ограниченной ответственностью "Лунда"'),
    makeOffer(56, 'ООО "ТИК"')];
  const context = { result_id: 55, available: true,
    company_name: 'Общество с ограниченной ответственностью "Лунда"', financial_year: 2025,
    revenue_rub: 10000000, net_profit_rub: 100000, local_tax_year: null };
  const financial_contexts = [
    { result_id: 55, context, metrics: { working_capital_rub: 500000, current_ratio: "1.5000",
      net_margin_percent: "1.0000", equity_ratio_percent: "71.684", order_to_revenue_percent: "2.00",
      prepayment_amount_rub: null } },
    { result_id: 56, context: { result_id: 56, available: false, company_name: null, financial_year: null },
      metrics: { working_capital_rub: null, current_ratio: null, order_to_revenue_percent: null, prepayment_amount_rub: null } },
  ];
  const response = { ok: true, partial: false, offers, excluded_result_ids: [], financial_contexts,
    analysis: { executive_summary: "Краткий вывод", summary: "OLD-LONG-SUMMARY-SHOULD-NOT-RENDER",
      key_differences: ["Разный состав"], commercial_terms_notes: ["Оплата различается"],
      financial_notes: ["Стоимость заказа невелика относительно бизнеса"],
      comparison_limits: ["LEGACY LIMIT"], observations: [{ text: "LEGACY OBSERVATION" }],
      financial_assessments: [{ result_id: 55, text: "LEGACY ASSESSMENT",
        factors: ["LEGACY FACTOR"], confidence: "medium" }],
      clarification_questions: ["Уточнить материалы"], scope_assessments: [] } };
  const html = renderToStaticMarkup(React.createElement(panel.ComparisonContent, {
    response, suppliers: [], receivedCount: 2, analyzedCount: 2,
  }));
  for (const value of ["ООО &quot;Лунда&quot;", "Ключевые различия", "Разный состав", "Оплата различается",
    "Финансовое состояние", "Выручка", "Оборотный капитал", "Текущая ликвидность", "Чистая маржа",
    "Доля капитала", "Заказ / выручка", "2,00%", "Стоимость заказа невелика относительно бизнеса",
    "Финансовые данные недоступны", "Уточнить материалы"])
    assert.ok(html.includes(value), value);
  for (const value of ["OLD-LONG-SUMMARY-SHOULD-NOT-RENDER", "LEGACY LIMIT", "LEGACY OBSERVATION",
    "LEGACY ASSESSMENT", "LEGACY FACTOR", "Динамика:", "Ограничения сравнения", "Наблюдения",
    "NaN", "undefined", "null"])
    assert.ok(!html.includes(value), value);
  assert.equal((html.match(/ООО &quot;Лунда&quot;/g) || []).length, 3);
  assert.doesNotMatch(html, /По данным ФНС:/);
  assert.match(html, /min-w-0/);
});

test("financial formatters use compact rubles and safe ratios and percentages", () => {
  const format = load("src/features/search/quoteFormat.ts");
  assert.equal(format.formatFinancialRatio("3.7441"), "3,74");
  assert.equal(format.formatFinancialRatio("1.7123"), "1,71");
  assert.equal(format.formatFinancialRub(3372047000), "3,37 млрд ₽");
  assert.equal(format.formatFinancialRub(16090000), "16,09 млн ₽");
  assert.equal(format.formatFinancialRub(651658000), "651,66 млн ₽");
  assert.equal(format.formatFinancialPercent("71.684"), "71,68%");
  assert.equal(format.formatOrderToRevenuePercent("0.0012494"), "<0,01%");
  assert.equal(format.formatOrderToRevenuePercent(0), "0%");
  assert.equal(format.formatOrderToRevenuePercent("NaN"), "—");
});

test("quote name stays primary and a different official name is secondary", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const offer = { result_id: 56, supplier_name: 'ООО "ЗАВОД "ТИК"', total_amount: "350055.82",
    currency: "RUB", vat_mode: "included", vat_rate_percent: "22", prepayment_percent: null,
    payment_stages: [], payment_terms: "Оплата после получения", delivery_days_min: null,
    delivery_days_max: null, delivery_included: null, warranty_months: null };
  const response = { ok: true, partial: false, offers: [offer], financial_contexts: [{ result_id: 56,
    context: { available: true, company_name: 'ООО "ЗАВОД "ТРУБ И КОМПЕНСАТОРОВ"', financial_year: 2025 },
    metrics: { working_capital_rub: null, current_ratio: null, net_margin_percent: null,
      equity_ratio_percent: null, order_to_revenue_percent: null, prepayment_amount_rub: null } }],
    analysis: { executive_summary: "Вывод", key_differences: [], commercial_terms_notes: [],
      financial_notes: [], scope_assessments: [], clarification_questions: [] } };
  const html = renderToStaticMarkup(React.createElement(panel.ComparisonContent, {
    response, suppliers: [], receivedCount: 1, analyzedCount: 1,
  }));
  assert.match(html, /<h5 class="font-medium text-white">ООО &quot;ЗАВОД &quot;ТИК&quot;<\/h5>/);
  assert.match(html, /По данным ФНС: ООО &quot;ЗАВОД &quot;ТРУБ И КОМПЕНСАТОРОВ&quot;/);
  assert.match(html, /font-semibold text-\[#ffbf00\]/);
  assert.doesNotMatch(html, /NaN|undefined|null/);
});

test("prepayment wording distinguishes explicit, unspecified and uncalculable amounts", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const metrics = { prepayment_amount_rub: null };
  const offer = { prepayment_percent: null, payment_stages: [], payment_terms: null };
  assert.equal(panel.prepaymentLabel({ ...offer, prepayment_percent: "30" },
    { metrics: { prepayment_amount_rub: "60941.93" } }), "Предоплата: 30% — 60 941,93 ₽");
  assert.equal(panel.prepaymentLabel({ ...offer, payment_stages: [{ timing: "before_shipment", percent: null }] },
    { metrics }), "Процент аванса не указан");
  assert.equal(panel.prepaymentLabel({ ...offer, payment_terms: "Оплата до получения товара" },
    { metrics }), "Процент аванса не указан");
  assert.equal(panel.prepaymentLabel(offer, { metrics }), "Условия предоплаты не указаны");
  assert.equal(panel.prepaymentLabel({ ...offer, payment_terms: "Оплата по договору" },
    { metrics }), "Сумма предоплаты не рассчитана");
});

test("legal company-name helper changes only the opening legal form", () => {
  const format = load("src/features/search/quoteFormat.ts").formatLegalCompanyName;
  assert.equal(format('Общество с ограниченной ответственностью "Лунда"'), 'ООО "Лунда"');
  assert.equal(format('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ЛУНДА"'), 'ООО "ЛУНДА"');
  assert.equal(format('ООО "Лунда"'), 'ООО "Лунда"');
  assert.equal(format('Название: Общество с ограниченной ответственностью "Лунда"'),
    'Название: Общество с ограниченной ответственностью "Лунда"');
});

test("delivery formatter preserves equal, partial, range and text terms", () => {
  const panel = load(panelPath, { "../quoteComparisonFlow": {} });
  const base = { delivery_days_min: null, delivery_days_max: null, delivery_terms: null };
  const cases = [
    [{ delivery_days_max: 10 }, "до 10 дней"],
    [{ delivery_days_min: 5 }, "от 5 дней"],
    [{ delivery_days_min: 10, delivery_days_max: 10 }, "10 дней"],
    [{ delivery_days_min: 5, delivery_days_max: 10 }, "5–10 дней"],
    [{ delivery_terms: "Частично на складе" }, "Частично на складе"],
    [{}, "не указано"],
  ];
  for (const [offer, expected] of cases)
    assert.equal(panel.formatComparisonDelivery({ ...base, ...offer }), expected);
});
