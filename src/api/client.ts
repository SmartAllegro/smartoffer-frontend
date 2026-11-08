// src/api/client.ts

import { clearAuthToken, getAuthContextKey, getAuthToken, setAuthToken } from "@/shared/utils/auth";

let refreshPromise: Promise<boolean> | null = null;
let sessionMutation = false;

export class AuthRefreshUnavailableError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthRefreshUnavailableError";
    this.status = status;
  }
}

function apiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) throw new Error("VITE_API_BASE_URL is not set");
  return `${baseUrl}${path}`;
}

export function refreshAccessToken(): Promise<boolean> {
  if (sessionMutation) {
    return Promise.reject(new AuthRefreshUnavailableError("Auth session mutation is in progress"));
  }
  if (refreshPromise) return refreshPromise;
  const generation = getAuthContextKey();
  const task = (async () => {
    // A second tab may be waiting for the winning Set-Cookie response.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (generation !== getAuthContextKey()) return false;
      let response: Response;
      try {
        response = await fetch(apiUrl("/auth/refresh"), {
          method: "POST", credentials: "include",
        });
      } catch {
        throw new AuthRefreshUnavailableError("Auth refresh request failed");
      }
      const data = await response.json().catch(() => null);
      if (response.status === 409 && data?.detail === "refresh_already_rotated" && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
        continue;
      }
      if (response.status === 401) {
        if (generation === getAuthContextKey()) clearAuthToken();
        return false;
      }
      if (!response.ok) {
        throw new AuthRefreshUnavailableError("Auth refresh is temporarily unavailable", response.status);
      }
      if (typeof data?.access_token !== "string" || !data.access_token) {
        throw new AuthRefreshUnavailableError("Auth refresh returned an invalid response", response.status);
      }
      if (generation !== getAuthContextKey()) return false;
      setAuthToken(data.access_token, false);
      return true;
    }
    throw new AuthRefreshUnavailableError("Auth refresh conflict did not resolve", 409);
  })();
  refreshPromise = task;
  const release = () => { if (refreshPromise === task) refreshPromise = null; };
  void task.then(release, release);
  return task;
}

// Serialize cookie mutations with a rotation that is already in flight.
export async function mutateSession<T>(action: () => Promise<T>): Promise<T> {
  if (sessionMutation) throw new Error("Session operation already in progress");
  sessionMutation = true;
  try {
    if (refreshPromise) {
      try { await refreshPromise; }
      catch { /* A deliberate login/logout still owns the next cookie mutation. */ }
    }
    return await action();
  } finally { sessionMutation = false; }
}

export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const originalToken = getAuthToken();
  const generation = getAuthContextKey();
  const send = (token: string | null) => {
    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else headers.delete("Authorization");
    return fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  };
  const response = await send(originalToken);
  if (!originalToken || response.status !== 401 ||
      !/^Bearer(?:\s|$)/i.test(response.headers.get("WWW-Authenticate") || "") ||
      sessionMutation || generation !== getAuthContextKey() || options.signal?.aborted) return response;
  // Late 401s reuse an already-completed refresh.
  let refreshed = getAuthToken() !== originalToken ? !!getAuthToken() : false;
  if (!refreshed) {
    try { refreshed = await refreshAccessToken(); }
    catch { return response; }
  }
  if (!refreshed || generation !== getAuthContextKey() || options.signal?.aborted) return response;
  return send(getAuthToken()); // Exactly one replay, without recursion.
}

export class ApiError extends Error {
  status: number;
  responseText: string;
  body: unknown;

  constructor(status: number, responseText: string, body?: unknown) {
    super(`API error ${status}: ${responseText}`);
    this.name = "ApiError";
    this.status = status;
    this.responseText = responseText;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: any } = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  // JSON helper
  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers.set("Content-Type", "application/json");
  }

  const response = await authenticatedFetch(path, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    let body: unknown = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    throw new ApiError(response.status, text, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
