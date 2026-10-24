import { apiFetch } from "./client";

export type EmailSignature = {
  id: number;
  name: string;
  body_text: string;
  language_code?: string | null;
  is_default_cis: boolean;
  is_default_international: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailSignaturePayload = {
  name: string;
  body_text: string;
  language_code?: string | null;
  is_default_cis: boolean;
  is_default_international: boolean;
};

export const listEmailSignatures = () =>
  apiFetch<EmailSignature[]>("/email/signatures", { method: "GET" });

export const createEmailSignature = (payload: EmailSignaturePayload) =>
  apiFetch<EmailSignature>("/email/signatures", { method: "POST", json: payload });

export const updateEmailSignature = (id: number, payload: EmailSignaturePayload) =>
  apiFetch<EmailSignature>(`/email/signatures/${id}`, { method: "PATCH", json: payload });

export const deleteEmailSignature = (id: number) =>
  apiFetch<void>(`/email/signatures/${id}`, { method: "DELETE" });
