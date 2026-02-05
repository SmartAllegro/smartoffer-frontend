// src/api/client.ts
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const API_KEY = (import.meta as any).env?.VITE_API_KEY ?? "";

type ApiFetchInit = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  // Если ключ не задан — не отправляем заголовок вообще
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
