// Local component and API regression tests; all requests are mocked.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

function compile(relative) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}

test("sendSupplierReply posts inherited or explicit signature ID through apiFetch", async () => {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(
    compile("src/api/history.ts").replaceAll(
      "import.meta.env.VITE_API_BASE_URL", '"http://example.test"'
    ), {
    module,
    exports: module.exports,
    require: (name) => {
      assert.equal(name, "./client");
      return { apiFetch: async (...args) => { calls.push(args); return { ok: true }; } };
    },
  });
  await module.exports.sendSupplierReply(42, "Ответ");
  await module.exports.sendSupplierReply(42, "Ответ", 7);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "/history/results/42/replies");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual({ ...calls[0][1].json }, { body: "Ответ", signature_id: null });
  assert.deepEqual({ ...calls[1][1].json }, { body: "Ответ", signature_id: 7 });
});

function createTableHarness({ historyScope = "personal", replies = [], send, signatures = [], signatureLoadError = false } = {}) {
  const state = [];
  const refs = [];
  const toasts = [];
  const requests = [];
  const signatureLoads = [];
  let stateIndex = 0;
  let refIndex = 0;
  const supplier = {
    id: "supplier-1",
    request_id: "request-1",
    supplier_name: "Поставщик",
    contact: "original@supplier.example.org",
    source_url: "https://supplier.example.org",
    selected: false,
    status: "sent",
    created_at: new Date("2026-01-01T00:00:00Z"),
    backend_result_id: 42,
    supplier_replies_count: 1,
  };
  const ui = () => null;
  const module = { exports: {} };
  const hooks = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next) => {
        state[index] = typeof next === "function" ? next(state[index]) : next;
      }];
    },
    useRef(initial) {
      const index = refIndex++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
    useMemo(calculate) { return calculate(); },
  };
  vm.runInNewContext(compile("src/features/search/components/SupplierTable.tsx"), {
    module,
    exports: module.exports,
    Error,
    URL,
    require: (name) => {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return jsx;
      if (name === "lucide-react") return new Proxy({}, { get: () => ui });
      if (name.startsWith("@/shared/ui/")) return new Proxy({}, { get: () => ui });
      if (name === "@/shared/utils/utils") {
        return { cn: (...values) => values.filter(Boolean).join(" ") };
      }
      if (name === "@/shared/utils/browserSecurity") {
        const exports = {};
        vm.runInNewContext(compile("src/shared/utils/browserSecurity.ts"), { exports, URL });
        return exports;
      }
      if (name === "@/shared/hooks/use-toast") {
        return { useToast: () => ({ toast: (value) => toasts.push(value) }) };
      }
      if (name === "@/api/history") {
        return {
          getResultReplies: async () => ({ items: replies }),
          sendSupplierReply: async (id, body, signatureId) => {
            requests.push({ id, body, signatureId });
            return send ? send(id, body, signatureId) : { ok: true };
          },
          downloadQuoteFile: () => { throw new Error("File access is forbidden"); },
        };
      }
      if (name === "@/api/emailSignatures") {
        return { listEmailSignatures: async () => {
          signatureLoads.push(true);
          if (signatureLoadError) throw new Error("signature list unavailable");
          return signatures;
        } };
      }
      if (name === "@/api/team") {
        return { getTeamResultReplies: async () => ({ items: replies }) };
      }
      if (name === "@/features/search/components/AddSupplierModal") {
        return { AddSupplierModal: ui };
      }
      if (name === "../quoteFormat") return { formatBenefitScore: String };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() {
    stateIndex = 0;
    refIndex = 0;
    return module.exports.SupplierTable({
      suppliers: [supplier],
      historyScope,
      readOnly: true,
      onToggleSelect: () => {},
      onDelete: () => {},
      onAdd: () => {},
    });
  }
  return { supplier, render, toasts, requests, signatureLoads };
}

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node !== "object" || !node.props) return;
  visit(node);
  walk(node.props.children, visit);
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (node && typeof node === "object" && node.props) {
    return textContent(node.props.children);
  }
  return "";
}

function findNode(tree, predicate) {
  let found;
  walk(tree, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}

function action(tree, label) {
  return findNode(tree, (node) =>
    typeof node.props.onClick === "function" && textContent(node).trim() === label
  );
}

function draft(tree) {
  return findNode(tree, (node) => node.props.id === "supplier-reply-draft");
}

function signatureSelect(tree) {
  return findNode(tree, (node) =>
    typeof node.props.onValueChange === "function" &&
    (node.props.value === "inherit" || /^\d+$/.test(String(node.props.value)))
  );
}

const supplierReply = {
  id: 1,
  source: "user_imap",
  direction: "supplier",
  status: "in_progress",
  from_email: "latest@supplier.example.org",
  body_text: "Уточните количество",
  created_at: "2026-01-01T00:00:00Z",
  attachments: [],
};
const sentReply = {
  id: 2,
  source: "smartoffer_outbound",
  direction: "user",
  status: "in_progress",
  from_email: "owner@example.org",
  body_text: "Ответ поставщику",
  created_at: "2026-01-02T00:00:00Z",
  attachments: [],
};
const event = { preventDefault() {}, stopPropagation() {} };
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function openDialog(harness) {
  const tree = harness.render();
  const opener = findNode(tree, (node) =>
    String(node.props.title || "").startsWith("Открыть диалог с поставщиком")
  );
  assert.ok(opener, "supplier dialog opener exists");
  opener.props.onClick(event);
  await tick();
  return harness.render();
}

test("dialog labels every document type and retains the Open action", async () => {
  for (const [type, label] of [["quote", "КП"], ["technical_document", "Технический документ"],
    ["other_document", "Документ"], ["unknown_document", "Документ"]]) {
    const harness = createTableHarness({ replies: [{ ...supplierReply, attachments: [{
      id: 17, original_filename: "synthetic.pdf", detected_type: type, size_bytes: 1024,
    }] }] });
    const tree = await openDialog(harness);
    assert.ok(textContent(tree).includes(label));
    assert.ok(action(tree, "Открыть"));
    assert.doesNotMatch(textContent(tree), /technical_document|unknown_document|other_document/);
  }
});

function openComposer(harness, tree) {
  const reply = action(tree, "Ответить");
  assert.ok(reply, "reply button exists");
  reply.props.onClick();
  return harness.render();
}

test("recipient is latest incoming sender, not the original contact", async () => {
  const harness = createTableHarness({ replies: [supplierReply] });
  const tree = openComposer(harness, await openDialog(harness));
  assert.match(textContent(tree), /Кому: latest@supplier\.example\.org/);
  assert.doesNotMatch(textContent(tree), /Кому: original@supplier\.example\.org/);
});

test("composer loads signatures lazily and defaults to inherited chain", async () => {
  const harness = createTableHarness({
    replies: [supplierReply], signatures: [{ id: 7, name: "English" }],
  });
  assert.equal(harness.signatureLoads.length, 0);
  let tree = openComposer(harness, await openDialog(harness));
  await tick();
  tree = harness.render();
  assert.equal(harness.signatureLoads.length, 1);
  assert.equal(signatureSelect(tree).props.value, "inherit");
  assert.match(textContent(tree), /Как в исходном запросе/);
  assert.match(textContent(tree), /English/);
  action(tree, "Отмена").props.onClick();
  tree = openComposer(harness, harness.render());
  assert.equal(harness.signatureLoads.length, 1);
  assert.equal(signatureSelect(tree).props.value, "inherit");
});

test("explicit reply signature sends numeric ID and resets on success and Cancel", async () => {
  const harness = createTableHarness({
    replies: [supplierReply], signatures: [{ id: 7, name: "English" }],
    send: async () => ({ ok: true, reply: sentReply, sent_copy_saved: true }),
  });
  let tree = openComposer(harness, await openDialog(harness));
  await tick();
  signatureSelect(harness.render()).props.onValueChange("7");
  tree = harness.render();
  assert.equal(signatureSelect(tree).props.value, "7");
  draft(tree).props.onChange({ target: { value: "Reply" } });
  await action(harness.render(), "Отправить").props.onClick();
  assert.deepEqual(harness.requests[0], { id: 42, body: "Reply", signatureId: 7 });
  tree = openComposer(harness, harness.render());
  assert.equal(signatureSelect(tree).props.value, "inherit");
  signatureSelect(tree).props.onValueChange("7");
  action(harness.render(), "Отмена").props.onClick();
  tree = openComposer(harness, harness.render());
  assert.equal(signatureSelect(tree).props.value, "inherit");
});

test("signature list error does not block inherited manual reply", async () => {
  const harness = createTableHarness({
    replies: [supplierReply], signatureLoadError: true,
    send: async () => ({ ok: true, reply: sentReply, sent_copy_saved: true }),
  });
  let tree = openComposer(harness, await openDialog(harness));
  await tick();
  tree = harness.render();
  assert.equal(signatureSelect(tree).props.value, "inherit");
  assert.equal(harness.toasts[0].variant, undefined);
  assert.match(harness.toasts[0].description, /подпись исходного запроса/);
  draft(tree).props.onChange({ target: { value: "Reply" } });
  await action(harness.render(), "Отправить").props.onClick();
  assert.deepEqual(harness.requests[0], { id: 42, body: "Reply", signatureId: null });
});

test("empty draft does not send; double click makes only one POST", async () => {
  let resolveSend;
  const pending = new Promise((resolve) => { resolveSend = resolve; });
  const harness = createTableHarness({
    replies: [supplierReply],
    send: () => pending,
  });
  let tree = openComposer(harness, await openDialog(harness));
  assert.equal(action(tree, "Отправить").props.disabled, true);
  await action(tree, "Отправить").props.onClick();
  assert.equal(harness.requests.length, 0);

  draft(tree).props.onChange({ target: { value: "  Ответ поставщику  " } });
  tree = harness.render();
  const sendButton = action(tree, "Отправить");
  const first = sendButton.props.onClick();
  const second = sendButton.props.onClick();
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(harness.requests[0], { id: 42, body: "Ответ поставщику", signatureId: null });
  tree = harness.render();
  assert.equal(action(tree, "Отправляем...").props.disabled, true);
  assert.equal(action(tree, "Отмена").props.disabled, true);
  assert.equal(draft(tree).props.disabled, true);
  resolveSend({ ok: true, reply: sentReply, sent_copy_saved: true });
  await Promise.all([first, second]);
});

test("success inserts the sent message and closes a cleared composer", async () => {
  const harness = createTableHarness({
    replies: [supplierReply],
    send: async () => ({ ok: true, reply: sentReply, sent_copy_saved: true }),
  });
  let tree = openComposer(harness, await openDialog(harness));
  draft(tree).props.onChange({ target: { value: "Ответ поставщику" } });
  await action(harness.render(), "Отправить").props.onClick();
  tree = harness.render();
  assert.equal(draft(tree), undefined);
  assert.ok(action(tree, "Ответить"));
  assert.match(textContent(tree), /Вы написали поставщику/);
  assert.match(textContent(tree), /Ответ поставщику/);
  assert.ok(
    textContent(tree).indexOf("Вы написали поставщику") <
    textContent(tree).indexOf("Поставщик ответил")
  );
  assert.equal(harness.toasts.at(-1).title, "Ответ отправлен");
  assert.equal(harness.toasts.at(-1).description, undefined);
  tree = openComposer(harness, tree);
  assert.equal(draft(tree).props.value, "");
});

test("Sent warning remains a successful send", async () => {
  const harness = createTableHarness({
    replies: [supplierReply],
    send: async () => ({
      ok: true, reply: sentReply, sent_copy_saved: false,
      warning: "Копия не сохранена",
    }),
  });
  let tree = openComposer(harness, await openDialog(harness));
  draft(tree).props.onChange({ target: { value: "Ответ" } });
  await action(harness.render(), "Отправить").props.onClick();
  tree = harness.render();
  assert.equal(draft(tree), undefined);
  assert.match(textContent(tree), /Вы написали поставщику/);
  assert.equal(harness.toasts.at(-1).title, "Ответ отправлен");
  assert.equal(harness.toasts.at(-1).description, "Копия не сохранена");
});

test("backend error keeps the draft, composer, and specific message", async () => {
  const message = "Не найдено входящее письмо поставщика, на которое можно ответить";
  const harness = createTableHarness({
    replies: [supplierReply],
    send: async () => { throw new Error(message); },
  });
  let tree = openComposer(harness, await openDialog(harness));
  draft(tree).props.onChange({ target: { value: "  Мой текст  " } });
  await action(harness.render(), "Отправить").props.onClick();
  tree = harness.render();
  assert.equal(draft(tree).props.value, "  Мой текст  ");
  assert.match(textContent(tree), new RegExp(message));
  assert.equal(harness.toasts.length, 0);
});

test("malformed success payload keeps the draft and composer", async () => {
  const harness = createTableHarness({
    replies: [supplierReply],
    send: async () => ({ ok: true, sent_copy_saved: true }),
  });
  let tree = openComposer(harness, await openDialog(harness));
  draft(tree).props.onChange({ target: { value: "Мой текст" } });
  await action(harness.render(), "Отправить").props.onClick();
  tree = harness.render();
  assert.equal(draft(tree).props.value, "Мой текст");
  assert.match(textContent(tree), /Не удалось подтвердить отправку/);
  assert.equal(harness.toasts.length, 0);
});

test("team scope and missing supplier email cannot call personal reply API", async () => {
  const team = createTableHarness({ historyScope: "team", replies: [supplierReply] });
  let tree = await openDialog(team);
  assert.equal(action(tree, "Ответить"), undefined);
  assert.equal(signatureSelect(tree), undefined);
  assert.ok(action(tree, "Закрыть"));
  assert.equal(team.requests.length, 0);

  const noEmail = createTableHarness({
    replies: [{ ...supplierReply, from_email: null }],
  });
  tree = await openDialog(noEmail);
  assert.equal(action(tree, "Ответить"), undefined);
  assert.match(textContent(tree), /Ответить можно после получения письма/);
  assert.equal(noEmail.requests.length, 0);
});
