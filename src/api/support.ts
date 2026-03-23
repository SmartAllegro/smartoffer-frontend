import { apiFetch } from "./client";

export type SupportRequest = {
  contact_email: string;
  subject: string;
  message: string;
  source?: string;
  page_url?: string;
};

export type SupportResponse = {
  ok: boolean;
  message: string;
};

export async function sendSupportRequest(
  payload: SupportRequest
): Promise<SupportResponse> {
  return apiFetch<SupportResponse>("/support", {
    method: "POST",
    json: payload,
  });
}