// Deterministic effect harness: exercise actual panel callbacks and state through
// rerenders/cleanup without DOM or network. Flow and browser checks are separate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };

function harness(filename, stubs) {
  let cursor=0, effects=[];
  const slots=[];
  const hooks={...React,
    useState(initial) { const i=cursor++; slots[i] ||= {value:initial}; return [slots[i].value, value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}]; },
    useRef(initial) { const i=cursor++; slots[i] ||= {current:initial}; return slots[i]; },
    useEffect(fn,deps) { const i=cursor++, old=slots[i];
      if (!old || deps.some((v,n)=>!Object.is(v,old.deps[n]))) effects.push(()=>{old?.cleanup?.(); slots[i]={deps,fn,cleanup:fn()};}); },
  };
  const ui=()=>null;
  const module={exports:{}};
  const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/features/search/components',filename),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(compiled,{module,exports:module.exports,require(name){
    if(name==='react')return hooks;
    if(name in stubs)return stubs[name];
    if(name==='@/api/client')return {ApiError:class extends Error{}};
    if(name==='../quoteFormat')return {};
    if(name.startsWith('@/shared/ui/'))return new Proxy({},{get:()=>ui});
    if(name==='./QuoteBenefitIndexMatrix')return {QuoteBenefitIndexMatrix:ui};
    if(name==='@/api/quoteAnalysis')return {};
    return require(name);
  }});
  return {
    render(props) { cursor=0;effects=[];const tree=module.exports[filename.replace('.tsx','')](props);for(const effect of effects)effect();return tree; },
    replayEffects() { for(const slot of slots)if(slot?.fn){slot.cleanup?.();slot.cleanup=slot.fn();} },
    entries:()=>slots[0].value,
  };
}
function find(tree,predicate) {
  if(!tree||typeof tree!=='object')return null;
  if(Array.isArray(tree)){for(const child of tree){const found=find(child,predicate);if(found)return found;}return null;}
  return predicate(tree)?tree:find(tree.props?.children,predicate);
}
const ready=id=>({ok:true,result_id:id,analysis:{status:'analyzed'},supplier_inn_update:{status:'unchanged',current_inn:null}});
const supplier=(id,revision=1)=>({backend_result_id:id,last_reply_at:String(revision),quote_file_count:1,latest_reply:{id:revision}});

test('failed supplier survives rerender; manual retry updates only its entry',async()=>{
  const calls=[];
  const Comparison=()=>null;
  const h=harness('QuoteAnalysisPanel.tsx',{'./QuoteComparisonPanel':{QuoteComparisonPanel:Comparison},
    '../quoteAnalysisFlow':{analyzeResultQuote(id,retry){calls.push([id,retry]);return Promise.resolve(id===2&&!retry?{ok:false,error_code:'quote_ai_invalid_schema'}:ready(id));}}});
  let props={suppliers:[supplier(1),supplier(2)],jobId:1,onInnSync:()=>{}};
  h.render(props);await tick();
  assert.equal(h.entries()[1].status,'ready');assert.equal(h.entries()[2].status,'error');
  props={...props,onInnSync:()=>{}};
  h.render(props);await tick();
  assert.equal(calls.length,2);assert.equal(h.entries()[2].status,'error');
  const tree=h.render(props);
  const comparison=find(tree,n=>n.type===Comparison);
  assert.equal(comparison.props.settled,true);assert.deepEqual(Array.from(comparison.props.readyIds),[1]);
  const retry=find(tree,n=>n.props?.children==='Повторить');
  retry.props.onClick();await tick();
  assert.equal(h.entries()[1].status,'ready');assert.equal(h.entries()[2].status,'ready');
  assert.deepEqual(calls,[[1,false],[2,false],[2,true]]);
});

test('revision during manual retry ignores stale completion and waits before comparison',async()=>{
  const oldRetry=deferred(),newRevision=deferred(),calls=[];
  const Comparison=()=>null;
  const h=harness('QuoteAnalysisPanel.tsx',{'./QuoteComparisonPanel':{QuoteComparisonPanel:Comparison},
    '../quoteAnalysisFlow':{analyzeResultQuote(id,retry,callback,revision){calls.push([retry,revision]);
      if(retry)return oldRetry.promise;if(revision.startsWith('2:'))return newRevision.promise;
      return Promise.resolve({ok:false,error_code:'quote_ai_source_unavailable'});}}});
  const props={suppliers:[supplier(1)],jobId:1,onInnSync:()=>{}};
  h.render(props);await tick();
  find(h.render(props),n=>n.props?.children==='Повторить').props.onClick();
  const next={...props,suppliers:[supplier(1,2)]};h.render(next);
  oldRetry.resolve(ready(1));await tick();
  assert.equal(h.entries()[1].status,'checking_cache');
  assert.equal(find(h.render(next),n=>n.type===Comparison).props.settled,false);
  newRevision.resolve(ready(1));await tick();
  assert.equal(h.entries()[1].status,'ready');
  assert.equal(find(h.render(next),n=>n.type===Comparison).props.settled,true);
  assert.equal(calls.length,3);
});

test('StrictMode effect cleanup/replay retains completion without duplicate panel request',async()=>{
  const task=deferred();let calls=0;
  const h=harness('QuoteAnalysisPanel.tsx',{'./QuoteComparisonPanel':{QuoteComparisonPanel:()=>null},
    '../quoteAnalysisFlow':{analyzeResultQuote(){calls++;return task.promise;}}});
  const props={suppliers:[supplier(1)],jobId:1,onInnSync:()=>{}};
  h.render(props);h.replayEffects();task.resolve(ready(1));await tick();
  assert.equal(calls,1);assert.equal(h.entries()[1].status,'ready');
});

test('comparison waits until settled; full and partial ready sets get their own revisions',async()=>{
  const calls=[];
  const h=harness('QuoteComparisonPanel.tsx',{'../quoteComparisonFlow':{analyzeQuoteComparison(job,retry,revision){calls.push(revision);return Promise.resolve({ok:false});}}});
  const props={jobId:1,suppliers:[],receivedCount:2,analyzedCount:1,readyIds:[1],settled:false};
  h.render(props);await tick();assert.equal(calls.length,0);
  h.render({...props,settled:true});await tick();assert.deepEqual(calls,['1']);
  h.render({...props,settled:true,readyIds:[1,2],analyzedCount:2});await tick();assert.deepEqual(calls,['1','1,2']);
});
