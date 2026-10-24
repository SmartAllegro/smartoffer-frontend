const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const compile = source => ts.transpileModule(source, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
}}).outputText;

function handler(file, name, context) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, name);
  vm.createContext(context);
  vm.runInContext(compile(found.getText(source)), context);
  return context[name];
}

function loadApi(file, apiFetch) {
  const module = {exports: {}};
  vm.runInNewContext(compile(read(file).replaceAll("import.meta.env", "testEnv")), {
    module, exports: module.exports, URLSearchParams, testEnv: {},
    require: () => ({apiFetch}),
  });
  return module.exports;
}

test("deal toggle sends the backend object contract for both transitions", async () => {
  const calls = [];
  const api = loadApi("src/api/history.ts", async (url, options) => {
    calls.push({url, body: JSON.parse(JSON.stringify(options.json))});
    return {deal_done: options.json.deal_done};
  });
  const toggle = handler("src/features/history/components/HistoryModal.tsx", "handleToggleDeal", {
    items: [], setItems: () => {}, setJobDealDone: api.setJobDealDone,
    loadStats: async () => {}, toast: () => {},
  });
  await toggle({id: 7}, true);
  await toggle({id: 7}, false);
  assert.deepEqual(calls, [
    {url: "/history/jobs/7/deal", body: {deal_done: true}},
    {url: "/history/jobs/7/deal", body: {deal_done: false}},
  ]);
});

test("history hook sends limit and offset through the actual API query builder", async () => {
  let url;
  const api = loadApi("src/api/history.ts", async value => { url = value; return {items: []}; });
  const module = {exports: {}};
  vm.runInNewContext(compile(read("src/features/search/hooks/useRequestHistory.ts")), {
    module, exports: module.exports,
    require: name => name === "react"
      ? {useState: value => [value, () => {}], useCallback: fn => fn} : api,
  });
  await module.exports.useRequestHistory().refresh();
  const parsed = new URL(url, "http://127.0.0.1");
  assert.equal(parsed.searchParams.get("limit"), "100");
  assert.equal(parsed.searchParams.get("offset"), "0");
});

test("support sends only supported backend fields", async () => {
  let payload;
  const api = loadApi("src/api/support.ts", async (_, options) => {
    payload = options.json; return {message: "ok"};
  });
  const submit = handler("src/features/search/components/SupportModal.tsx", "handleSubmit", {
    canSubmit: true, setSending: () => {}, contactEmail: " user@example.ru ",
    subject: " Subject ", message: " Synthetic support message ", searchJobId: 7,
    window: {location: {href: "http://127.0.0.1:8081"}},
    sendSupportRequest: api.sendSupportRequest, toast: () => {}, onOpenChange: () => {},
  });
  await submit();
  assert.deepEqual(Object.keys(payload).sort(), ["contact_email", "message", "page_url", "source", "subject"]);
  assert.equal(payload.contact_email, "user@example.ru");
});

test("image paste is accepted in chat composer and leaves other inputs untouched", () => {
  class Input {}
  class Textarea {}
  const composer = new Textarea();
  const applied = [];
  let prevented = 0;
  const context = {
    selectedDialogId: 7, sending: false, uploadingFile: false,
    document: {activeElement: composer}, HTMLInputElement: Input, HTMLTextAreaElement: Textarea,
    messageInputRef: {current: composer}, extractImageFromClipboard: event => event.image,
    applySelectedFile: file => applied.push(file), toast: () => {},
  };
  const paste = handler("src/pages/ChatPage.tsx", "handleDocumentPaste", context);
  const event = {image: {name: "synthetic.png"}, preventDefault: () => prevented++};
  paste(event);
  assert.equal(applied.length, 1);
  for (const active of [new Input(), new Textarea()]) {
    context.document.activeElement = active;
    paste(event);
  }
  assert.equal(applied.length, 1);
  assert.equal(prevented, 1);
});
