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
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
}

class ApiError extends Error {
  constructor(detail) {
    super("generic API error");
    this.body = { detail };
  }
}

function createHarness(initial = []) {
  let rows = initial.map((item) => ({ ...item }));
  let nextId = Math.max(0, ...rows.map((item) => item.id)) + 1;
  const calls = [];
  const toasts = [];
  const state = [];
  const callbacks = [];
  const effects = [];
  let pendingEffects = [];
  let stateIndex = 0;
  let callbackIndex = 0;
  let effectIndex = 0;
  let failSave = null;
  let failList = null;
  let failDelete = null;
  const toast = (value) => toasts.push(value);
  const sameDeps = (left, right) => left && right && left.length === right.length && left.every((value, index) => value === right[index]);
  const React = {
    useState(initialValue) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useCallback(callback, deps) {
      const index = callbackIndex++;
      if (!callbacks[index] || !sameDeps(callbacks[index].deps, deps)) callbacks[index] = { callback, deps };
      return callbacks[index].callback;
    },
    useEffect(effect, deps) {
      const index = effectIndex++;
      if (!effects[index] || !sameDeps(effects[index], deps)) {
        effects[index] = deps;
        pendingEffects.push(effect);
      }
    },
  };
  const api = {
    listEmailSignatures: async () => {
      calls.push(["GET"]);
      if (failList) throw new ApiError(failList);
      return rows.map((row) => ({ ...row }));
    },
    createEmailSignature: async (payload) => {
      calls.push(["POST", { ...payload }]);
      if (failSave) throw new ApiError(failSave);
      for (const flag of ["is_default_cis", "is_default_international"]) {
        if (payload[flag]) rows.forEach((row) => { row[flag] = false; });
      }
      const row = { id: nextId++, ...payload, created_at: "2026-01-01", updated_at: "2026-01-01" };
      rows.push(row);
      return { ...row };
    },
    updateEmailSignature: async (id, payload) => {
      calls.push(["PATCH", id, { ...payload }]);
      if (failSave) throw new ApiError(failSave);
      for (const flag of ["is_default_cis", "is_default_international"]) {
        if (payload[flag]) rows.forEach((row) => { row[flag] = false; });
      }
      const row = rows.find((item) => item.id === id);
      Object.assign(row, payload);
      return { ...row };
    },
    deleteEmailSignature: async (id) => {
      calls.push(["DELETE", id]);
      if (failDelete) throw new ApiError(failDelete);
      rows = rows.filter((row) => row.id !== id);
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compile("src/features/settings/components/EmailSignaturesPanel.tsx"), {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return jsx;
      if (name === "lucide-react") return { Plus: "Plus" };
      if (name === "@/api/client") return { ApiError };
      if (name === "@/api/emailSignatures") return api;
      if (name === "@/shared/hooks/use-toast") return { useToast: () => ({ toast }) };
      if (name.startsWith("@/shared/ui/")) return new Proxy({}, { get: (_, key) => String(key) });
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render(active = true) {
    stateIndex = 0;
    callbackIndex = 0;
    effectIndex = 0;
    return module.exports.EmailSignaturesPanel({ active });
  }
  async function settle() {
    const run = pendingEffects;
    pendingEffects = [];
    run.forEach((effect) => effect());
    await new Promise((resolve) => setImmediate(resolve));
  }
  return {
    render, settle, calls, toasts, get rows() { return rows; },
    setFailSave: (message) => { failSave = message; },
    setFailList: (message) => { failList = message; },
    setFailDelete: (message) => { failDelete = message; },
  };
}

function flatten(node, found = []) {
  if (Array.isArray(node)) return node.flatMap((item) => flatten(item, found));
  if (node && typeof node === "object" && "props" in node) {
    found.push(node);
    flatten(node.props.children, found);
  }
  return found;
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join("");
  if (node && typeof node === "object" && "props" in node) return content(node.props.children);
  return node === null || node === undefined || typeof node === "boolean" ? "" : String(node);
}

function find(tree, type, label) {
  const result = flatten(tree).find((node) => node.type === type && (label === undefined || content(node).includes(label)));
  assert.ok(result, `Missing ${type} ${label || ""}`);
  return result;
}

function signature(id, name, cis = false, international = false) {
  return { id, name, body_text: `Body ${name}`, language_code: "ru", is_default_cis: cis,
    is_default_international: international, created_at: "2026-01-01", updated_at: "2026-01-01" };
}

test("API client uses apiFetch for all signature endpoints", async () => {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(compile("src/api/emailSignatures.ts"), {
    module, exports: module.exports,
    require: (name) => {
      assert.equal(name, "./client");
      return { apiFetch: async (...args) => { calls.push(args); return []; } };
    },
  });
  const api = module.exports;
  const payload = { name: "Russian", body_text: "Regards", is_default_cis: true, is_default_international: false };
  await api.listEmailSignatures();
  await api.createEmailSignature(payload);
  await api.updateEmailSignature(7, payload);
  await api.deleteEmailSignature(7);
  assert.deepEqual(calls.map(([url, options]) => [url, options.method]), [
    ["/email/signatures", "GET"], ["/email/signatures", "POST"],
    ["/email/signatures/7", "PATCH"], ["/email/signatures/7", "DELETE"],
  ]);
  assert.deepEqual({ ...calls[2][1].json }, payload);
});

test("shared apiFetch accepts successful 204 delete response", async () => {
  const module = { exports: {} };
  vm.runInNewContext(
    compile("src/api/client.ts").replaceAll("import.meta.env.VITE_API_BASE_URL", '"http://127.0.0.1:10001"'),
    {
      module, exports: module.exports,
      Headers,
      require: () => ({ getAuthToken: () => null, getAuthContextKey: () => 0 }),
      fetch: async () => ({ ok: true, status: 204, json: () => { throw new Error("204 has no JSON"); } }),
    },
  );
  assert.equal(await module.exports.apiFetch("/email/signatures/7", { method: "DELETE" }), undefined);
});

test("list loads once and empty state offers creation", async () => {
  const h = createHarness();
  h.render(false); await h.settle();
  assert.equal(h.calls.length, 0);
  h.render(true); await h.settle();
  let tree = h.render(); await h.settle();
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 1);
  h.render(false); await h.settle();
  h.render(true); await h.settle();
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 1);
  assert.match(content(tree), /Подписей пока нет/);
  assert.match(content(tree), /Создайте подпись для запросов и ответов поставщикам/);
  find(tree, "Button", "Добавить подпись").props.onClick();
  tree = h.render();
  assert.equal(find(tree, "Input").props.value, "");
  assert.equal(find(tree, "Button", "Сохранить").props.disabled, true);
});

test("load error displays backend detail and retry fetches again", async () => {
  const h = createHarness();
  h.setFailList("Нет доступа к подписям");
  h.render(); await h.settle();
  let tree = h.render();
  assert.match(content(tree), /Нет доступа к подписям/);
  assert.ok(h.toasts.some((item) => item.variant === "destructive" && item.description === "Нет доступа к подписям"));
  h.setFailList(null);
  find(tree, "Button", "Повторить").props.onClick();
  await h.settle();
  tree = h.render();
  assert.match(content(tree), /Подписей пока нет/);
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 2);
});

test("create, edit, confirmation, delete and backend list reload", async () => {
  const h = createHarness();
  h.render(); await h.settle();
  let tree = h.render();
  find(tree, "Button", "Добавить подпись").props.onClick();
  tree = h.render();
  find(tree, "Input").props.onChange({ target: { value: "Russian" } });
  find(tree, "Textarea").props.onChange({ target: { value: "Regards\nMe" } });
  tree = h.render();
  assert.equal(find(tree, "Button", "Сохранить").props.disabled, false);
  await find(tree, "Button", "Сохранить").props.onClick();
  await h.settle();
  tree = h.render();
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 2);
  assert.match(content(tree), /Russian/);
  find(tree, "Button", "Изменить").props.onClick();
  tree = h.render();
  assert.equal(find(tree, "Input").props.value, "Russian");
  find(tree, "Input").props.onChange({ target: { value: "Updated" } });
  await find(h.render(), "Button", "Сохранить").props.onClick();
  await h.settle();
  tree = h.render();
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 3);
  find(tree, "Button", "Удалить").props.onClick();
  tree = h.render();
  assert.match(content(tree), /Удалить подпись «Updated»/);
  assert.match(content(tree), /Это не изменит уже отправленные письма/);
  assert.equal(h.calls.filter(([method]) => method === "DELETE").length, 0);
  find(tree, "AlertDialogAction").props.onClick({ preventDefault() {} });
  await h.settle();
  assert.equal(h.calls.filter(([method]) => method === "DELETE").length, 1);
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 4);
  assert.match(content(h.render()), /Подписей пока нет/);
  assert.ok(h.toasts.some((item) => item.title === "Подпись сохранена"));
  assert.ok(h.toasts.some((item) => item.title === "Подпись удалена"));
});

test("CIS, international, and combined badges reflect reloaded backend state", async () => {
  const h = createHarness([signature(1, "Russian", true, false), signature(2, "English", false, true), signature(3, "Both", true, true)]);
  h.render(); await h.settle();
  const tree = h.render();
  assert.equal(content(tree).split("СНГ по умолчанию").length - 1, 2);
  assert.equal(content(tree).split("Международная по умолчанию").length - 1, 2);
});

test("save error keeps draft and shows backend detail", async () => {
  const h = createHarness();
  h.render(); await h.settle();
  find(h.render(), "Button", "Добавить подпись").props.onClick();
  let tree = h.render();
  find(tree, "Input").props.onChange({ target: { value: "My signature" } });
  find(tree, "Textarea").props.onChange({ target: { value: "My body" } });
  h.setFailSave("Название уже используется");
  find(h.render(), "Button", "Сохранить").props.onClick();
  await h.settle();
  tree = h.render();
  assert.equal(find(tree, "Input").props.value, "My signature");
  assert.equal(find(tree, "Textarea").props.value, "My body");
  assert.ok(h.toasts.some((item) => item.variant === "destructive" && item.description === "Название уже используется"));
});

test("delete error retains confirmation and reports backend detail", async () => {
  const h = createHarness([signature(1, "Russian")]);
  h.render(); await h.settle();
  find(h.render(), "Button", "Удалить").props.onClick();
  h.setFailDelete("Подпись защищена");
  find(h.render(), "AlertDialogAction").props.onClick({ preventDefault() {} });
  await h.settle();
  const tree = h.render();
  assert.equal(find(tree, "AlertDialog").props.open, true);
  assert.equal(h.rows.length, 1);
  assert.ok(h.toasts.some((item) => item.variant === "destructive" && item.description === "Подпись защищена"));
});

test("default change sends only edited signature and reloads backend flags", async () => {
  const h = createHarness([signature(1, "Russian", true, false), signature(2, "English", false, false)]);
  h.render(); await h.settle();
  let tree = h.render();
  const editButtons = flatten(tree).filter((node) => node.type === "Button" && content(node) === "Изменить");
  editButtons[1].props.onClick();
  tree = h.render();
  find(tree, "Checkbox", undefined).props.onCheckedChange(true);
  find(h.render(), "Button", "Сохранить").props.onClick();
  await h.settle();
  const patch = h.calls.find(([method]) => method === "PATCH");
  assert.equal(patch[1], 2);
  assert.equal(patch[2].is_default_cis, true);
  assert.equal(h.calls.filter(([method]) => method === "PATCH").length, 1);
  assert.equal(h.calls.filter(([method]) => method === "GET").length, 2);
  assert.equal(h.rows[0].is_default_cis, false);
  assert.equal(h.rows[1].is_default_cis, true);
  assert.equal(content(h.render()).split("СНГ по умолчанию").length - 1, 1);
});
