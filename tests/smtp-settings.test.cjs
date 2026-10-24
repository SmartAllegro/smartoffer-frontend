const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function source(file) { return fs.readFileSync(path.join(__dirname, "..", file), "utf8"); }
function compile(text) {
  return ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
}

test("verify API sends no credentials or request body", async () => {
  const calls = [];
  const module = {exports: {}};
  vm.runInNewContext(compile(source("src/api/email.ts")), {
    module, exports: module.exports,
    require: () => ({apiFetch: async (...args) => { calls.push(args); return {ok: true}; }}),
  });
  await module.exports.verifyEmailSmtp();
  assert.equal(calls[0][0], "/email/verify");
  assert.deepEqual(Object.keys(calls[0][1]), ["method"]);
  assert.equal(calls[0][1].method, "POST");
});

// Execute the actual component handler with mocked API/state; no duplicated workflow.
function handler({verifyOk=true, saveFails=false, provider="yandex"} = {}) {
  const file = ts.createSourceFile("SettingsModal.tsx", source("src/features/settings/components/SettingsModal.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let node;
  function find(n) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "handleSave") node = n;
    ts.forEachChild(n, find);
  }
  find(file);
  assert.ok(node);
  const calls = [], states = [];
  const noop = () => {};
  const context = {
    saveSettings: noop, state: {}, onSaved: noop, providerId: provider, appPassword: "synthetic",
    emailAccessStatus: {smtp_verified: true}, smtpStatus: {state: "ok"},
    imapConsentEffective: true, smtpConsentChecked: true, offerAccepted: true,
    meEmail: "user@example.ru", selectedProvider: {id: provider, smtp_host: "smtp.yandex.ru", smtp_port: 465, smtp_security: "ssl"},
    customSmtpHost: "smtp.company.ru", customSmtpSecurity: "starttls",
    normalizeSecurity: value => value, setSaving: value => states.push(value),
    setSmtpStatus: noop, setExpanded: noop, toast: noop, onOpenChange: noop,
    setSmtpConsentChecked: noop, setSmtpConsentLocked: noop, setOfferAccepted: noop, setOfferAcceptedLocked: noop,
    setEmailAccessStatus: noop,
    getEmailAccessStatus: async () => ({smtp_verified: true, ready: false}),
    saveEmailSettings: async payload => { calls.push(["save", payload]); if (saveFails) throw Error("save failed"); return {is_verified: false}; },
    verifyEmailSmtp: async (...args) => { calls.push(["verify", args]); return {ok: verifyOk, message: "SMTP failed"}; },
    saveImapConsentAndRefresh: async () => { calls.push(["imap"]); return true; },
    refreshBilling: async () => calls.push(["billing"]),
  };
  vm.createContext(context);
  vm.runInContext(compile(node.getText(file)), context);
  return {run: context.handleSave, calls, states};
}

test("save -> bodyless verify -> IMAP -> billing", async () => {
  const h = handler();
  await h.run();
  assert.deepEqual(h.calls.map(c => c[0]), ["save", "verify", "imap", "billing"]);
  assert.equal(h.calls[1][1].length, 0);
  assert.equal(h.calls[0][1].smtp_username, "user@example.ru");
  assert.equal(h.calls[0][1].from_email, "user@example.ru");
  assert.deepEqual(h.states, [true, false]);
});

test("failed SMTP verify stops IMAP and billing and releases loading", async () => {
  const h = handler({verifyOk: false});
  await h.run();
  assert.deepEqual(h.calls.map(c => c[0]), ["save", "verify"]);
  assert.deepEqual(h.states, [true, false]);
});

test("failed save never starts verification", async () => {
  const h = handler({saveFails: true});
  await h.run();
  assert.deepEqual(h.calls.map(c => c[0]), ["save"]);
  assert.deepEqual(h.states, [true, false]);
});

test("custom SMTP retains editable target and paired secure port", async () => {
  const h = handler({provider: "custom"});
  await h.run();
  assert.equal(h.calls[0][1].smtp_host, "smtp.company.ru");
  assert.equal(h.calls[0][1].smtp_port, 587);
  assert.equal(h.calls[0][1].smtp_security, "starttls");
});
