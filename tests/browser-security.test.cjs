const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
function load(name, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(read(name), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, URL, encodeURIComponent,
    require(name) {
      assert.equal(name, "../src/config/apiOrigin");
      return load("src/config/apiOrigin.ts");
    }, ...globals });
  return exports;
}
const { safeWebsiteUrl, qrImageSrc } = load("src/shared/utils/browserSecurity.ts");
const { FRONTEND_CSP, browserSecurityPolicy } = load("build/security-policy.ts");

for (const value of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\nscript:alert(1)", "data:text/html,x", "vbscript:x", "file:///x", "blob:https://supplier.test/x", "https://user:pass@supplier.test", "https://", "https://supplier.test/\u0000", "https:\\supplier.test", "//evil.test", "", null]) {
  test(`unsafe website rejected: ${JSON.stringify(value)}`, () => assert.equal(safeWebsiteUrl(value), undefined));
}
for (const [value, expected] of [["supplier.test/path", "https://supplier.test/path"], ["https://supplier.test/path", "https://supplier.test/path"], ["http://supplier.test", "http://supplier.test/"], ["https://t.me/smartoffer_support?text=Hi", "https://t.me/smartoffer_support?text=Hi"]]) {
  test(`safe navigation: ${value}`, () => assert.equal(safeWebsiteUrl(value), expected));
}

test("preopen clears opener synchronously and retains reference through async download", async () => {
  const tab = { opener: { secret: "synthetic" }, location: { href: "about:blank" } };
  const events = [];
  const { preopenDownloadTab } = load("src/shared/utils/browserSecurity.ts", { window: { open(...args) { events.push(args); return tab; } } });
  const opened = preopenDownloadTab();
  assert.equal(opened, tab);
  assert.equal(opened.opener, null);
  await Promise.resolve();
  opened.location.href = "blob:https://smartoffer.pro/local-generated";
  assert.equal(opened.opener, null);
  assert.deepEqual(events, [["about:blank", "_blank"]]);
});
test("blocked popup preserves fallback", () => {
  const { preopenDownloadTab } = load("src/shared/utils/browserSecurity.ts", { window: { open: () => null } });
  assert.equal(preopenDownloadTab(), null);
});

for (const name of ["src/pages/About.tsx", "src/features/search/components/Footer.tsx"]) {
  test(`${name}: actual QR render is passive and keeps payment flow`, () => {
    const source = read(name);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|<iframe|<object|<embed/);
    const start = source.indexOf("function SbpQrDialog(");
    const end = source.indexOf("function SbpBanksDialog(", start);
    const js = ts.transpileModule(source.slice(start, end) + "\nexports.Dialog = SbpQrDialog;", { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    const shell = ({children}) => React.createElement("div", null, children);
    vm.runInNewContext(js, { exports, React, qrImageSrc, Dialog: shell, DialogContent: shell, DialogHeader: shell, DialogTitle: shell, Button: shell });
    const unsafe = '<svg onload="alert(1)"><script>evil()</script></svg>';
    const html = renderToStaticMarkup(React.createElement(exports.Dialog, { open: true, onOpenChange() {}, qrSvg: unsafe, statusText: "waiting" }));
    assert.match(html, /<img[^>]*width="260"[^>]*height="260"[^>]*alt="[^"]+"[^>]*src="data:image\/svg\+xml;charset=utf-8,%3Csvg/);
    assert.doesNotMatch(html, /<svg|<script|onload=/);
    assert.equal(decodeURIComponent(qrImageSrc(unsafe).split(",")[1]), unsafe);
    for (const token of ["fetchMyPayment", "fetchSbpBanks", "fetchSbpDeeplink", "window.location.href = res.deeplink", "setSbpOrderId(result.order_id)"]) assert.ok(source.includes(token), token);
  });
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
test("complete active markup/navigation inventory", () => {
  const dangerous = [];
  for (const file of sourceFiles(path.join(root, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    if (source.includes("dangerouslySetInnerHTML")) dangerous.push(path.relative(root, file).replaceAll("\\", "/"));
    assert.doesNotMatch(source, /\.innerHTML\s*=|\beval\s*\(|new Function\s*\(|<(?:iframe|object|embed)\b/i, file);
    for (const tag of source.matchAll(/<(?:a|Link)\b[^>]*\btarget="_blank"[^>]*>/g)) assert.match(tag[0], /rel="noopener noreferrer"/, file);
    for (const match of source.matchAll(/window\.open\([^;]+/g)) assert.ok(match[0].includes('"noopener,noreferrer"') || file.endsWith("browserSecurity.ts"), file);
  }
  assert.deepEqual(dangerous, ["src/shared/ui/chart.tsx"]);
  // Only chart caller supplies an empty compile-time config, never API strings.
  assert.match(read("src/pages/RequestDetailPage.tsx"), /<ChartContainer\s+config=\{\{\}\}/);
  for (const file of ["src/pages/HistoryPage.tsx", "src/pages/RequestDetailPage.tsx"]) {
    assert.match(read(file), /const tab = preopenDownloadTab\(\);\s+try\s*\{\s+const replies = await/);
    assert.match(read(file), /link\.rel = "noopener noreferrer"/);
  }
  for (const file of ["src/pages/RequestDetailPage.tsx", "src/features/search/components/SupplierTable.tsx", "src/features/address-book/components/AddressBookModal.tsx"]) assert.match(read(file), /safeWebsiteUrl\(/);
});

test("enforced CSP is emitted only by build plugin", () => {
  assert.equal(browserSecurityPolicy().apply, "build");
  assert.doesNotMatch(read("index.html"), /Content-Security-Policy/);
  assert.equal(browserSecurityPolicy().transformIndexHtml()[0].attrs.content, FRONTEND_CSP);
});

test("actual production dist has exact CSP before every executable/resource tag", () => {
  const html = read("dist/index.html");
  const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/g)];
  assert.equal(metas.length, 1);
  const csp = metas[0][1];
  assert.equal(csp, FRONTEND_CSP);
  assert.ok(metas[0].index < html.indexOf("<script"));
  assert.ok(metas[0].index < html.indexOf("<link"));
  const directives = Object.fromEntries(csp.split("; ").map(part => { const [name, ...values] = part.split(" "); return [name, values.join(" ")]; }));
  assert.equal(directives["script-src"], "'self'");
  assert.equal(directives["style-src"], "'self' 'unsafe-inline'");
  assert.equal(directives["connect-src"], "'self' https://api.smartoffer.pro");
  assert.equal(directives["img-src"], "'self' data: blob:");
  for (const key of ["object-src", "frame-src", "media-src", "worker-src"]) assert.equal(directives[key], "'none'");
  for (const key of ["base-uri", "form-action", "manifest-src", "font-src"]) assert.equal(directives[key], "'self'");
  assert.ok("upgrade-insecure-requests" in directives);
  assert.doesNotMatch(csp, /unsafe-eval|\*|localhost|127\.0\.0\.1|(?:^|\s)https?:[;\s]|tbank/i);
  assert.match(html, /<meta name="referrer" content="no-referrer"/);
  for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.match(script[1], /type="module"/);
    assert.match(script[1], /src="\/(?:[^"/]+\/)*assets\/[^"/]+\.js"/);
    assert.equal(script[2].trim(), "");
  }
  assert.doesNotMatch(html, /\bon(?:click|load|error)=|javascript:/i);
});
