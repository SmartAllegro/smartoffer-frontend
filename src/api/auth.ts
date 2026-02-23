import { apiFetch } from "./client";

export type UserMe = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

export async function registerUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
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

export async function fetchMe(): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/me", { method: "GET" });
}