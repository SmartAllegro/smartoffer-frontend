import { apiFetch, mutateSession, refreshAccessToken } from "./client";
import { clearAuthToken, removeLegacyAuthToken, setAuthToken } from "@/shared/utils/auth";

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
  return mutateSession(async () => {
    const result = await apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST", json: payload,
    });
    setAuthToken(result.access_token);
    return result;
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
  return mutateSession(async () => {
    const result = await apiFetch<ResetPasswordResponse>("/auth/reset-password", {
      method: "POST", json: payload,
    });
    clearAuthToken();
    return result;
  });
}

export async function fetchMe(): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/me", { method: "GET" });
}

export async function deleteCurrentUser(payload: {
  confirm_email: string;
  password: string;
}): Promise<DeleteAccountResponse> {
  const result = await apiFetch<DeleteAccountResponse>("/auth/delete-account", {
    method: "POST", json: payload,
  });
  clearAuthToken();
  return result;
}
export async function logoutUser(): Promise<void> {
  return mutateSession(async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); }
    finally { clearAuthToken(); }
  });
}

let bootstrapPromise: Promise<UserMe | null> | null = null;
export function bootstrapAuth(): Promise<UserMe | null> {
  removeLegacyAuthToken();
  if (!bootstrapPromise) bootstrapPromise = (async () => {
    if (!await refreshAccessToken()) return null;
    try { return await fetchMe(); }
    catch { clearAuthToken(); return null; }
  })();
  return bootstrapPromise;
}
