const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function harness({api = {}, query = () => ({}), client = {}} = {}) {
  let cursor = 0, values = [], effects = [], tree, lastFn, lastProps;
  let now = Date.now(), nextTimer = 1, authContext = 'session-A';
  const timers = new Map(), cleanups = new Map(), authListeners = new Set();
  class Clock extends Date { static now() { return now; } }
  class ApiError extends Error { constructor(status) {super('synthetic'); this.status=status;} }
  client = {ApiError, ...client};
  function addTimer(fn, delay, interval=false) {const id=nextTimer++;timers.set(id,{fn,at:now+delay,delay,interval});return id;}
  const calls = [], listeners = {}, modules = new Map();
  const React = {
    useState(initial) { const i=cursor++; if (!(i in values)) values[i]=initial; return [values[i], v=>{values[i]=v;}]; },
    useRef(initial) { const i=cursor++; return values[i] ||= {current:initial}; },
    useEffect(fn, deps) { const i=cursor++; const old=values[i];
      if (!old || !deps || deps.some((v,j)=>v!==old[j])) {values[i]=deps; effects.push(()=>{cleanups.get(i)?.(); cleanups.set(i,fn());});}
    },
    useSyncExternalStore() {return "synthetic-token";},
  };
  const jsx = (type, props) => ({type, props:props || {}});
  const window = {
    setInterval: (fn,ms)=>addTimer(fn,ms,true), clearInterval: id=>timers.delete(id),
    setTimeout: (fn,ms)=>addTimer(fn,ms), clearTimeout: id=>timers.delete(id),
    addEventListener: (name, fn) => {listeners[name]=fn;}, removeEventListener() {},
    dispatchEvent: event => { calls.push(["event", event.type]); listeners[event.type]?.(event); },
  };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const module={exports:{}};
    const code=ts.transpileModule(read(file), {compilerOptions:{module:ts.ModuleKind.CommonJS,
      target:ts.ScriptTarget.ES2020, jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(code, {module, exports:module.exports, window, document:{}, Date:Clock, URLSearchParams, AbortController,
      CustomEvent:class {constructor(type, props) {this.type=type; Object.assign(this, props);}},
      require(name) {
        if (name === "react") return React;
        if (name === "react/jsx-runtime") return {jsx,jsxs:jsx,Fragment:"fragment"};
        if (name === "@/api/admin") return api;
        if (name === "./client" || name === "@/api/client") return client;
        if (name === "@/shared/utils/auth") return {getAuthToken:()=>"synthetic-token", getAuthContextKey:()=>authContext,
          subscribeAuth:fn=>{authListeners.add(fn);return ()=>authListeners.delete(fn);}};
        if (name === "@tanstack/react-query") return {useQuery: options=>{calls.push(["query", options]);return query(options);},
          useQueryClient:()=>({invalidateQueries:async()=>calls.push(["invalidate"])})};
        return new Proxy({}, {get:(_, key)=>key});
      },
    }, {filename:file});
    modules.set(file,module.exports); return module.exports;
  }
  return {load,calls,window,ApiError,
    logout(){authContext='logged-out';authListeners.forEach(fn=>fn());},
    unmount(){cleanups.forEach(fn=>fn?.());cleanups.clear();},
    async tick(ms){const end=now+ms;let count=0;
      while(true){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;
        assert.ok(count++<10000);const [id,t]=entry;now=t.at;if(t.interval)t.at+=t.delay;else timers.delete(id);
        await t.fn(); if(lastFn){this.render(lastFn,lastProps);this.effects();}
      }now=end;
    },
    render(fn, props={}) {cursor=0; effects=[]; lastFn=fn;lastProps=props;tree=fn(props); return tree;},
    effects() {const pending=effects;effects=[];pending.forEach(fn=>fn());},
    nodes() { const all=[]; const visit=node=>{if (!node || typeof node!=="object")return;
      if(Array.isArray(node)) {node.forEach(visit);return;} all.push(node);visit(node.props?.children);};visit(tree);return all;},
  };
}

test("MFA form sends, masks phone, filters code, verifies, and starts resend cooldown", async()=>{
  const calls=[];
  const h=harness({api:{sendAdminMfa:async()=>{calls.push("send");return {challenge_id:"a".repeat(32),state:"sms_required",expires_in:300};},
    verifyAdminMfa:async code=>{calls.push(code);return {state:"verified"};}}});
  const form=h.load("src/features/admin/components/AdminMfaForm.tsx").AdminMfaForm;
  const props={phoneMasked:"+7********00", provisioned:true, onVerified:()=>calls.push("verified")};
  h.render(form,props);
  await h.nodes().find(n=>n.props.type==="button").props.onClick();
  h.render(form,props);
  assert.match(JSON.stringify(h.nodes()), /Введите четырёхзначный/);
  assert.match(JSON.stringify(h.nodes()), /\+7\*{8}00/);
  assert.equal(h.nodes().find(n=>n.props.type==="button").props.disabled,true);
  const input=h.nodes().find(n=>n.type==="Input");
  assert.equal(input.props.maxLength,4); assert.equal(input.props.inputMode,"numeric");
  input.props.onChange({target:{value:"a12-34567"}});
  const rendered=h.render(form,props);
  assert.equal(h.nodes().find(n=>n.type==="Input").props.value,"1234");
  await rendered.props.onSubmit({preventDefault(){}});
  assert.deepEqual(calls,["send","1234","verified"]);
});

test("unprovisioned admin cannot send and no number input is rendered", ()=>{
  const h=harness(); const form=h.load("src/features/admin/components/AdminMfaForm.tsx").AdminMfaForm;
  h.render(form,{provisioned:false,phoneMasked:null,onVerified(){}});
  assert.equal(h.nodes().filter(n=>n.type==="Input"||n.type==="Button").length,0);
  assert.match(JSON.stringify(h.nodes()),/не настроено/);
});

test("AdminPage checks status before enabling admin data and loads me after verification", async()=>{
  let verified=false;
  const status={required:true,verified:false,provisioned:true,phone_masked:"+7********00",expires_at:null};
  const h=harness({api:{ADMIN_MFA_EVENT:"mfa",getAdminMfaStatus(){},getAdminMe(){}},
    query: options=>options.queryKey[1]==="mfa" ? {data:{...status,verified},refetch:async()=>{verified=true;}}
      : {data:options.enabled ? {is_admin:true} : undefined}, client:{ApiError:class extends Error{}}});
  const page=h.load("src/pages/AdminPage.tsx").default;
  h.render(page);
  assert.equal(h.calls.find(c=>c[0]==="query"&&c[1].queryKey[1]==="me")[1].enabled,false);
  assert.ok(h.nodes().find(n=>n.type==="AdminMfaForm"));
  await h.nodes().find(n=>n.type==="AdminMfaForm").props.onVerified();
  h.render(page);
  assert.equal(h.calls.filter(c=>c[0]==="query"&&c[1].queryKey[1]==="me").at(-1)[1].enabled,true);
  assert.ok(h.nodes().find(n=>n.type==="AdminLayout"));
});

test("428 opens step-up dialog; successful MFA never retries destructive action", async()=>{
  const h=harness({api:{ADMIN_MFA_EVENT:"mfa",getAdminMfaStatus(){},getAdminMe(){}},
    query: options=>options.queryKey[1]==="mfa" ? {data:{verified:true,provisioned:true},refetch:async()=>{}}
      : {data:{is_admin:true}}, client:{ApiError:class extends Error{}}});
  const page=h.load("src/pages/AdminPage.tsx").default;
  h.render(page); h.effects(); h.window.dispatchEvent({type:"mfa",detail:"admin_step_up_required"});
  h.render(page);
  assert.equal(h.nodes().find(n=>n.type==="Dialog").props.open,true);
  await h.nodes().find(n=>n.type==="AdminMfaForm").props.onVerified();
  h.render(page);
  assert.equal(h.nodes().find(n=>n.type==="Dialog").props.open,false);
  assert.match(JSON.stringify(h.nodes()),/повторно подтвердите/);
  assert.deepEqual(h.calls.filter(c=>!["query","event","invalidate"].includes(c[0])),[]);
});

test("admin API signals MFA only on 428; never replays mutation", async()=>{
  class ApiError extends Error {constructor(status,detail) {super();this.status=status;this.body={detail};}}
  const requests=[];
  let failure;
  const h=harness({client:{ApiError,apiFetch:async(path,options)=>{requests.push({path,options});if(failure)throw failure;return {ok:true};}}});
  const api=h.load("src/api/admin.ts");
  await api.sendAdminMfa(); await api.verifyAdminMfa("1234", "a".repeat(32));
  assert.equal(requests[0].path,"/admin/mfa/send");
  assert.deepEqual(JSON.parse(JSON.stringify(requests[1].options.json)),{code:"1234",challenge_id:"a".repeat(32)});
  for(const detail of ["admin_step_up_required","admin_mfa_required"]){
    failure=new ApiError(428,detail);
    await assert.rejects(api.softDeleteAdminUser(7,"synthetic@example.com"));
  }
  assert.equal(requests.length,4); assert.equal(h.calls.length,2);
  failure=new ApiError(429,"rate_limited");
  await assert.rejects(api.restoreAdminUser(7)); assert.equal(h.calls.length,2);
});

test("no SMS secrets in frontend sources and navigation is pre-MFA", ()=>{
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for(const file of walk(path.join(__dirname,"../src"))) {
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/SMSAERO_[A-Z_]+|ADMIN_MFA_CODE_SECRET/);
  }
  assert.match(read("src/pages/Index.tsx"),/queryFn: getAdminMfaStatus/);
});

function mobileHarness(overrides={}) {
  const calls=[]; let result={state:"waiting"};
  const api={sendAdminMfa:async()=>({challenge_id:"a".repeat(32),state:"waiting",expires_in:300}),
    pollAdminMfa:async()=>{calls.push("poll");return result;}, ...overrides};
  const h=harness({api}); const form=h.load("src/features/admin/components/AdminMfaForm.tsx").AdminMfaForm;
  const props={phoneMasked:"+7********00",provisioned:true,onVerified:()=>calls.push("verified")};
  const render=()=>{h.render(form,props);h.effects();};render();
  return {h,calls,render,setResult:value=>{result=value;},async send(){await h.nodes().find(n=>n.props.type==="button").props.onClick();render();}};
}

test("SIM-PUSH polling begins after 4 seconds and only final status completes",async()=>{
  const f=mobileHarness(); await f.send();
  assert.match(JSON.stringify(f.h.nodes()),/Ожидаем SIM-PUSH/);
  assert.equal(f.h.nodes().filter(n=>n.type==="Input").length,0);
  await f.h.tick(3999);assert.deepEqual(f.calls,[]);
  await f.h.tick(1);assert.deepEqual(f.calls,["poll"]);
  f.setResult({state:"processing"});await f.h.tick(4000);
  f.setResult({state:"sms_required"});await f.h.tick(4000);
  assert.equal(f.h.nodes().find(n=>n.type==="Input").props.maxLength,4);
  f.setResult({state:"verified"});await f.h.tick(4000);
  assert.equal(f.calls.filter(x=>x==="verified").length,1);
  const count=f.calls.length;await f.h.tick(20000);assert.equal(f.calls.length,count);
  f.h.unmount();
});

for(const state of ["denied","error","expired"]){
  test(`terminal ${state} stops polling and allows retry after cooldown`,async()=>{
    const f=mobileHarness();await f.send();f.setResult({state});await f.h.tick(4000);
    assert.equal(f.calls.length,1);await f.h.tick(60000);assert.equal(f.calls.length,1);
    assert.equal(f.h.nodes().find(n=>n.props.type==="button").props.disabled,false);
    await f.send();assert.match(JSON.stringify(f.h.nodes()),/Ожидаем SIM-PUSH/);f.h.unmount();
  });
}

test("waiting is bounded to five minutes",async()=>{
  const f=mobileHarness();await f.send();await f.h.tick(300000);
  assert.match(JSON.stringify(f.h.nodes()),/Срок подтверждения истёк/);
  const count=f.calls.length;assert.ok(count<76);await f.h.tick(10000);assert.equal(f.calls.length,count);f.h.unmount();
});

test("network failures retry with bounded polling",async()=>{
  let count=0;const f=mobileHarness({pollAdminMfa:async()=>{count++;throw new Error('offline');}});
  await f.send();await f.h.tick(4000);assert.match(JSON.stringify(f.h.nodes()),/Нет ответа от сервиса/);
  await f.h.tick(4000);assert.equal(count,2);f.h.unmount();
});

test("logout or unmount ignores a late successful send",async()=>{
  for(const action of ['logout','unmount']){
    let resolve;const f=mobileHarness({sendAdminMfa:()=>new Promise(r=>{resolve=r;})});
    const sending=f.send();f.h[action]();resolve({challenge_id:'a'.repeat(32),state:'verified',expires_in:300});await sending;
    assert.deepEqual(f.calls,[]);assert.equal(f.h.nodes().filter(n=>n.type==='Input').length,0);f.h.unmount();
  }
});

test("logout aborts an in-flight poll and ignores success",async()=>{
  let resolve,signal;const f=mobileHarness({pollAdminMfa:(_,s)=>{signal=s;return new Promise(r=>{resolve=r;});}});
  await f.send();const ticking=f.h.tick(4000);for(let i=0;i<20&&!signal;i++)await Promise.resolve();
  assert.ok(signal);f.h.logout();assert.equal(signal.aborted,true);resolve({state:'verified'});await ticking;
  assert.deepEqual(f.calls,[]);f.h.unmount();
});

test("wrong OTP clears input and preserves the SMS challenge",async()=>{
  const f=mobileHarness({verifyAdminMfa:async()=>{throw new f.h.ApiError(400);}});
  await f.send();f.setResult({state:'sms_required'});await f.h.tick(4000);
  f.h.nodes().find(n=>n.type==='Input').props.onChange({target:{value:'0000'}});f.render();
  await f.h.nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});f.render();
  assert.match(JSON.stringify(f.h.nodes()),/Неверный SMS-код/);
  assert.equal(f.h.nodes().find(n=>n.type==='Input').props.value,'');f.h.unmount();
});

test("auth failure stops polling and rate limiting is visible",async()=>{
  for(const status of [401,403,429]){
    let count=0;const f=mobileHarness({pollAdminMfa:async()=>{count++;throw new f.h.ApiError(status);}});
    await f.send();await f.h.tick(4000);
    assert.match(JSON.stringify(f.h.nodes()),status===429 ? /Слишком частые попытки/ : /Сессия недоступна/);
    await f.h.tick(4000);assert.equal(count,status===429?2:1);f.h.unmount();
  }
});

test("expiry aborts a slow poll; late success cannot complete and requests do not overlap",async()=>{
  let resolve,signal,count=0;const f=mobileHarness({pollAdminMfa:(_,s)=>{count++;signal=s;return new Promise(r=>{resolve=r;});}});
  await f.send();const pending=f.h.tick(4000);for(let i=0;i<20&&!signal;i++)await Promise.resolve();
  assert.ok(signal);await f.h.tick(300000);assert.equal(count,1);assert.equal(signal.aborted,true);
  resolve({state:'verified'});await pending;f.render();
  assert.match(JSON.stringify(f.h.nodes()),/Срок подтверждения истёк/);assert.deepEqual(f.calls,[]);f.h.unmount();
});
