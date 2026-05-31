import { apiFetch } from "./client";

export type EmailProviderPreset = {
  id: string;
  title: string;
  smtp_host: string;
  smtp_port: number;
  smtp_security: "ssl" | "starttls";
  app_password_url?: string | null;
  name?: string;
};

export async function listEmailProviders(): Promise<EmailProviderPreset[]> {
  const r = await apiFetch<{ providers: any[] }>("/email/providers", {
    method: "GET",
  });

  const raw = Array.isArray(r?.providers) ? r.providers : [];

  return raw
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

  personal_data_consent_accepted: boolean;
  offer_accepted: boolean;
};

export type EmailSettingsOut = {
  provider_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_security: "ssl" | "starttls";
  smtp_username: string;
  from_email: string;

  is_verified: boolean;
  verified_at?: string | null;
  last_verified_error?: string | null;

  personal_data_consent_accepted: boolean;
  personal_data_consent_accepted_at?: string | null;

  offer_accepted: boolean;
  offer_accepted_at?: string | null;
};

export async function saveEmailSettings(
  payload: EmailSettingsIn
): Promise<EmailSettingsOut> {
  return apiFetch<EmailSettingsOut>("/email/settings", {
    method: "POST",
    json: payload,
  });
}

export async function getEmailSettings(): Promise<EmailSettingsOut> {
  return apiFetch<EmailSettingsOut>("/email/settings", {
    method: "GET",
  });
}

export type ImapSettingsOut = {
  is_enabled: boolean;
  is_verified: boolean;

  provider_id?: string | null;
  from_email?: string | null;

  imap_host?: string | null;
  imap_port?: number | null;
  imap_security?: string | null;

  inbox_folder?: string | null;
  sent_folder?: string | null;

  sync_inbox_enabled: boolean;
  sync_sent_enabled: boolean;

  verified_at?: string | null;
  last_verified_error?: string | null;
  consent_accepted_at?: string | null;
};

export type ImapSettingsIn = {
  enabled: boolean;
  consent_accepted: boolean;
};

export async function saveImapSettings(
  payload: ImapSettingsIn
): Promise<ImapSettingsOut> {
  return apiFetch<ImapSettingsOut>("/email/imap/settings", {
    method: "POST",
    json: payload,
  });
}

export type EmailAccessStatus = {
  ready: boolean;
  blocking_reason: string | null;
  message: string | null;

  smtp_configured: boolean;
  smtp_verified: boolean;
  smtp_consent_accepted: boolean;
  offer_accepted: boolean;

  imap_configured: boolean;
  imap_enabled: boolean;
  imap_verified: boolean;
  imap_consent_accepted: boolean;
  imap_technical_consent: boolean;

  smtp_from_email?: string | null;
  imap_from_email?: string | null;
  imap_inbox_folder?: string | null;
  imap_sent_folder?: string | null;
};

export async function getEmailAccessStatus(): Promise<EmailAccessStatus> {
  return apiFetch<EmailAccessStatus>("/email/access", {
    method: "GET",
  });
}