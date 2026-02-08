import { env } from "@/config/env";

export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const err: ApiError = {
      message: (data as any)?.message || `API error: ${res.status}`,
      status: res.status,
      details: data,
    };
    throw err;
  }

  return data as T;
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}
