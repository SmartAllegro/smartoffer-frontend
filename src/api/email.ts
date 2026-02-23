// src/api/email.ts
import { apiFetch } from "./client";

export type EmailProviderPreset = {
  id: string;
  title: string;
  smtp_host: string;
  smtp_port: number;
  smtp_security: "ssl" | "starttls";
  app_password_url?: string | null;

  // back-compat: бэк мог присылать name вместо title
  name?: string;
};

export async function listEmailProviders(): Promise<EmailProviderPreset[]> {
  const r = await apiFetch<{ providers: any[] }>("/email/providers", {
    method: "GET",
  });

  const raw = Array.isArray(r?.providers) ? r.providers : [];

  // Нормализуем контракт: title <- title || name
  const normalized: EmailProviderPreset[] = raw
    .map((p: any) => {
      const id = typeof p?.id === "string" ? p.id : "";
      if (!id) return null;

      const title =
        (typeof p?.title === "string" && p.title.trim()) ||
        (typeof p?.name === "string" && p.name.trim()) ||
        "";

      return {
        id,
        title,
        smtp_host: typeof p?.smtp_host === "string" ? p.smtp_host : "",
        smtp_port: typeof p?.smtp_port === "number" ? p.smtp_port : Number(p?.smtp_port ?? 0),
        smtp_security: p?.smtp_security === "starttls" ? "starttls" : "ssl",
        app_password_url:
          typeof p?.app_password_url === "string" ? p.app_password_url : null,
      } as EmailProviderPreset;
    })
    .filter(Boolean) as EmailProviderPreset[];

  return normalized;
}

export type EmailVerifyIn = {
  provider_id?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_security?: "ssl" | "starttls" | null;

  smtp_username: string;
  smtp_password: string;

  from_email?: string | null;
  test_to_email?: string | null;

  subject?: string;
  body?: string;
};

export type EmailVerifyOut = {
  ok: boolean;
  error_code?: string | null;
  message?: string | null;
  hint?: string | null;
};

export async function verifyEmailSmtp(payload: EmailVerifyIn): Promise<EmailVerifyOut> {
  return apiFetch<EmailVerifyOut>("/email/verify", {
    method: "POST",
    json: payload,
  });
}

export type EmailSettingsIn = {
  provider_id?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_security?: "ssl" | "starttls" | null;

  smtp_username: string;
  smtp_password: string;
  from_email?: string | null;
};

export async function saveEmailSettings(payload: EmailSettingsIn) {
  return apiFetch("/email/settings", {
    method: "POST",
    json: payload,
  });
}

export async function getEmailSettings() {
  return apiFetch("/email/settings", {
    method: "GET",
  });
}