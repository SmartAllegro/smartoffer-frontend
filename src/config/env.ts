import { productionApiOrigin } from "./apiOrigin";
function getEnv(name: string, fallback?: string) {
  const v = (import.meta as any).env?.[name] as string | undefined;
  if (v === undefined || v === "") return fallback ?? "";
  return v;
}

export const env = {
  apiBaseUrl: import.meta.env.DEV
    ? getEnv("VITE_API_BASE_URL", "http://127.0.0.1:10000")
    : productionApiOrigin(import.meta.env.VITE_API_BASE_URL),
  tenant: getEnv("VITE_TENANT", "default"),
};
