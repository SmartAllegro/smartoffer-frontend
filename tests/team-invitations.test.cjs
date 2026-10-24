const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const {renderToStaticMarkup} = require("react-dom/server");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const source = ts.createSourceFile("SettingsModal.tsx", read("src/features/settings/components/SettingsModal.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compile = value => ts.transpileModule(value, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
}}).outputText;
function find(predicate) {
  let found;
  function visit(node) { if (predicate(node)) found = node; ts.forEachChild(node, visit); }
  visit(source);
  assert.ok(found);
  return found;
}
function runHandler(name, context) {
  const node = find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  vm.createContext(context);
  vm.runInContext(compile(node.getText(source)), context);
  return context[name];
}
function apiHarness() {
  const calls = [], module = {exports: {}};
  vm.runInNewContext(compile(read("src/api/team.ts")), {
    module, exports: module.exports, URLSearchParams,
    require: () => ({apiFetch: async (url, options) => { calls.push({url, ...options}); return {id: 7, status: "pending"}; }}),
  });
  return {api: module.exports, calls};
}

test("invitation APIs use authenticated self routes without supplied user identity", async () => {
  const {api, calls} = apiHarness();
  await api.listTeamInvitations(); await api.acceptTeamInvitation(7); await api.declineTeamInvitation(8);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {url: "/team/invitations", method: "GET"},
    {url: "/team/invitations/7/accept", method: "POST"},
    {url: "/team/invitations/8/decline", method: "POST"},
  ]);
});

test("owner invite uses returned pending state and shows invitation sent", async () => {
  const {api, calls} = apiHarness();
  const toasts = []; let refreshed = 0;
  const handler = runHandler("handleAddTeamManager", {teamEmail: " Worker@Example.com ", teamSaving: false,
    setTeamSaving() {}, setTeamEmail() {}, addTeamManager: api.addTeamManager,
    refreshTeam: async () => refreshed++, toast: value => toasts.push(value),
  });
  await handler();
  assert.equal(calls[0].url, "/team/managers");
  assert.equal(calls[0].json.email, "worker@example.com");
  assert.equal(toasts[0].title, "Приглашение отправлено");
  assert.equal(refreshed, 1);
});

for (const action of ["accept", "decline"]) {
  test(`${action} calls real API then refreshes server state`, async () => {
    const {api, calls} = apiHarness();
    const refreshed = [], saving = [];
    const handler = runHandler("handleTeamInvitation", {teamSaving: false,
      setTeamSaving: value => saving.push(value), toast() {},
      acceptTeamInvitation: api.acceptTeamInvitation, declineTeamInvitation: api.declineTeamInvitation,
      refreshTeam: async () => refreshed.push("team+invitations"), refreshBilling: async () => refreshed.push("billing"),
    });
    await handler(7, action);
    assert.equal(calls[0].url, `/team/invitations/7/${action}`);
    assert.deepEqual(refreshed, action === "accept" ? ["team+invitations", "billing"] : ["team+invitations"]);
    assert.deepEqual(saving, [true, false]);
  });
}

test("failed accept never fakes active membership or changes billing", async () => {
  const calls = [], toasts = [];
  const handler = runHandler("handleTeamInvitation", {teamSaving: false, setTeamSaving() {},
    acceptTeamInvitation: async () => { throw Error("Conflict"); },
    refreshTeam: async () => calls.push("refresh"), refreshBilling: async () => calls.push("billing"),
    toast: value => toasts.push(value),
  });
  await handler(7, "accept");
  assert.deepEqual(calls, ["refresh"]);
  assert.equal(toasts[0].variant, "destructive");
});

test("refreshTeam fetches invitations even when employee has no team", async () => {
  const node = find(n => ts.isVariableDeclaration(n) && n.name.getText(source) === "refreshTeam");
  const received = [];
  const context = {React: {useCallback: fn => fn}, setTeamLoading() {}, setTeamMe() {}, setTeamMembers() {},
    fetchTeamMe: async () => ({has_team: false, can_manage_team: false}),
    listTeamInvitations: async () => ({items: [{id: 7}]}),
    setTeamInvitations: value => received.push(value),
  };
  vm.createContext(context);
  vm.runInContext(compile(`var refresh = ${node.initializer.getText(source)}`), context);
  await context.refresh();
  assert.equal(received[0][0].id, 7);
});

function renderTeam(overrides = {}) {
  const variables = {isActiveBusinessPlan: false, teamMe: {has_team: false}, teamInvitations: [], ...overrides};
  const visible = find(n => ts.isVariableDeclaration(n) && n.name.getText(source) === "canShowTeamSection");
  const section = find(n => ts.isBinaryExpression(n) && n.left.getText(source) === "canShowTeamSection");
  const element = tag => ({children, ...props}) => React.createElement(tag, {disabled: props.disabled}, children);
  const context = {React, ...variables, Boolean, expanded: "team", teamLoading: false, teamSaving: false,
    isTeamManager: variables.teamMe.role === "manager", canManageTeam: !!variables.teamMe.can_manage_team,
    teamMembers: [], teamEmail: "", teamRemovingId: null,
    Users: () => null, ChevronDown: () => null, Button: element("button"), Input: element("input"), Label: element("label"),
    handleCreateTeam() {}, handleAddTeamManager() {}, handleRemoveTeamManager() {}, handleTeamInvitation() {},
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(compile(`var canShowTeamSection = ${visible.initializer.getText(source)}; var result = (${section.getText(source)});`), context);
  return renderToStaticMarkup(context.result);
}

test("pending employee without Business sees Team, consent explanation and both buttons", () => {
  const html = renderTeam({teamInvitations: [{id: 7, organization_name: "Example Team"}]});
  for (const text of ["Команда", "Example Team", "Присоединиться", "Отклонить", "SMTP/IMAP останется личной"]) assert.ok(html.includes(text), text);
});

test("after decline with no Business, active team or invitations section hides", () => {
  assert.equal(renderTeam(), "");
});

test("owner sees pending badge and can cancel invitation", () => {
  const html = renderTeam({teamMe: {has_team: true, role: "owner", can_manage_team: true},
    teamMembers: [{id: 7, email: "worker@example.com", role: "manager", status: "pending"}]});
  assert.ok(html.includes("Менеджер · Ожидает подтверждения"));
  assert.ok(html.includes("Отменить приглашение"));
  assert.ok(html.includes("Пригласить сотрудника"));
});

test("active manager retains shared Business limit explanation", () => {
  const html = renderTeam({teamMe: {has_team: true, role: "manager", owner_email: "owner@example.com"}});
  assert.ok(html.includes("Ваши запросы расходуют общий лимит руководителя"));
});
