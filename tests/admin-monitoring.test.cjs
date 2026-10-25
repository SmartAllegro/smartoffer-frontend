const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/features/admin/components/AdminMonitoringView.tsx"), "utf8");
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2020, jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx = (type, props) => ({type:typeof type==="function" ? type.name : type, props:props||{}});

function view(summary) {
  const calls = [];
  const module = {exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,Date,
    require(name) {
      if (name==="react/jsx-runtime") return {jsx,jsxs:jsx,Fragment:"Fragment"};
      if (name==="@tanstack/react-query") return {useQuery(options) {
        calls.push(options);
        return {data:undefined};
      }};
      if (name==="./AdminPanels") return {AdminKpi:"AdminKpi",AdminPanel:"AdminPanel",NoData:"NoData"};
      if (name==="./AdminSeriesChart") return {AdminSeriesChart:"AdminSeriesChart"};
      if (name==="../adminMonitoringAlerts") return {deriveCurrentMonitorAlerts:(data,options)=>({
        source:options.isError?"error":data?"ready":"loading",
        incidents:data?.components.filter(item=>item.state==="warning"||item.state==="critical")
          .map(item=>({id:item.id,service:item.id,description:item.issue,severity:item.state,observedAt:item.observed_at,category:"Сервис"}))??[],
        diagnostics:[],
      })};
      if (name==="@/api/admin") return {getAdminAnalytics:()=>{}};
      return new Proxy({}, {get:(_,key)=>String(key)});
    }});
  return {tree:module.exports.AdminMonitoringView({monitoring:summary}),calls};
}

function textOf(node) {
  if (node==null || typeof node==="boolean") return "";
  if (typeof node==="string" || typeof node==="number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  return textOf(node.props?.children);
}

test("monitoring consumes shared B2 snapshot and only queries cached B1 chart", () => {
  const {calls} = view({isLoading:true,isFetching:true});
  assert.equal(calls.length,1);
  assert.deepEqual(Array.from(calls[0].queryKey),["admin","analytics","7d"]);
  assert.equal(calls[0].refetchInterval,undefined);
  const page=fs.readFileSync(path.join(__dirname,"../src/pages/AdminPage.tsx"),"utf8");
  assert.equal((page.match(/getAdminMonitoringSummary\(signal\)/g)||[]).length,1);
  assert.match(page,/refetchInterval:30_000, refetchIntervalInBackground:false/);
});

test("loading, error, unknown, healthy, warning and critical are visible", () => {
  assert.match(textOf(view({isLoading:true}).tree),/Загрузка диагностики/);
  assert.match(textOf(view({isError:true}).tree),/Диагностика недоступна/);
  const data = {generated_at:new Date().toISOString(), components:[
    {id:"api",state:"healthy",metric:"Обработчик ответил"},
    {id:"postgresql",state:"critical",issue:"Проверка базы данных не прошла."},
    {id:"redis",state:"warning",issue:"Предупреждение"},
  ],queues:[],vm:{state:"unknown",stale:false}};
  const rendered = textOf(view({data}).tree);
  assert.match(rendered,/Работает/);
  assert.match(rendered,/Сбой/);
  assert.match(rendered,/Внимание/);
  assert.match(rendered,/Не проверялось/);
  assert.match(rendered,/Источник телеметрии VM не подключён/);
  data.generated_at="2020-01-01T00:00:00Z";
  assert.match(textOf(view({data}).tree),/Снимок устарел/);
});

test("history-only failures and healthy VM resources stay visually separated", () => {
  const data = {generated_at:new Date().toISOString(), components:[
    {id:"api",state:"healthy",metric:"Обработчик ответил"},
    {id:"mail_scheduler",state:"healthy"}, {id:"caddy",state:"healthy"},
  ], queues:[{id:"mail_sync",state:"healthy",pending:0,started:0,failed:247,
    fresh_failed:0,workers_active:1,workers_registered:1}], events:[],
    search_failed_15m:0,search_failed_24h:3,
    mail_sync_failed_attempts_15m:0,mail_sync_failed_attempts_24h:245,
    mail_sync_unique_failed_states_15m:0,mail_sync_unique_failed_states_24h:12,
    mail_sync_current_error_states:0,mail_sync_active_backoff_states:0,
    vm:{state:"healthy",cpu_pct:12.4,ram_pct:38.1,disk_pct:41,free_disk_bytes:10737418240,
      snapshot_age_seconds:15,backup_state:"healthy",backup_age_seconds:120,
      integrity_state:"healthy",retention_state:"healthy",restore_smoke_state:"healthy",
      full_dr_state:"unknown",backup_confirmed_at:new Date().toISOString()},
  };
  const rendered=textOf(view({data}).tree);
  assert.match(rendered,/Mail Sync failures:\s+245\s+· свежие за 15 мин:\s+0/);
  assert.match(rendered,/Ошибки за 15 мин:\s+0\s+· История RQ:\s+247/);
  assert.match(rendered,/CPU:\s+12.4\s+%/);
  assert.match(rendered,/full DR:\s+Не проверялось/);
});
