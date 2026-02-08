import { ENV } from "@/config/env";

export const API_BASE_URL = ENV.API_BASE_URL;
export const API_KEY = ENV.API_KEY;

type ApiFetchInit = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (API_KEY && API_KEY.trim().length > 0) {
    headers.set("X-API-Key", API_KEY.trim());
  }

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}
