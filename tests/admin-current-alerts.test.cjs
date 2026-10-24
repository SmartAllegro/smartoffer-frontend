const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const file = path.join(__dirname,"../src/features/admin/adminMonitoringAlerts.ts");
const js = ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2020}}).outputText;
const targetModule = {exports:{}};
vm.runInNewContext(js,{module:targetModule,exports:targetModule.exports,Date});
const derive = targetModule.exports.deriveCurrentMonitorAlerts;
const now = Date.parse("2026-10-19T12:00:00Z");
const at = "2026-10-19T11:59:50Z";
const snapshot = (components=[],queues=[]) => ({generated_at:at,components,queues,
  vm:{id:"vm",state:"unknown",stale:false,observed_at:null,issue:"Ожидается источник VM."}});
const component = (id,state,issue=null) => ({id,state,issue,stale:false,observed_at:at});
const queue = (state,overrides={}) => ({id:"search",state,stale:false,observed_at:at,
  issue:"Есть ожидающие задания без активного worker.",pending:2,workers_active:0,...overrides});

test("only confirmed current problems appear as incidents", () => {
  const result=derive(snapshot([component("postgresql","critical","Проверка базы данных не прошла."),
    component("caddy","unknown")],[queue("warning")]),{now});
  assert.deepEqual(Array.from(result.incidents.map(x=>x.id)),["postgresql","search"]);
  assert.deepEqual(Array.from(result.incidents.map(x=>x.severity)),["critical","warning"]);
  assert.deepEqual(Array.from(result.diagnostics.map(x=>x.id)),["caddy","vm"]);
  assert.equal(result.incidents[0].observedAt,at);
});

test("empty queue without worker is diagnostic, recovery removes an incident", () => {
  const first=derive(snapshot([],[queue("warning")]),{now});
  assert.equal(first.incidents.length,1);
  const recovered=derive(snapshot([component("postgresql","healthy")],
    [queue("unknown",{pending:0,issue:"Нет свежего сигнала worker."})]),{now});
  assert.equal(recovered.incidents.length,0);
  assert.ok(recovered.diagnostics.some(x=>x.id==="search"));
});

test("stale and failed snapshots never claim current confirmed incidents", () => {
  const critical=snapshot([component("redis","critical")]);
  assert.equal(derive(critical,{now:now+120_000}).source,"stale");
  assert.equal(derive(critical,{now:now+120_000}).incidents.length,0);
  assert.equal(derive(critical,{now,isError:true}).source,"error");
  assert.equal(derive(undefined,{now}).source,"loading");
});

test("safe text is bounded and no duplicate worker incident is generated", () => {
  const result=derive(snapshot([component("search_worker","warning"),
    component("redis","critical","x".repeat(300))],[queue("warning")]),{now});
  assert.deepEqual(Array.from(result.incidents.map(x=>x.id)),["redis","search"]);
  assert.equal(result.incidents[0].description.length,180);
});
