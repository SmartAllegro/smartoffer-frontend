const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../src/features/admin/components/AdminAuditView.tsx"), "utf8");
const row = {event_id:"a".repeat(32), occurred_at:"2026-11-09T00:00:00Z", category:"security", event_type:"security.admin_mfa_verified", actor_id:1, outcome:"success", details:{}};
function harness({empty=false, fail=false}={}) {
  let cursor=0, effects=[], states=[], deps=[], cleanups=[], calls=[];
  const jsx=(type,props)=>({type,props:props||{}});
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
    module,exports:module.exports,require(name){
      if(name==="react") return {
        useState(initial){const i=cursor++; if(!(i in states)) states[i]=initial; return [states[i],v=>states[i]=typeof v==="function"?v(states[i]):v];},
        useEffect(fn,next){const i=cursor++; if(!deps[i]||next.some((v,j)=>v!==deps[i][j])) {deps[i]=next;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}
      };
      if(name==="react/jsx-runtime") return {jsx,jsxs:jsx,Fragment:"Fragment"};
      if(name==="@/api/admin") return {
        getAdminAuditEvents(f,offset,limit){calls.push({f,offset,limit});return fail?Promise.reject(Error()):Promise.resolve({items:empty?[]:[row],total:empty?0:30});},
        getAdminAuditSummary(){return Promise.resolve({total:30,successful:20,denied:2,mfa:8});},
        getAdminAuditEvent(id){calls.push({id});return Promise.resolve(row);}
      };
      return new Proxy({}, {get:(_,k)=>String(k)});
    }
  });
  const render=()=>{cursor=0;const tree=module.exports.AdminActionsAuditView();const pending=effects;effects=[];pending.forEach(f=>f());return tree;};
  const nodes=root=>{const out=[];function walk(n){if(!n||typeof n!=="object")return;if(Array.isArray(n))return n.forEach(walk);out.push(n);walk(n.props?.children);}walk(root);return out;};
  return {render,nodes,calls,settle:async()=>{await new Promise(r=>setImmediate(r));return render();}};
}
test("audit loads KPIs, rows, server filters, pagination and details",async()=>{
  const h=harness(); assert.match(JSON.stringify(h.render()),/Загрузка аудита/);
  let tree=await h.settle(); assert.match(JSON.stringify(tree),/MFA подтверждена/);
  assert.ok(h.nodes(tree).some(n=>n.props?.value==="30"));
  h.nodes(tree).find(n=>n.type==="button"&&n.props.children==="Открыть").props.onClick();h.render();tree=await h.settle();
  assert.equal(h.calls.at(-1).id,row.event_id); assert.match(JSON.stringify(tree),/event_id/);
  h.nodes(tree).find(n=>n.type==="button"&&n.props.children==="Далее").props.onClick();h.render();tree=await h.settle();
  assert.ok(h.calls.some(c=>c.offset===20));
  h.nodes(tree).find(n=>n.type==="select"&&n.props["aria-label"]==="Период").props.onChange({target:{value:"7d"}});h.render();await h.settle();
  assert.ok(h.calls.some(c=>c.f?.period==="7d"&&c.offset===0));
});
test("audit separates empty and error and keeps responsive wrappers",async()=>{
  const empty=harness({empty:true});empty.render();assert.match(JSON.stringify(await empty.settle()),/Событий по выбранным фильтрам нет/);
  const failed=harness({fail:true});failed.render();const tree=await failed.settle();assert.match(JSON.stringify(tree),/Не удалось загрузить аудит/);
  assert.doesNotMatch(JSON.stringify(tree),/Событий по выбранным фильтрам нет/);
  assert.match(source,/overflow-x-auto/);assert.match(source,/sm:grid-cols-2/);
});
