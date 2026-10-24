import type { Plugin } from "vite";
import { productionApiOrigin } from "../src/config/apiOrigin";

// Public origins only. Never widen this policy using environment/request input.
export const FRONTEND_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.smartoffer.pro",
  "media-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function browserSecurityPolicy(): Plugin {
  return {
    name: "smartoffer-browser-security",
    apply: "build",
    configResolved(config) {
      if (config.mode === "development" && !config.isProduction) return;
      // envFile:false builds can supply the public value with an inline define.
      const defined = config.define?.["import.meta.env.VITE_API_BASE_URL"];
      let value: unknown = config.env.VITE_API_BASE_URL;
      if (defined !== undefined) {
        try { value = JSON.parse(String(defined)); }
        catch { value = undefined; }
      }
      productionApiOrigin(value);
    },
    // Vite's default HTML hook runs after asset generation; head-prepend puts
    // enforcement before scripts, stylesheet links and modulepreloads.
    transformIndexHtml() {
      return [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: FRONTEND_CSP }, injectTo: "head-prepend" },
        { tag: "meta", attrs: { name: "referrer", content: "no-referrer" }, injectTo: "head-prepend" },
      ];
    },
  };
}
