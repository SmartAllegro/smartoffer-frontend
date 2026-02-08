// src/config/env.ts
function getEnv(name: string, fallback?: string) {
  const v = (import.meta as any).env?.[name] as string | undefined;
  if (v === undefined || v === "") return fallback ?? "";
  return v;
}

export const env = {
  apiBaseUrl: getEnv("VITE_API_BASE_URL", "http://127.0.0.1:10000"),
  tenant: getEnv("VITE_TENANT", "default"),
};
