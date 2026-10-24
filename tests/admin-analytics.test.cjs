const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const compile = source => ts.transpileModule(source, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
}}).outputText;

function view(file, exportName, queryResult) {
  let cursor = 0;
  const states = [];
  const calls = [];
  const jsx = (type, props) => ({type: typeof type === "function" ? type.name : type, props: props || {}});
  const module = {exports: {}};
  vm.runInNewContext(compile(read(file)), {module, exports:module.exports,
    require(name) {
      if (name === "react") return {useState(initial) {const i=cursor++; if (!(i in states)) states[i]=initial;
        return [states[i], next=>{states[i]=next;}];}};
      if (name === "react/jsx-runtime") return {jsx,jsxs:jsx,Fragment:"Fragment"};
      if (name === "@tanstack/react-query") return {useQuery(options) {calls.push(options); return queryResult(options);}};
      if (name === "@/api/admin") return {getAdminAnalytics:()=>{},getAdminPayments:()=>{},getAdminPlans:()=>{}};
      if (name === "../adminUtils") return {formatCurrencyRub:value=>`${value} ₽`};
      if (name === "./AdminPanels") return {AdminKpi:"AdminKpi",AdminPanel:"AdminPanel",NoData:"NoData"};
      if (name === "./AdminSeriesChart") return {AdminSeriesChart:"AdminSeriesChart"};
      return new Proxy({}, {get:(_, key)=>String(key)});
    },
  }, {filename:file});
  const render = () => {cursor=0; return module.exports[exportName]();};
  const nodes = root => {const result=[]; function visit(node) {if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    result.push(node); visit(node.props?.children);}
    visit(root); return result;};
  return {render,nodes,calls};
}

const analytics = {registrations:0, registration_change_pct:null, registration_series:[], revenue_series:[], bucket:"day",
  activity:{registered_users:2,users_with_search_ever:1,active_search_users:0,search_jobs:0,searches_completed:0,
    searches_failed:0,emails_sent:0,emails_unsent:0},
  commercial:{confirmed_orders:0,revenue_rub:0,paying_users:0,active_paid_plan_users:0,payment_errors:0,
    paid_orders_by_plan:[],current_plan_assignments:[]},funnel:[]};

test("dashboard switches the period, shows real zeroes, and retries errors", () => {
  let failing=false;
  const h=view("src/features/admin/components/AdminDashboard.tsx","AdminDashboard",()=>failing
    ? {isError:true,refetch:()=>{}} : {data:analytics});
  let tree=h.render();
  assert.match(JSON.stringify(tree), /"value":"0"/);
  assert.equal(h.nodes(tree).find(node=>node.type==="AdminSeriesChart").props.points.length,0);
  const button=h.nodes(tree).find(node=>node.type==="button" && node.props.children==="7 дней");
  button.props.onClick();
  h.render();
  assert.equal(h.calls.at(-1).queryKey[2],"7d");
  failing=true; tree=h.render();
  assert.match(JSON.stringify(tree), /Не удалось загрузить аналитику/);
  assert.ok(h.nodes(tree).find(node=>node.type==="button" && node.props.children==="Повторить"));
});

test("billing uses server payment filters, shows empty state, and renders the registry", () => {
  let payments={items:[],total:0};
  const h=view("src/features/admin/components/AdminBillingView.tsx","AdminBillingView",options=>{
    if (options.queryKey[1]==="analytics") return {data:analytics};
    if (options.queryKey[1]==="plans") return {data:{items:[{code:"pro",name:"Pro",price_rub:500,requests_limit:100}]}};
    return {data:payments};
  });
  let tree=h.render();
  assert.match(JSON.stringify(tree), /По выбранным фильтрам платежей нет/);
  assert.equal(h.calls.find(call=>call.queryKey[1]==="payments").queryKey[2],"30d");
  h.nodes(tree).find(node=>node.type==="select" && node.props["aria-label"]==="Период биллинга").props.onChange({target:{value:"90d"}});
  h.render();
  assert.equal(h.calls.at(-1).queryKey[2],"90d");
  payments={items:[{id:1,created_at:"2026-10-17T12:00:00Z",user_id:7,user_email:"buyer@example.test",
    amount_rub:500,plan_code:"pro",status:"confirmed",provider_order_id:"order-1",provider:"tbank"}],total:1};
  tree=h.render();
  assert.match(JSON.stringify(tree), /buyer@example.test/);
  assert.match(JSON.stringify(tree), /order-1/);
  assert.match(JSON.stringify(tree), /Дата создания/);
});

test("payment registry filter and server error expose retry", () => {
  let failed=false;
  const h=view("src/features/admin/components/AdminBillingView.tsx","AdminBillingView",options=>{
    if (options.queryKey[1]==="analytics") return {data:analytics};
    if (options.queryKey[1]==="plans") return {data:{items:[]}};
    return failed ? {isError:true,refetch:()=>{}} : {data:{items:[],total:0}};
  });
  let tree=h.render();
  h.nodes(tree).find(node=>node.type==="select" && node.props["aria-label"]==="Статус платежа")
    .props.onChange({target:{value:"failed"}});
  h.render();
  assert.equal(h.calls.at(-1).queryKey[3],"failed");
  failed=true; tree=h.render();
  assert.match(JSON.stringify(tree), /Не удалось загрузить платежи/);
  assert.ok(h.nodes(tree).find(node=>node.type==="button" && node.props.children==="Повторить"));
});

test("admin API requests use read-only analytics and payment query parameters", async () => {
  const calls=[]; const module={exports:{}};
  vm.runInNewContext(compile(read("src/api/admin.ts")), {module,exports:module.exports,URLSearchParams,
    require:()=>({apiFetch:async url=>{calls.push(url);return {};},ApiError:class extends Error{}})});
  await module.exports.getAdminAnalytics("7d");
  await module.exports.getAdminPayments({period:"90d",status:"confirmed",plan_code:"pro",q:"buyer",limit:20,offset:40});
  assert.equal(calls[0],"/admin/analytics?period=7d");
  const url=new URL(calls[1],"http://localhost");
  assert.equal(url.pathname,"/admin/payments");
  assert.equal(url.searchParams.get("offset"),"40");
  assert.equal(url.searchParams.get("status"),"confirmed");
  assert.equal(url.searchParams.get("plan_code"),"pro");
});

test("series chart treats zero buckets as an empty state and renders real payment points", () => {
  const module={exports:{}};
  const jsx=(type,props)=>({type,props:props||{}});
  vm.runInNewContext(compile(read("src/features/admin/components/AdminSeriesChart.tsx")), {
    module,exports:module.exports,Intl,Date,
    require(name) {
      if (name==="react/jsx-runtime") return {jsx,jsxs:jsx};
      if (name==="recharts") return new Proxy({}, {get:(_,key)=>String(key)});
      if (name==="../adminUtils") return {formatCurrencyRub:value=>`${value} ₽`};
      if (name==="./AdminPanels") return {NoData:"NoData"};
      return {};
    },
  });
  const chart=module.exports.AdminSeriesChart;
  assert.equal(chart({points:[],bucket:"day",kind:"revenue"}).type,"NoData");
  assert.equal(chart({points:[{bucket_start:"2026-10-18T00:00:00Z",count:0,amount_rub:0}],
    bucket:"day",kind:"revenue"}).type,"NoData");
  const real=chart({points:[{bucket_start:"2026-10-18T00:00:00Z",count:1,amount_rub:5500}],
    bucket:"day",kind:"revenue"});
  assert.equal(real.type,"div");
  assert.match(JSON.stringify(real),/ResponsiveContainer/);
  assert.match(JSON.stringify(real),/amount_rub/);
});
