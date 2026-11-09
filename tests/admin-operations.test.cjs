const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
function harness(file,query=()=>({isLoading:true})) {
 let states=[],cursor=0,calls=[];const module={exports:{}};
 const jsx=(type,props)=>({type,props:props||{}});
 const code=fs.readFileSync(path.join(__dirname,"../src/features/admin/components/"+file),"utf8");
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require(name){
  if(name==="react")return {useState(v){const i=cursor++;if(!(i in states))states[i]=v;return [states[i],n=>states[i]=typeof n==="function"?n(states[i]):n];},useEffect(){}};
  if(name==="react/jsx-runtime")return {jsx,jsxs:jsx,Fragment:"Fragment"};
  if(name==="@tanstack/react-query")return {useQuery(o){calls.push(o);return query(o);}};
  return new Proxy({}, {get:(_,k)=>String(k)});
 }});
 const nodes=root=>{const out=[];function visit(n){if(!n||typeof n!=="object")return;if(Array.isArray(n))return n.forEach(visit);out.push(n);visit(n.props?.children);}visit(root);return out;};
 return {render(name,props){cursor=0;return module.exports[name](props);},nodes,calls};
}
const row={event_id:"a".repeat(32),occurred_at:"2026-11-10T00:00:00Z",category:"release",event_type:"release.succeeded",outcome:"success",source:"operator",component:null,release_tag:"smartoffer-app:release-2026-11-10",backend_commit:"abcdef123456789",frontend_commit:"fedcba123456789",details:{changes:["Persistent history"]}};
test("Production is default; admin audit remains available",()=>{
 const h=harness("AdminAuditView.tsx");let t=h.render("AdminAuditView");
 assert.ok(h.nodes(t).find(n=>n.type==="button"&&n.props.children==="Production").props["aria-selected"]);
 h.nodes(t).find(n=>n.type==="button"&&n.props.children==="Действия администраторов").props.onClick();
 t=h.render("AdminAuditView");assert.ok(h.nodes(t).find(n=>n.type==="button"&&n.props.children==="Действия администраторов").props["aria-selected"]);
});
test("production loading, empty, error, filters, pagination and selection",()=>{
 let state="loading";
 const h=harness("AdminOperationsView.tsx",o=>state==="loading"?{isLoading:true}:state==="error"?{isError:true}:o.queryKey[0]==="operations-summary"?{data:{total:30,failures:2,recoveries:1,releases:3,source:{state:"unknown"}}}:o.queryKey[0]==="operations-events"?{data:{items:state==="empty"?[]:[row],total:30}}:{data:row});
 assert.match(JSON.stringify(h.render("AdminOperationsView")),/Загрузка событий/);
 state="empty";assert.match(JSON.stringify(h.render("AdminOperationsView")),/Событий по выбранным фильтрам нет/);
 state="error";assert.match(JSON.stringify(h.render("AdminOperationsView")),/Не удалось загрузить историю/);
 state="ready";let t=h.render("AdminOperationsView");assert.match(JSON.stringify(t),/Сохранённая история доступна/);
 h.nodes(t).find(n=>n.type==="button"&&n.props.children==="Далее").props.onClick();h.render("AdminOperationsView");
 assert.ok(h.calls.some(c=>c.queryKey[2]===20));
 h.nodes(t).find(n=>n.type==="select"&&n.props["aria-label"]==="Категория").props.onChange({target:{value:"migration"}});t=h.render("AdminOperationsView");
 assert.ok(h.calls.some(c=>c.queryKey[1]?.category==="migration"&&c.queryKey[2]===0));
 h.nodes(t).find(n=>n.type==="button"&&n.props.children==="Открыть").props.onClick();h.render("AdminOperationsView");
 assert.equal(h.calls.at(-1).enabled,true);
});
test("release, migration and recovery details are readable without raw JSON",()=>{
 const h=harness("AdminOperationsView.tsx");let t=h.render("OperationalDetails",{event:row});
 assert.match(JSON.stringify(t),/Persistent history/);assert.match(JSON.stringify(t),/abcdef123456/);assert.ok(!h.nodes(t).some(n=>n.type==="pre"));
 t=h.render("OperationalDetails",{event:{...row,release_tag:null,category:"migration",event_type:"migration.failed",details:{from_revision:"0060_admin_audit_events",to_revision:"0061_operational_events",reason_code:"container_network_address_in_use"}}});
 assert.match(JSON.stringify(t),/0061_operational_events/);assert.match(JSON.stringify(t),/Адрес контейнерной сети занят/);
 t=h.render("OperationalDetails",{event:{...row,release_tag:null,category:"service",event_type:"service.recovered",outcome:"recovered",correlation_id:"b".repeat(32),resolved_at:"2026-11-10T00:01:00Z",details:{opened_at:row.occurred_at}}});
 assert.match(JSON.stringify(t),/Длительность/);assert.match(JSON.stringify(t),/60/);
});
