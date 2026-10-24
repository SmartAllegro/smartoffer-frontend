const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function load(name, env={}) {
  let source = fs.readFileSync(path.join(root,name),'utf8');
  if(name === 'src/config/env.ts') source = source.replaceAll('import.meta','testMeta');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports = {};
  vm.runInNewContext(code,{exports,testMeta:{env},require(name){
    assert.ok(['./apiOrigin','../src/config/apiOrigin'].includes(name));
    return load('src/config/apiOrigin.ts');
  }});
  return exports;
}
const invalid = [undefined,'','null','*','http://api.smartoffer.pro','https://api.smartoffer.pro.evil.test',
  'https://api.smartoffer.pro@evil.test','https://user@api.smartoffer.pro','https://api.smartoffer.pro/',
  'https://api.smartoffer.pro/path','https://api.smartoffer.pro?x=1','https://127.0.0.1:10001',
  'http://127.0.0.1:10001','http://localhost:10000'];
for(const value of invalid) test(`production origin rejects ${String(value)}`,()=>{
  assert.throws(()=>load('src/config/env.ts',{PROD:true,DEV:false,VITE_API_BASE_URL:value}),/allowed HTTPS/);
  const plugin=load('build/security-policy.ts').browserSecurityPolicy();
  assert.throws(()=>plugin.configResolved({mode:'production',isProduction:true,env:{VITE_API_BASE_URL:value}}),/allowed HTTPS/);
});
test('explicit allowed public origin works in runtime and envFile:false build',()=>{
  const value='https://api.smartoffer.pro';
  assert.equal(load('src/config/env.ts',{PROD:true,DEV:false,VITE_API_BASE_URL:value}).env.apiBaseUrl,value);
  const plugin=load('build/security-policy.ts').browserSecurityPolicy();
  plugin.configResolved({mode:'production',isProduction:true,env:{},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify(value)}});
  assert.throws(()=>plugin.configResolved({mode:'production',isProduction:true,env:{VITE_API_BASE_URL:value},define:{'import.meta.env.VITE_API_BASE_URL':'undefined'}}),/allowed HTTPS/);
});
test('explicit local development preserves both local endpoints',()=>{
  for(const value of ['http://127.0.0.1:10000','http://127.0.0.1:10001'])
    assert.equal(load('src/config/env.ts',{DEV:true,VITE_API_BASE_URL:value}).env.apiBaseUrl,value);
  assert.equal(load('src/config/env.ts',{DEV:true}).env.apiBaseUrl,'http://127.0.0.1:10000');
});
