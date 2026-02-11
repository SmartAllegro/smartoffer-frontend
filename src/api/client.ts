// src/api/client.ts

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: any } = {}
): Promise<T> {
  // === 1. Проверка базового URL ===
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Create .env.local with VITE_API_BASE_URL=http://127.0.0.1:10000"
    );
  }

  // === 2. API Key (если используется) ===
  const apiKey = localStorage.getItem("SMARTOFFER_API_KEY");

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  let body = options.body;

  // === 3. Поддержка options.json ===
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers["Content-Type"] = "application/json";
  }

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  // === 4. Выполнение запроса ===
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body,
  });

  // === 5. Обработка ошибок ===
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  // === 6. Возврат JSON ===
  return response.json();
}
