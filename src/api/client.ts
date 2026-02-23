// src/api/client.ts

function getAuthToken(): string | null {
  try {
    // ключ можно адаптировать, если у тебя другое имя
    return localStorage.getItem("SMARTOFFER_AUTH_TOKEN");
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: any } = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Create .env.local with VITE_API_BASE_URL=http://127.0.0.1:10000"
    );
  }

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // JSON helper
  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers["Content-Type"] = "application/json";
  }

  // ✅ JWT auth
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}