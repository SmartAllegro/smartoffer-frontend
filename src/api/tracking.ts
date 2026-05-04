import { env } from "@/config/env";

const VISITOR_ID_KEY = "SMARTOFFER_VISITOR_ID_V1";

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && existing.trim()) return existing;

    const created = createVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  } catch {
    return createVisitorId();
  }
}

export function trackPageView(payload: {
  page_path: string;
  page_title?: string | null;
  source?: string;
}) {
  const baseUrl = env.apiBaseUrl;
  if (!baseUrl) return;

  const body = JSON.stringify({
    visitor_id: getVisitorId(),
    source: payload.source || "site",
    page_path: payload.page_path || "/",
    page_title: payload.page_title || document.title || null,
  });

  const url = `${baseUrl}/track/page-view`;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Аналитика не должна ломать интерфейс.
  }
}