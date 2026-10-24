const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
}}).outputText;

function apiWith(fetch) {
  const module = { exports: {} };
  vm.runInNewContext(compile(read("src/api/history.ts").replaceAll("import.meta.env", "testEnv")), {
    module, exports: module.exports, URLSearchParams, testEnv: {}, require: () => ({ apiFetch: fetch }),
  });
  return module.exports;
}

function harness(query = "", scope = "personal") {
  let search = new URLSearchParams(query);
  const slots = [], calls = [], navigations = [], errors = [];
  let index = 0;
  const stats = { total_jobs: 3, deal_jobs: 0, sent_jobs: 3, not_sent_jobs: 0, unread_jobs: 1, emails_sent_total: 6 };
  let response = { items: [{ id: 1, query: "Schneider", created_at: new Date().toISOString(), history_outcome: "sent", unread_replies_count: 2 }], total: 1 };
  const api = {
    ...apiWith(async url => { calls.push(url); return response; }),
    getHistoryStats: async () => ({ ...stats }),
    getTeamHistoryStats: async () => ({ ...stats }),
    listTeamHistory: async params => { calls.push({ team: params }); return response; },
    markAllRepliesRead: async () => { response = { items: [], total: 0 }; stats.unread_jobs = 0; return { marked_count: 2 }; },
    markResultRepliesRead: async () => ({ unread_supplier_replies_count: 0 }),
  };
  const React = {
    useState(value) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof value === "function" ? value() : value;
      return [slots[slot], next => { slots[slot] = typeof next === "function" ? next(slots[slot]) : next; }];
    },
    useRef(value) { const slot = index++; return slots[slot] ??= { current: value }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {},
  };
  const source = read("src/pages/HistoryPage.tsx");
  // Name the actual state slots so tests can seed the existing inline dialog.
  const component = source.slice(source.indexOf("export default function HistoryPage"));
  const stateNames = [...component.matchAll(/const \[([^,]+),[^\]]+\] = useState/g)].map(match => match[1]);
  const jsx = (type, props) => ({ type, props: props || {} });
  const module = { exports: {} };
  const stubs = new Proxy({}, { get: (_, key) => key });
  vm.runInNewContext(compile(source), {
    module, exports: module.exports, URLSearchParams, Date, Number, Math, console,
    require(name) {
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react-router-dom") return {
        Link: "Link", useNavigate: () => (...args) => navigations.push(args),
        useSearchParams: () => [search, next => { search = typeof next === "function" ? next(search) : next; }],
      };
      if (name === "date-fns" || name === "date-fns/locale") return require(name);
      if (name.includes("api/")) return api;
      if (name.includes("use-toast")) return { useToast: () => ({ toast: value => errors.push(value) }) };
      if (name.includes("utils/utils")) return { cn: (...args) => args.filter(Boolean).join(" ") };
      return stubs;
    },
  });
  const render = () => { index = 0; return module.exports.default(); };
  render();
  const set = (name, value) => { const slot = stateNames.indexOf(name); assert.ok(slot >= 0, name); slots[slot] = value; };
  set("historyScope", scope);
  set("stats", stats);
  function nodes(tree, pred) {
    if (!tree || typeof tree !== "object") return [];
    if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, pred));
    return [...(pred(tree) ? [tree] : []), ...nodes(tree.props?.children, pred)];
  }
  const text = tree => typeof tree === "string" || typeof tree === "number" ? String(tree)
    : Array.isArray(tree) ? tree.map(text).join("") : text(tree?.props?.children ?? "");
  const button = label => nodes(render(), node => ["button", "Button"].includes(node.type) && text(node).startsWith(label))[0];
  const refresh = async () => { await button("Обновить").props.onClick(); assert.equal(errors.length, 0, JSON.stringify(errors)); };
  return { render, nodes, text, button, refresh, calls, navigations, set, api, stats,
    search: () => search, response: value => { response = value; },
    state: name => slots[stateNames.indexOf(name)],
  };
}

test("personal filter uses unread_jobs and the existing yellow active style", () => {
  const h = harness("filter=unread");
  assert.equal(h.text(h.button("Непрочитанные")), "Непрочитанные1");
  assert.equal(h.button("Непрочитанные").props["aria-pressed"], true);
  assert.match(h.button("Непрочитанные").props.className, /border-\[#ffbf00\]/);
  assert.equal(h.text(h.button("Все3")), "Все3");
});

test("all five filter buttons send separate outcome and unread_only parameters", async () => {
  const h = harness();
  for (const [label, outcome, unread] of [["Непрочитанные", "all", "true"], ["Все3", "all", "false"],
    ["Сделка", "deal", "false"], ["Отправлено3", "sent", "false"], ["Без отправки", "not_sent", "false"]]) {
    h.button(label).props.onClick();
    await h.refresh();
    const url = new URL(h.calls.at(-1), "http://127.0.0.1");
    assert.equal(url.searchParams.get("outcome"), outcome);
    assert.equal(url.searchParams.get("unread_only"), unread);
  }
});

test("period and search preserve unread filter; navigation preserves history parameters", async () => {
  const h = harness("filter=unread");
  h.button("7 дней").props.onClick();
  const input = h.nodes(h.render(), n => n.props.placeholder === "Поиск по теме запроса...")[0];
  input.props.onChange({ target: { value: "Schneider" } });
  await h.refresh();
  const url = new URL(h.calls.at(-1), "http://127.0.0.1");
  assert.equal(url.searchParams.get("unread_only"), "true");
  assert.equal(url.searchParams.get("period"), "7d");
  assert.equal(url.searchParams.get("q"), "Schneider");
  const open = h.nodes(h.render(), n => n.props.title === "Открыть запрос")[0];
  assert.ok(open);
  open.props.onClick({ stopPropagation() {} });
  assert.equal(h.navigations[0][0], "/requests/1");
  assert.equal(new URLSearchParams(h.navigations[0][1].state.historySearch).get("filter"), "unread");
});

test("team history hides unread and sends the unchanged team contract", async () => {
  const h = harness("filter=unread", "team");
  assert.equal(h.button("Непрочитанные"), undefined);
  await h.refresh();
  assert.equal(h.calls.at(-1).team.outcome, "all");
  assert.equal(h.calls.at(-1).team.unread_only, undefined);
});

for (const remaining of [0, 1]) {
  test(`reading a dialog refreshes authoritative list with ${remaining} other unread suppliers`, async () => {
    const h = harness("filter=unread");
    h.set("detailSuppliers", [{ id: "supplier1", unread_supplier_replies_count: 1 }]);
    h.set("detailJobId", 1);
    h.set("items", [{ id: 1, created_at: new Date().toISOString(), unread_replies_count: 2 }]);
    h.api.markResultRepliesRead = async () => {
      h.response({ items: remaining ? [{ id: 1, created_at: new Date().toISOString(), unread_replies_count: remaining }] : [], total: remaining });
      h.stats.unread_jobs = remaining;
      return { unread_supplier_replies_count: 0 };
    };
    const table = h.nodes(h.render(), n => n.type === "SupplierTable")[0];
    await table.props.onMarkSupplierDialogRead("supplier1", 10);
    assert.equal(h.state("items").length, remaining);
    assert.equal(h.state("total"), remaining);
    assert.equal(h.state("stats").unread_jobs, remaining);
    assert.equal(h.state("offset"), remaining);
    assert.equal(h.state("hasMore"), false);
    assert.match(h.calls.at(-1), /unread_only=true/);
  });
}

test("read all refreshes empty unread history and counter", async () => {
  const h = harness("filter=unread");
  await h.button("Прочитать все").props.onClick();
  assert.equal(h.state("items").length, 0);
  assert.equal(h.state("stats").unread_jobs, 0);
  assert.match(h.text(h.render()), /Непрочитанных ответов нет/);
});

test("load more retains unread/query/period and uses backend total", async () => {
  const h = harness("filter=unread&period=90d&q=Schneider");
  h.response({ items: [{ id: 1, created_at: new Date().toISOString() }], total: 2 });
  await h.refresh();
  const more = h.button("Загрузить");
  assert.ok(more);
  h.response({ items: [{ id: 2, created_at: new Date().toISOString() }], total: 2 });
  await more.props.onClick();
  const url = new URL(h.calls.at(-1), "http://127.0.0.1");
  assert.equal(url.searchParams.get("offset"), "1");
  assert.equal(url.searchParams.get("unread_only"), "true");
  assert.equal(url.searchParams.get("q"), "Schneider");
  assert.equal(url.searchParams.get("period"), "90d");
  assert.equal(h.state("offset"), 2);
  assert.equal(h.state("hasMore"), false);
});

test("a slow unfiltered response cannot refill the unread list after a filter change", async () => {
  const h = harness();
  let finishOld;
  h.api.listHistory = () => new Promise(resolve => { finishOld = resolve; });
  const oldRequest = h.button("Обновить").props.onClick();
  h.button("Непрочитанные").props.onClick();
  h.api.listHistory = async () => ({ items: [], total: 0 });
  await h.refresh();
  finishOld({ items: [{ id: 999 }], total: 3 });
  await oldRequest;
  assert.equal(h.state("items").length, 0);
  assert.equal(h.state("total"), 0);
  assert.equal(h.state("hasMore"), false);
});

test("a slow pagination response cannot restore rows after read-all refresh", async () => {
  const h = harness("filter=unread");
  h.response({ items: [{ id: 1, created_at: new Date().toISOString() }], total: 2 });
  await h.refresh();
  let finishPage;
  h.api.listHistory = () => new Promise(resolve => { finishPage = resolve; });
  const pending = h.button("Загрузить").props.onClick();
  h.api.listHistory = async () => ({ items: [], total: 0 });
  // Same refresh used after a successful read; avoid the read-all button's busy guard.
  await h.refresh();
  finishPage({ items: [{ id: 2 }], total: 2 });
  await pending;
  assert.equal(h.state("items").length, 0);
  assert.equal(h.state("offset"), 0);
  assert.equal(h.state("total"), 0);
});
