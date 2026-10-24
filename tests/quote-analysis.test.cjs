// Node's built-in runner, existing TypeScript + React only; no network or credentials.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

class ApiError extends Error { constructor(status) { super("private-provider-detail"); this.status = status; } }
function load(relative, api = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  const ui = ({ children }) => React.createElement("div", null, children);
  const context = {
    module, exports: module.exports, localStorage: { getItem: () => "synthetic-test-actor" },
    require: name => {
      if (name === "@/shared/utils/auth") return { getAuthContextKey: api.getAuthContextKey || (() => 1) };
      if (name === "@/api/quoteAnalysis") return api;
      if (name === "@/api/client") return { ApiError };
      if (name.startsWith("@/shared/ui/")) return new Proxy({}, { get: () => ui });
      if (name === "../quoteAnalysisFlow") return {};
      if (name === "../quoteFormat") return load("src/features/search/quoteFormat.ts");
      if (name === "./QuoteComparisonPanel") return {};
      return require(name);
    },
  };
  vm.runInNewContext(compiled, context, { filename: relative });
  return module.exports;
}
const flowPath = "src/features/search/quoteAnalysisFlow.ts";
const panel = load("src/features/search/components/QuoteAnalysisPanel.tsx");
const success = (id = 1) => ({ ok: true, result_id: id });
const tick = () => new Promise(resolve => setImmediate(resolve));

test("valid cache does not POST", async () => {
  let gets = 0, posts = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => { gets++; return success(); },
    createResultQuoteAnalysis: async () => { posts++; return success(); } });
  await flow.analyzeResultQuote(1);
  assert.equal(gets, 1); assert.equal(posts, 0);
});
test("cache missing -> one POST, StrictMode in-flight requests coalesce", async () => {
  let gets = 0, posts = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => { gets++; await tick(); return { ok: false, state: "cache_missing_or_stale" }; },
    createResultQuoteAnalysis: async () => { posts++; return success(); } });
  const first = flow.analyzeResultQuote(1), second = flow.analyzeResultQuote(1);
  assert.equal(first, second);
  await Promise.all([first, second]); assert.equal(gets, 1); assert.equal(posts, 1);
});
test("no_quote and invalid cache do not trigger automatic POST", async () => {
  for (const state of ["no_quote", "cache_invalid"]) {
    let posts = 0;
    const flow = load(flowPath, { getResultQuoteAnalysis: async () => ({ ok: false, state }),
      createResultQuoteAnalysis: async () => { posts++; return success(); } });
    assert.equal((await flow.analyzeResultQuote(1)).state, state); assert.equal(posts, 0);
  }
});
test("POST concurrency <=2, one failed supplier does not hide others", async () => {
  let active = 0, maximum = 0, posts = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => ({ ok: false, state: "cache_missing_or_stale" }),
    createResultQuoteAnalysis: async id => {
      active++; posts++; maximum = Math.max(maximum, active);
      try { await tick(); if (id === 2) throw new Error("synthetic failure"); return success(id); }
      finally { active--; }
    } });
  const results = await Promise.allSettled([1, 2, 3, 4, 5].map(id => flow.analyzeResultQuote(id)));
  assert.equal(maximum, 2); assert.equal(posts, 5);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 4);
  assert.equal(results[1].status, "rejected");
});
test("explicit retry POSTs without an extra cache GET", async () => {
  let gets = 0, posts = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => { gets++; throw new Error("GET forbidden"); },
    createResultQuoteAnalysis: async () => { posts++; return success(); } });
  assert.equal((await flow.analyzeResultQuote(1, true)).ok, true);
  assert.equal(gets, 0); assert.equal(posts, 1);
});

for (const count of [1, 2, 3, 5]) test(`${count} eligible quotes each settle with concurrency <= 2`, async () => {
  let active = 0, maximum = 0;
  const calls = [];
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => ({ ok: false, state: "cache_missing_or_stale" }),
    createResultQuoteAnalysis: async id => {
      calls.push(id); maximum = Math.max(maximum, ++active);
      await tick(); active--; return success(id);
    } });
  const values = await Promise.all(Array.from({ length: count }, (_, i) => flow.analyzeResultQuote(i + 1)));
  assert.equal(values.length, count); assert.equal(calls.length, count);
  assert.ok(values.every(v => v.ok)); assert.ok(maximum <= 2);
});

test("changed revision waits for old work then checks again; StrictMode still coalesces", async () => {
  let release;
  let gets = 0, posts = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => { gets++; return { ok: false, state: "cache_missing_or_stale" }; },
    createResultQuoteAnalysis: async id => { posts++; if (posts === 1) await new Promise(resolve => { release = resolve; }); return success(id); } });
  const first = flow.analyzeResultQuote(1, false, undefined, "old");
  await tick();
  const next = flow.analyzeResultQuote(1, false, undefined, "new");
  assert.notEqual(first, next);
  assert.equal(flow.analyzeResultQuote(1, false, undefined, "new"), next);
  assert.equal(gets, 1); release();
  await Promise.all([first, next]);
  assert.equal(gets, 2); assert.equal(posts, 2);
});

test("failed revision releases queue, next revision rechecks, manual retry recovers", async () => {
  let posts = 0, gets = 0;
  const flow = load(flowPath, { getResultQuoteAnalysis: async () => { gets++; return { ok: false, state: "cache_missing_or_stale" }; },
    createResultQuoteAnalysis: async () => { posts++; await tick(); if (posts === 1) throw new Error("private");
      return posts === 2 ? { ok: false, error_code: "quote_ai_invalid_schema" } : success(); } });
  const first = flow.analyzeResultQuote(1, false, undefined, "old");
  const next = flow.analyzeResultQuote(1, false, undefined, "new");
  await assert.rejects(first);
  assert.equal((await next).error_code, "quote_ai_invalid_schema");
  assert.equal((await flow.analyzeResultQuote(1, true, undefined, "new")).ok, true);
  assert.equal(gets, 2); assert.equal(posts, 3);
});

test("fixed error categories never render arbitrary backend/provider text", () => {
  assert.equal(panel.quoteAnalysisError({ error_code: "quote_ai_source_unavailable" }), "Не удалось прочитать файл КП.");
  assert.equal(panel.quoteAnalysisError({ error_code: "quote_ai_provider_error" }), "Сервис AI временно недоступен.");
  assert.equal(panel.quoteAnalysisError(new ApiError(429)), "Сервис AI временно недоступен.");
  assert.equal(panel.quoteAnalysisError({ error_code: "quote_ai_invalid_schema" }), "Не удалось обработать данные КП.");
  for (const value of [new Error("private"), { error_code: "private-storage-path" }, { error_code: "quote_ai_private-secret" }])
    assert.equal(panel.quoteAnalysisError(value), "Не удалось выполнить AI-анализ КП.");
});

test("queued POST cannot run with another actor's credentials and releases its slot", async () => {
  let actor = 1;
  const calls = [], releases = [];
  const flow = load(flowPath, { getAuthContextKey: () => actor,
    getResultQuoteAnalysis: async () => ({ ok: false, state: "cache_missing_or_stale" }),
    createResultQuoteAnalysis: async id => {
      calls.push(id);
      if (id < 3) await new Promise(resolve => releases.push(resolve));
      return success(id);
    } });
  const first = flow.analyzeResultQuote(1), second = flow.analyzeResultQuote(2);
  const queued = flow.analyzeResultQuote(3);
  const rejected = assert.rejects(queued, /quote_ai_request_superseded/);
  await tick(); actor = 2; releases.forEach(release => release());
  await Promise.all([first, second, rejected]);
  assert.deepEqual(calls, [1, 2]);
  assert.equal((await flow.analyzeResultQuote(4)).ok, true);
  assert.deepEqual(calls, [1, 2, 4]);
});
test("backend current_inn syncs only target; conflict preserves existing value", () => {
  const flow = load(flowPath);
  const suppliers = [{ backend_result_id: 1, supplier_inn: null }, { backend_result_id: 2, supplier_inn: "9991234567" }];
  const update = { status: "applied", current_inn: "7701234567", detected_inn: "7701234567" };
  const synced = flow.syncSupplierQuoteInn(suppliers, 1, update);
  assert.equal(synced[0].supplier_inn, "7701234567"); assert.equal(synced[1], suppliers[1]);
  assert.equal(flow.syncSupplierQuoteInn(synced, 2, { ...update, status: "conflict" }), synced);
  assert.equal(flow.syncSupplierQuoteInn(synced, 1, update), synced);
});
test("Decimal strings format as numbers; unknown remains a dash", () => {
  assert.equal(panel.formatQuoteDecimal("200000"), new Intl.NumberFormat("ru-RU").format(200000));
  assert.equal(panel.formatQuoteDecimal("100000.5"), new Intl.NumberFormat("ru-RU").format(100000.5));
  assert.equal(panel.formatQuoteDecimal(null), "—");
});
test("payment and exact source labels; errors never expose provider detail", () => {
  assert.equal(panel.PAYMENT_LABELS.before_shipment, "Перед отгрузкой");
  assert.equal(panel.PAYMENT_LABELS.on_readiness, "По готовности");
  assert.equal(panel.sourceLabel("attachment:1:sha256:a:page:2"), "Страница 2");
  assert.equal(panel.sourceLabel("attachment:1:sha256:a:sheet:%D0%A2%D0%B5%D1%81%D1%82:row:7"), "Лист Тест, строка 7");
  assert.equal(panel.sourceLabel("reply:1:body:sha256:a"), "Текст письма");
  assert.equal(panel.quoteSourceError(new ApiError(410)), "Источник изменён или больше недоступен.");
  assert.equal(panel.quoteSourceError(new ApiError(404)), "Источник не найден.");
  assert.equal(panel.quoteSourceError(new Error("secret")), "Не удалось загрузить источник.");
});
test("offer renders backend price, stages, conflict, collapsible items and source actions", () => {
  const response = { ok: true, analysis_id: 1, cached: true,
    supplier_inn_update: { status: "conflict", detected_inn: "7701234567", current_inn: "9991234567" },
    analysis: {
      status: "analyzed", supplier_name: "Synthetic supplier", supplier_inn: "7701234567", supplier_inn_confidence: "high",
      supplier_inn_source_refs: ["reply:1:body:sha256:a"], total_amount: "200000", currency: "RUB", vat_mode: "included", vat_rate_percent: "22",
      payment_stages: [{ percent: "30", timing: "advance", delay_days: null, description: null, source_refs: ["reply:1:body:sha256:a"] },
        { percent: "70", timing: "before_shipment", delay_days: null, description: null, source_refs: ["reply:1:body:sha256:a"] }],
      payment_terms: "30% аванс, 70% перед отгрузкой", delivery_days_min: 10, delivery_days_max: 15,
      delivery_terms: null, delivery_included: true, warranty_months: 12, warranty_terms: null,
      valid_until: "2026-12-31", validity_terms: null, summary: "Synthetic summary", evidence: [],
      items: [1, 2].map(n => ({ description: `TEST-P${n}`, quantity: "1", unit: "шт.", unit_price: "100000", total_price: "100000", currency: "RUB" })),
    } };
  const html = renderToStaticMarkup(React.createElement(panel.OfferCard, {
    supplier: { supplier_name: "example.test" }, response, onSource: () => {},
  }));
  for (const text of ["30% — Аванс", "70% — Перед отгрузкой", "с НДС 22%", "10–15 дней", "12 мес.", "Позиции КП (2)", "Источник", "сохранён ИНН 9991234567"])
    assert.ok(html.includes(text), text);
  assert.ok(html.includes("<details")); assert.ok(!html.includes("postpayment")); assert.ok(!html.includes("null"));
});

test("legal supplier name is primary; email and domain remain secondary", () => {
  const response = { ok: true, analysis_id: 1, cached: true,
    supplier_inn_update: { status: "unchanged" }, analysis: {
      status: "analyzed", supplier_name: 'Общество с ограниченной ответственностью "Лунда"', supplier_inn: null, supplier_inn_confidence: "unknown",
      supplier_inn_source_refs: [], evidence: [], total_amount: null, currency: "UNKNOWN",
      vat_mode: "unknown", vat_rate_percent: null, payment_stages: [], payment_terms: null,
      delivery_days_min: null, delivery_days_max: null, delivery_terms: null, delivery_included: null,
      warranty_months: null, warranty_terms: null, valid_until: null, validity_terms: null,
      summary: "Synthetic", items: [],
    } };
  const html = renderToStaticMarkup(React.createElement(panel.OfferCard, {
    supplier: { supplier_name: "smartoffer.pro", contact: "support@smartoffer.pro", source_url: "https://smartoffer.pro" },
    response, onSource: () => {},
  }));
  assert.match(html, /<h3[^>]*>ООО &quot;Лунда&quot;<\/h3><p[^>]*>support@smartoffer\.pro<\/p>/);
  assert.doesNotMatch(html, /<h3[^>]*>smartoffer\.pro<\/h3>/);
});
