import { env } from "@/config/env";

const VISITOR_ID_KEY = "SMARTOFFER_VISITOR_ID_V1";
const AUTH_TOKEN_KEY = "SMARTOFFER_AUTH_TOKEN";

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

function getAuthToken(): string | null {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

function getTrackingSource(defaultSource: string): string {
  try {
    const url = new URL(window.location.href);

    const fromSearch =
      url.searchParams.get("utm_source") ||
      url.searchParams.get("source");

    if (fromSearch && fromSearch.trim()) {
      return fromSearch.trim().slice(0, 50);
    }

    const hash = url.hash || "";
    const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
    const hashParams = new URLSearchParams(hashQuery);

    const fromHash =
      hashParams.get("utm_source") ||
      hashParams.get("source");

    if (fromHash && fromHash.trim()) {
      return fromHash.trim().slice(0, 50);
    }
  } catch {
    // ignore
  }

  return defaultSource;
}

export function trackPageView(payload: {
  page_path: string;
  page_title?: string | null;
  source?: string;
}) {
  const baseUrl = env.apiBaseUrl;
  if (!baseUrl) return;

  const token = getAuthToken();

  const body = JSON.stringify({
    visitor_id: getVisitorId(),
    source: getTrackingSource(payload.source || "site"),
    page_path: payload.page_path || "/",
    page_title: payload.page_title || document.title || null,
  });

  const url = `${baseUrl}/track/page-view`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(url, {
      method: "POST",
      headers,
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Аналитика не должна ломать интерфейс.
  }
}