import { apiFetch } from "./client";

export type UserMe = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

export type ForgotPasswordResponse = {
  ok: boolean;
  message: string;
};

export type ResetPasswordResponse = {
  ok: boolean;
  message: string;
};

export type DeleteAccountResponse = {
  ok: boolean;
  message: string;
  deleted_user_id: number;
  email: string;
};

export async function registerUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  privacy_accepted: boolean;
  terms_accepted: boolean;
}): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/register", {
    method: "POST",
    json: payload,
  });
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<{ access_token: string; token_type: string }> {
  return apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    json: payload,
  });
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    json: { email },
  });
}

export async function confirmPasswordReset(payload: {
  token: string;
  new_password: string;
}): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    json: payload,
  });
}

export async function fetchMe(): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/me", { method: "GET" });
}

export async function deleteCurrentUser(payload: {
  confirm_email: string;
  password: string;
}): Promise<DeleteAccountResponse> {
  return apiFetch<DeleteAccountResponse>("/auth/delete-account", {
    method: "POST",
    json: payload,
  });
}