// Keep this exact public allowlist aligned with the browser CSP.
export function productionApiOrigin(value: unknown): string {
  if (value !== "https://api.smartoffer.pro") {
    throw new Error("VITE_API_BASE_URL must be the allowed HTTPS production API origin");
  }
  return value;
}
