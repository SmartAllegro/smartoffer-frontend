const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const denied = () => json({detail: "invalid_access_session"}, 401, {"WWW-Authenticate": "Bearer"});
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness(fetchImpl = async () => json({ok:true}), stubs = {}) {
  const modules = new Map(), calls = [], storageCalls = [], keys = [];
  class RecordingMap extends Map { set(key, value) { keys.push(key); return super.set(key,value); } }
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = {exports:{}};
    modules.set(file, module);
    const source = read(file).replaceAll("import.meta.env.VITE_API_BASE_URL", '"http://127.0.0.1:10001"');
    const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(code, {
      module, exports:module.exports, Headers, Response, FormData, URLSearchParams, AbortController, atob,
      setTimeout: fn => setTimeout(fn, 0), Map: RecordingMap,
      document:{title:"Synthetic"}, window:{location:{href:"http://127.0.0.1:8081/#/"}},
      localStorage:{
        getItem(key) { storageCalls.push(["get", key]); return "synthetic-legacy-token"; },
        setItem(key,value) { storageCalls.push(["set", key,value]); },
        removeItem(key) { storageCalls.push(["remove", key]); },
      },
      fetch: async (url, options) => { calls.push({url,options}); return fetchImpl(url,options); },
      require(name) {
        if (name in stubs) return stubs[name];
        if (name === "@/config/env") return {env:{apiBaseUrl:"http://127.0.0.1:10001"}};
        const resolved = name.startsWith("@/") ? "src/"+name.slice(2)+".ts"
          : path.posix.normalize(path.posix.join(path.posix.dirname(file),name+".ts"));
        return load(resolved);
      },
    }, {filename:file});
    return module.exports;
  }
  return {load,calls,storageCalls,keys, auth:load("src/shared/utils/auth.ts"), client:load("src/api/client.ts"), api:load("src/api/auth.ts")};
}

test("login credentials and token stay in memory; legacy removal runs once", async () => {
  const h=harness(async () => json({access_token:"synthetic-access",token_type:"bearer"}));
  h.auth.removeLegacyAuthToken(); h.auth.removeLegacyAuthToken();
  await h.api.loginUser({email:"local@example.com",password:"synthetic"});
  assert.equal(h.auth.getAuthToken(),"synthetic-access");
  assert.equal(h.calls[0].options.credentials,"include");
  assert.deepEqual(h.storageCalls,[["remove","SMARTOFFER_AUTH_TOKEN"]]);
});

test("bootstrap single flight restores via cookie then /me before rendering", async () => {
  const h=harness(async url => url.endsWith("/refresh") ? json({access_token:"restored"}) : json({id:7}));
  const [a,b]=await Promise.all([h.api.bootstrapAuth(),h.api.bootstrapAuth()]);
  assert.equal(a.id,7); assert.equal(b.id,7);
  assert.deepEqual(h.calls.map(c=>new URL(c.url).pathname),["/auth/refresh","/auth/me"]);
  assert.equal(h.calls[0].options.credentials,"include");
  assert.equal(h.calls[1].options.headers.get("Authorization"),"Bearer restored");
  assert.match(read("src/App.tsx"),/if \(!ready\) return/);
});

test("missing refresh cookie leaves bootstrap logged out", async () => {
  const h=harness(async()=>json({detail:"invalid_refresh_session"},401));
  assert.equal(await h.api.bootstrapAuth(),null);
  assert.equal(h.auth.getAuthToken(),null); assert.equal(h.calls.length,1);
});

test("apiFetch uses current memory Bearer, credentials and preserves caller headers",async()=>{
  const h=harness(); h.auth.setAuthToken("current");
  await h.client.apiFetch("/x",{headers:new Headers({Accept:"application/json"})});
  assert.equal(h.calls[0].options.headers.get("Authorization"),"Bearer current");
  assert.equal(h.calls[0].options.headers.get("Accept"),"application/json");
  assert.equal(h.calls[0].options.credentials,"include");
});

test("confirmed Bearer 401 refreshes once and replays once",async()=>{
  const h=harness(async(url, options)=>url.endsWith("/refresh")?json({access_token:"fresh"}):
    options.headers.get("Authorization")==="Bearer old"?denied():json({ok:true}));
  h.auth.setAuthToken("old");
  assert.equal((await h.client.apiFetch("/protected")).ok,true);
  assert.equal(h.calls.length,3);
  assert.equal(h.calls[2].options.headers.get("Authorization"),"Bearer fresh");
});

test("business 401, anonymous 401 and non-Bearer challenges never refresh",async()=>{
  for(const [token,headers] of [["old",{}],[null,{"WWW-Authenticate":"Bearer"}],["old",{"WWW-Authenticate":"Basic"}]]) {
    const h=harness(async()=>json({},401,headers)); if(token) h.auth.setAuthToken(token);
    await assert.rejects(h.client.apiFetch("/business")); assert.equal(h.calls.length,1);
  }
});

test("429 and 503 never refresh, replay or clear the access session", async () => {
  for (const status of [429, 503]) {
    const h = harness(async () => json({detail:"Too many requests. Try again later."}, status,
      {"Retry-After":"60", "WWW-Authenticate":"Bearer"}));
    h.auth.setAuthToken("current-session");
    await assert.rejects(h.client.apiFetch("/search/submit", {method:"POST", json:{query:"pump"}}),
      error => error.status === status);
    assert.equal(h.calls.length, 1);
    assert.equal(h.auth.getAuthToken(), "current-session");
  }
});

test("five concurrent 401s share one refresh Promise",async()=>{
  const gate=deferred();
  const h=harness(async(url,options)=>{
    if(url.endsWith("/refresh")){await gate.promise;return json({access_token:"fresh"});}
    return options.headers.get("Authorization")==="Bearer old"?denied():json({ok:true});
  });
  h.auth.setAuthToken("old");
  const tasks=Array.from({length:5},()=>h.client.apiFetch("/protected"));
  await tick(); assert.equal(h.calls.filter(c=>c.url.endsWith("/refresh")).length,1);
  gate.resolve(); await Promise.all(tasks);
  assert.equal(h.calls.length,11);
});

for (const [status, detail] of [[428, "admin_mfa_required"], [428, "admin_step_up_required"], [429, "rate_limited"]]) {
  test(`${status} ${detail} never refreshes or replays admin mutation`, async()=>{
    const h=harness(async()=>json({detail},status,{"Retry-After":"60"}));
    h.auth.setAuthToken("synthetic-access");
    await assert.rejects(h.client.apiFetch("/admin/users/7/soft-delete", {method:"POST",json:{confirm_email:"synthetic@example.com"}}),
      error=>error.status===status);
    assert.equal(h.calls.length,1);
    assert.equal(h.auth.getAuthToken(),"synthetic-access");
  });
}

test("late old-token 401 reuses completed refresh",async()=>{
  const gate=deferred(); let oldRequests=0;
  const h=harness(async(url,options)=>{
    if(url.endsWith("/refresh")) return json({access_token:"fresh"});
    if(options.headers.get("Authorization")==="Bearer old") {if(++oldRequests===2) await gate.promise; return denied();}
    return json({ok:true});
  });
  h.auth.setAuthToken("old");
  const first=h.client.apiFetch("/a"), second=h.client.apiFetch("/b");
  await first; gate.resolve(); await second;
  assert.equal(h.calls.filter(c=>c.url.endsWith("/refresh")).length,1);
});

test("refresh failure clears memory and notifies UI; no original replay",async()=>{
  const h=harness(async()=>denied()); h.auth.setAuthToken("old"); let cleared=false;
  h.auth.subscribeAuth(()=>{if(!h.auth.getAuthToken())cleared=true;});
  await assert.rejects(h.client.apiFetch("/protected"));
  assert.equal(h.calls.length,2); assert.equal(h.auth.getAuthToken(),null); assert.ok(cleared);
});

test("a second auth 401 cannot loop",async()=>{
  const h=harness(async url=>url.endsWith("/refresh")?json({access_token:"fresh"}):denied());
  h.auth.setAuthToken("old"); await assert.rejects(h.client.apiFetch("/protected"));
  assert.equal(h.calls.length,3);
});

test("multi-tab rotation conflict retries shared cookie with bounded attempts",async()=>{
  let attempts=0;
  const h=harness(async()=>++attempts===1?json({detail:"refresh_already_rotated"},409):json({access_token:"winner"}));
  assert.equal(await h.client.refreshAccessToken(),true); assert.equal(attempts,2);
  assert.ok(h.calls.every(c=>c.options.credentials==="include"));
  const failure=harness(async()=>json({detail:"refresh_already_rotated"},409));
  assert.equal(await failure.client.refreshAccessToken(),false); assert.equal(failure.calls.length,4);
});

test("in-flight refresh cannot resurrect cleared or replaced auth",async()=>{
  for(const replace of [false,true]) {
    const gate=deferred(); const h=harness(async()=>{await gate.promise;return json({access_token:"stale"});});
    h.auth.setAuthToken("old"); const task=h.client.refreshAccessToken();
    if(replace)h.auth.setAuthToken("new-login");else h.auth.clearAuthToken();
    gate.resolve(); assert.equal(await task,false);
    assert.equal(h.auth.getAuthToken(),replace?"new-login":null);
  }
});

test("logout contacts backend then clears memory even on network failure",async()=>{
  for(const fail of [false,true]) {
    let h;
    h=harness(async()=>{assert.equal(h.auth.getAuthToken(),"old");if(fail)throw new Error("network");return json({ok:true});});
    h.auth.setAuthToken("old");
    if(fail) await assert.rejects(h.api.logoutUser()); else await h.api.logoutUser();
    assert.ok(h.calls[0].url.endsWith("/auth/logout"));
    assert.equal(h.calls[0].options.credentials,"include"); assert.equal(h.auth.getAuthToken(),null);
  }
});

test("logout waits for pending rotation before clearing its cookie",async()=>{
  const gate=deferred(); const h=harness(async url=>{if(url.endsWith("/refresh")){await gate.promise;return json({access_token:"fresh"});}return json({ok:true});});
  h.auth.setAuthToken("old"); const refresh=h.client.refreshAccessToken(), logout=h.api.logoutUser();
  assert.equal(h.calls.length,1); gate.resolve(); await Promise.all([refresh,logout]);
  assert.equal(h.calls.length,2); assert.ok(h.calls[1].url.endsWith("/logout")); assert.equal(h.auth.getAuthToken(),null);
});

test("successful reset and delete clear memory; rejected delete preserves auth",async()=>{
  const h=harness(); h.auth.setAuthToken("old");
  await h.api.confirmPasswordReset({token:"synthetic-reset",new_password:"synthetic"}); assert.equal(h.auth.getAuthToken(),null);
  h.auth.setAuthToken("old"); await h.api.deleteCurrentUser({confirm_email:"a@example.com",password:"synthetic"}); assert.equal(h.auth.getAuthToken(),null);
  const rejected=harness(async()=>json({detail:"Invalid password"},401)); rejected.auth.setAuthToken("old");
  await assert.rejects(rejected.api.deleteCurrentUser({confirm_email:"a@example.com",password:"wrong"}));
  assert.equal(rejected.auth.getAuthToken(),"old"); assert.equal(rejected.calls.length,1);
});

for(const [module,fn,arg] of [["history","downloadQuoteFile",7],["chat","downloadChatAttachment",8]]) {
  test(`${module} download uses shared refresh transport and preserves file headers`,async()=>{
    const h=harness(async(url,options)=>url.endsWith("/refresh")?json({access_token:"fresh"}):
      options.headers.get("Authorization")==="Bearer old"?denied():
      new Response("synthetic-file",{headers:{"Content-Disposition":"attachment; filename*=UTF-8''offer.pdf","Content-Type":"application/pdf"}}));
    h.auth.setAuthToken("old"); const file=await h.load(`src/api/${module}.ts`)[fn](arg);
    assert.equal(file.filename,"offer.pdf");assert.equal(file.contentType,"application/pdf");assert.equal(await file.blob.text(),"synthetic-file");
    assert.equal(h.calls.length,3);
  });
}

test("FormData is replayed without overriding multipart Content-Type",async()=>{
  const h=harness(async(url,options)=>url.endsWith("/refresh")?json({access_token:"fresh"}):
    options.headers.get("Authorization")==="Bearer old"?denied():json({ok:true}));
  h.auth.setAuthToken("old"); const form=new FormData();form.append("file",new Blob(["synthetic"]),"test.txt");
  await h.client.apiFetch("/upload",{method:"POST",body:form});
  for(const index of [0,2]) {assert.equal(h.calls[index].options.body,form); assert.equal(h.calls[index].options.headers.get("Content-Type"),null);}
});

test("tracking attaches memory Bearer without refresh on failure",async()=>{
  const h=harness(async()=>denied());h.auth.setAuthToken("old");
  h.load("src/api/tracking.ts").trackPageView({page_path:"/"});await tick();
  assert.equal(h.calls.length,1); assert.equal(h.calls[0].options.headers.Authorization,"Bearer old");
  assert.equal(h.auth.getAuthToken(),"old");
});

for(const [module,fn,api,get,post] of [
  ["quoteAnalysisFlow","analyzeResultQuote","quoteAnalysis","getResultQuoteAnalysis","createResultQuoteAnalysis"],
  ["quoteComparisonFlow","analyzeQuoteComparison","quoteComparison","getQuoteComparison","createQuoteComparison"],
]) {
  test(`${module} uses non-secret generation keys, stable across refresh and distinct after login`,async()=>{
    const gate=deferred(); const h=harness(undefined,{["@/api/"+api]:{[get]:async()=>{await gate.promise;return {ok:true};},[post]:async()=>({ok:true})}});
    h.auth.setAuthToken("secret-jwt-A");const flow=h.load(`src/features/search/${module}.ts`);
    const a=flow[fn](7);h.auth.setAuthToken("secret-refreshed-A",false);assert.equal(flow[fn](7),a);
    h.auth.clearAuthToken();h.auth.setAuthToken("secret-jwt-B");const b=flow[fn](7);assert.notEqual(a,b);
    assert.ok(h.keys.every(k=>!String(k).includes("secret")));
    gate.resolve();await Promise.all([a,b]);
  });
}

test("source has exactly one legacy key removal and no persisted access tokens",()=>{
  const all=[];
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.tsx?$/.test(file))all.push(file);}}
  walk(path.join(__dirname,"../src"));
  const matches=all.filter(f=>fs.readFileSync(f,"utf8").includes("SMARTOFFER_AUTH_TOKEN"));
  assert.deepEqual(matches,[path.join(__dirname,"../src/shared/utils/auth.ts")]);
  const source=read("src/shared/utils/auth.ts");
  assert.match(source,/localStorage\.removeItem\("SMARTOFFER_AUTH_TOKEN"\)/);
  assert.doesNotMatch(source,/getItem|setItem|sessionStorage|indexedDB|document\.cookie/);
});

test("refresh from another tab's replacement cookie changes non-secret generation",()=>{
  const h=harness();
  const token=sid=>"eyJ0eXAiOiJKV1QifQ."+Buffer.from(JSON.stringify({sid})).toString("base64url")+".signature";
  h.auth.setAuthToken(token("session-a")); const a=h.auth.getAuthContextKey();
  h.auth.setAuthToken(token("session-a"),false); assert.equal(h.auth.getAuthContextKey(),a);
  h.auth.setAuthToken(token("session-b"),false); assert.equal(h.auth.getAuthContextKey(),a+1);
});
