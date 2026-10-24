const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname,"../src/features/admin/components/AdminLayout.tsx"),"utf8");
const alertSource = fs.readFileSync(path.join(__dirname,"../src/features/admin/adminMonitoringAlerts.ts"),"utf8");
const compile = code => ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx = (type,props) => ({type:typeof type==="function" ? type.name : type,props:props||{}});
const alertsModule = {exports:{}};
vm.runInNewContext(compile(alertSource),{module:alertsModule,exports:alertsModule.exports,Date});

function harness(monitoring, storage=new Map()) {
  let cursor=0, dirty=false; const states=[]; const changes=[]; const effects=[];
  const target={exports:{}};
  vm.runInNewContext(compile(source),{module:target,exports:target.exports,Date,
    window:{sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}},
    require(name) {
      if(name==="react") return {useState(initial) {const i=cursor++;
        if(!(i in states)) states[i]=typeof initial==="function"?initial():initial;
        return [states[i],value=>{const next=typeof value==="function"?value(states[i]):value;
          if(!Object.is(next,states[i])) {states[i]=next;dirty=true;}}];},
        useEffect(effect,deps) {const i=cursor++;const previous=states[i];
          if(!previous||deps.some((value,index)=>!Object.is(value,previous[index]))) {
            states[i]=deps;effects.push(effect);
          }
        }};
      if(name==="react/jsx-runtime") return {jsx,jsxs:jsx,Fragment:"Fragment"};
      if(name==="../adminMonitoringAlerts") return alertsModule.exports;
      if(name==="react-router-dom") return {Link:"Link"};
      if(name==="./AdminSidebar") return {AdminSidebar:"AdminSidebar"};
      if(name==="@/shared/ui/button") return {Button:"Button"};
      if(name==="@/shared/ui/sheet") return {Sheet:"Sheet",SheetContent:"SheetContent",
        SheetTitle:"SheetTitle",SheetTrigger:"SheetTrigger"};
      if(name==="@/api/auth") return {logoutUser:()=>Promise.resolve()};
      if(name.endsWith(".css")) return {};
      return new Proxy({}, {get:(_,key)=>String(key)});
    }});
  const render=()=>{let tree;let renders=0;do {cursor=0;dirty=false;
    tree=target.exports.AdminLayout({admin:{email:"admin@example.test",role:"support"},
    mfa:{verified:true},monitoring,section:"dashboard",onSectionChange:x=>changes.push(x),
    onUserSearch:()=>{},children:"content"});
    while(effects.length) effects.shift()();
    assert.ok(++renders<20,"effects must settle");
    } while(dirty);return tree;};
  const nodes=root=>{const result=[];function walk(value){if(!value||typeof value!=="object")return;
    if(Array.isArray(value))return value.forEach(walk);result.push(value);walk(value.props?.children);}walk(root);return result;};
  const text=root=>{const parts=[];function walk(value){if(value==null||typeof value==="boolean")return;
    if(typeof value==="string"||typeof value==="number"){parts.push(String(value));return;}
    if(Array.isArray(value))return value.forEach(walk);walk(value.props?.children);}walk(root);return parts.join(" ");};
  return {render,nodes,text,changes,storage,setMonitoring:value=>{monitoring=value;}};
}

const at = new Date().toISOString();
const data=(components=[],queues=[])=>({generated_at:at,components,queues,
  vm:{id:"vm",state:"unknown",stale:false,observed_at:null,issue:"Нет источника."}});
const component=(id,state)=>({id,state,stale:false,observed_at:at,
  issue:state==="critical"?"Проверка не прошла.":null});

test("empty notification panel and navigation show no fabricated unread count",()=>{
  const h=harness({data:data([component("postgresql","healthy")])});
  let tree=h.render();
  const bell=h.nodes(tree).find(x=>x.props["aria-label"]==="Текущие предупреждения мониторинга");
  assert.equal(bell.props["aria-expanded"],false);
  bell.props.onClick(); tree=h.render();
  assert.match(h.text(tree),/Подтверждённых текущих инцидентов нет/);
  assert.doesNotMatch(h.text(tree),/Прочитано|непрочитанных/);
  h.nodes(tree).find(x=>x.type==="button"&&x.props.children==="Открыть мониторинг").props.onClick();
  assert.deepEqual(h.changes,["monitoring"]);
  assert.equal(h.nodes(h.render()).find(x=>x.props["aria-label"]==="Текущие предупреждения мониторинга")
    .props["aria-expanded"],false);
});

test("confirmed incidents set a current count while unknown does not",()=>{
  const h=harness({data:data([component("postgresql","critical"),component("redis","warning"),
    component("caddy","unknown")])});
  let tree=h.render();
  assert.match(JSON.stringify(tree),/2 непрочитанных предупреждений/);
  h.nodes(tree).find(x=>x.props["aria-label"]==="Текущие предупреждения мониторинга").props.onClick();
  tree=h.render();
  assert.match(h.text(tree),/PostgreSQL/);
  assert.match(h.text(tree),/Redis/);
  assert.doesNotMatch(h.text(tree),/Caddy/);
  assert.doesNotMatch(JSON.stringify(tree),/непрочитанных предупреждений/);
  assert.equal(h.nodes(tree).filter(x=>x.type==="li").length,2);
});

test("network failure replaces old incidents with source error",()=>{
  const h=harness({data:data([component("postgresql","critical")]),isError:true});
  let tree=h.render();
  assert.doesNotMatch(JSON.stringify(tree),/непрочитанных предупреждений/);
  h.nodes(tree).find(x=>x.props["aria-label"]==="Текущие предупреждения мониторинга").props.onClick();
  tree=h.render();
  assert.match(h.text(tree),/Не удалось получить состояние мониторинга/);
  assert.doesNotMatch(h.text(tree),/PostgreSQL/);
});

test("read state survives remount/source error and resolved recurrence becomes unread",()=>{
  const current={data:data([component("postgresql","critical")])};
  const h=harness(current);
  const open=tree=>h.nodes(tree).find(x=>x.props["aria-label"]==="Текущие предупреждения мониторинга").props.onClick();
  assert.match(JSON.stringify(h.render()),/1 непрочитанных предупреждений/);
  open(h.render());
  assert.doesNotMatch(JSON.stringify(h.render()),/непрочитанных предупреждений/);
  const remount=harness(current,h.storage);
  assert.doesNotMatch(JSON.stringify(remount.render()),/непрочитанных предупреждений/);
  h.setMonitoring({...current,isError:true});
  assert.match(h.text(h.render()),/Не удалось получить состояние мониторинга/);
  h.setMonitoring(current);
  assert.doesNotMatch(JSON.stringify(h.render()),/непрочитанных предупреждений/);
  h.setMonitoring({data:data([component("postgresql","healthy")])});h.render();
  h.setMonitoring(current);
  assert.match(JSON.stringify(h.render()),/1 непрочитанных предупреждений/);
});
