const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

function compile(relative) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  return ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
}

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== "object" || !node.props) return;
  visit(node);
  walk(node.props.children, visit);
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node?.props ? textContent(node.props.children) : "";
}

function find(tree, predicate) {
  let found;
  walk(tree, (node) => { if (!found && predicate(node)) found = node; });
  assert.ok(found, "Expected UI node");
  return found;
}

const signatures = [
  { id: 1, name: "Русская", is_default_cis: true, is_default_international: false },
  { id: 2, name: "English", is_default_cis: false, is_default_international: true },
  { id: 3, name: "Other", is_default_cis: false, is_default_international: false },
];

test("sendRFQ uses automatic signature and leaves body unchanged", async () => {
  const requests = [];
  const module = { exports: {} };
  vm.runInNewContext(compile("src/api/mail.ts"), {
    module, exports: module.exports,
    setTimeout: (callback) => { callback(); return 0; },
    require: (name) => {
      if (name === "./client") return { apiFetch: async (url, options) => {
        requests.push({ url, options });
        return { queued: 1, email_job_ids: [7] };
      } };
      if (name === "./history") return { getHistoryDetail: async () => ({
        results: [{ id: 42, email_statuses: [{ status: "sent" }] }],
      }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const supplier = { id: "s1", selected: true, backend_result_id: 42, contact: "supplier@example.org" };
  await module.exports.sendRFQ(5, "Subject", "Only user body", [supplier]);
  assert.equal(requests.length, 1);
  assert.deepEqual({ ...requests[0].options.json }, {
    search_job_id: 5, search_result_ids: [42], manual_emails: null,
    subject: "Subject", body: "Only user body", signature_id: null,
  });
});

function inputBlock(props) {
  const module = { exports: {} };
  vm.runInNewContext(compile("src/features/search/components/InputBlock.tsx"), {
    module, exports: module.exports,
    require: (name) => {
      if (name === "react/jsx-runtime") return jsx;
      if (name === "lucide-react") return new Proxy({}, { get: (_, key) => String(key) });
      if (name.startsWith("@/shared/ui/")) return new Proxy({}, { get: (_, key) => String(key) });
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports.InputBlock({
    equipmentName: "Pump", emailSubject: "Subject", rfqText: "Body",
    status: "completed", hasSuppliers: true, selectedCount: 1,
    onEquipmentNameChange() {}, onEmailSubjectChange() {}, onRfqTextChange() {},
    onSearch() {}, onSend() {}, ...props,
  });
}

test("InputBlock puts search and send controls after RFQ text without a signature field", () => {
  const tree = inputBlock();
  const content = textContent(tree);
  assert.match(content, /Текст запроса коммерческого предложения/);
  assert.match(content, /Найти поставщиков/);
  assert.match(content, /Отправить запрос КП/);
  assert.doesNotMatch(content, /Подпись|Настройки → Подписи|Автоматически/);
  assert.equal(tree.props.children.at(-1).props.children.length, 2);
});

function createIndexHarness(items = signatures, storedTemplate = null) {
  const state = [];
  const callbacks = [];
  const effects = [];
  const refs = [];
  let pending = [];
  let stateIndex = 0;
  let callbackIndex = 0;
  let effectIndex = 0;
  let refIndex = 0;
  const loads = [];
  const sends = [];
  const searches = [];
  const InputBlock = () => null;
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => value === right[index]);
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useCallback(callback, deps) {
      const index = callbackIndex++;
      if (!callbacks[index] || !same(callbacks[index].deps, deps)) callbacks[index] = { callback, deps };
      return callbacks[index].callback;
    },
    useMemo(calculate) { return calculate(); },
    useRef(initial) {
      const index = refIndex++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
    useEffect(effect, deps) {
      const index = effectIndex++;
      if (!effects[index] || !same(effects[index], deps)) {
        effects[index] = deps;
        pending.push(effect);
      }
    },
  };
  const ui = () => null;
  const toast = () => {};
  const module = { exports: {} };
  vm.runInNewContext(compile("src/pages/Index.tsx"), {
    module, exports: module.exports,
    localStorage: { getItem: (key) => key === "smartoffer.settings" && storedTemplate !== null
      ? JSON.stringify({ template: storedTemplate }) : null },
    window: { setInterval: () => 1, clearInterval() {} },
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return jsx;
      if (name === "@tanstack/react-query") return { useQuery: () => ({ isSuccess: false }) };
      if (name === "react-router-dom") return { useNavigate: () => () => {} };
      if (name === "@/features/search/components/InputBlock") return { InputBlock };
      if (name === "@/features/settings/components/SettingsModal") return {
        SettingsModal: ui, DEFAULT_TEMPLATE: "Default RFQ body", STORAGE_KEY: "smartoffer.settings",
      };
      if (name === "@/api/emailSignatures") return { listEmailSignatures: async () => {
        loads.push(true);
        return items;
      } };
      if (name === "@/api/mail") return { sendRFQ: async (...args) => {
        sends.push(args);
        return new Map([["s1", { status: "sent" }]]);
      } };
      if (name === "@/api/search") return { searchSuppliers: async (...args) => {
        searches.push(args);
        return { jobId: 99, suppliers: [], noSuppliersFound: true };
      } };
      if (name === "@/api/auth") return { fetchMe: async () => ({ id: 1, email: "local@example.org" }) };
      if (name === "@/api/billing") return { fetchBillingMe: async () => ({
        current_plan_code: "free_50", status: "active",
      }) };
      if (name === "@/shared/utils/auth") return { getAuthToken: () => "local-test", getAuthContextKey: () => 1, clearAuthToken() {}, subscribeAuth: () => () => {} };
      if (name === "@/shared/hooks/use-toast") return { useToast: () => ({ toast }) };
      if (name === "@/features/search/hooks/useRequestHistory") return {
        useRequestHistory: () => ({ addRequest() {}, updateRequest() {} }),
      };
      if (name === "@/shared/utils/tenant") return { CURRENT_ORGANIZATION_ID: "local", CURRENT_USER_ID: "local" };
      if (name === "lucide-react") return new Proxy({}, { get: () => ui });
      if (name.startsWith("@/")) return new Proxy({}, { get: () => ui });
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() {
    stateIndex = 0; callbackIndex = 0; effectIndex = 0; refIndex = 0;
    return module.exports.default();
  }
  async function settle() {
    const run = pending;
    pending = [];
    run.forEach((effect) => effect());
    await new Promise((resolve) => setImmediate(resolve));
  }
  function input(tree) { return find(tree, (node) => node.type === InputBlock); }
  return { render, settle, input, state, loads, sends, searches };
}

test("Index does not load signatures for the RFQ form", async () => {
  const h = createIndexHarness();
  h.render(); await h.settle();
  h.render(); await h.settle();
  const props = h.input(h.render()).props;
  assert.equal(h.loads.length, 0);
  for (const name of ["emailSignatures", "selectedSignatureId", "onSignatureChange", "automaticSignatureLabel", "signaturesLoading"]) {
    assert.equal(Object.hasOwn(props, name), false, name);
  }
});

test("Index sends RFQ body without an explicit signature ID", async () => {
  const h = createIndexHarness();
  h.render(); await h.settle();
  h.render(); await h.settle();
  // Index's first states are equipment, subject, RFQ text, status, suppliers and request ID.
  h.state[1] = "Subject";
  h.state[2] = "Only user body";
  h.state[3] = "completed";
  h.state[4] = [{ id: "s1", selected: true, status: "found", contact: "supplier@example.org", backend_result_id: 42 }];
  h.state[5] = "request-1";
  h.state[13] = 99; // searchJobId
  const tree = h.render();
  await h.input(tree).props.onSend();
  assert.equal(h.sends.length, 1);
  assert.equal(h.sends[0].length, 4);
  assert.equal(h.sends[0][2], "Only user body");
  assert.equal(h.loads.length, 0);
});

test("search mode reaches searchSuppliers for the SearchJob", async () => {
  const h = createIndexHarness();
  h.render(); await h.settle();
  h.render(); await h.settle();
  h.state[0] = "Pump";
  let tree = h.render();
  await h.input(tree).props.onSearch();
  assert.equal(h.searches[0][2], "cis");
  find(tree, (node) => node.type === "button" && textContent(node) === "Глобальный").props.onClick();
  tree = h.render();
  await h.input(tree).props.onSearch();
  assert.equal(h.searches[1][2], "international");
});

test("new default template omits signature and stored custom template remains untouched", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src/features/settings/components/SettingsModal.tsx"), "utf8");
  const template = source.match(/export const DEFAULT_TEMPLATE = `([\s\S]*?)`;/)?.[1];
  assert.ok(template);
  assert.doesNotMatch(template, /С уважением|\{\{user_name\}\}/);
  assert.match(template, /Количество:/);
  assert.match(source, /typeof parsed\.template === "string" \? parsed\.template : DEFAULT_TEMPLATE/);
});

test("existing custom template is loaded without signature cleanup", async () => {
  const stored = "Custom body\n\nС уважением,\nMy name";
  const h = createIndexHarness(signatures, stored);
  h.render(); await h.settle();
  assert.equal(h.input(h.render()).props.rfqText, stored);
});
