import { apiFetch } from "./client";

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    const str = String(value).trim();
    if (!str) continue;

    search.set(key, str);
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export type ChatMember = {
  user_id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: "owner" | "manager" | string;
  is_self: boolean;
};

export type ChatAttachment = {
  id: number;
  message_id: number;
  original_filename: string;
  content_type?: string | null;
  size_bytes: number;
  created_at: string;
};

export type ChatMembersResponse = {
  items: ChatMember[];
};

export type ChatMessage = {
  id: number;
  dialog_id: number;
  sender_user_id: number;
  sender_email?: string | null;
  sender_name?: string | null;
  body_text: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_own: boolean;
  attachments?: ChatAttachment[];
};

export type ChatDialog = {
  id: number;
  organization_id: number;

  peer_user_id: number;
  peer_email: string;
  peer_first_name?: string | null;
  peer_last_name?: string | null;
  peer_role?: string | null;

  last_message?: ChatMessage | null;
  last_message_at?: string | null;

  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type ChatDialogsResponse = {
  items: ChatDialog[];
};

export type ChatMessagesResponse = {
  items: ChatMessage[];
};

export type ChatReadResponse = {
  ok: boolean;
  dialog_id: number;
  unread_count: number;
};

export type ChatUnreadCountResponse = {
  unread_count: number;
};

export async function listChatMembers(): Promise<ChatMembersResponse> {
  return apiFetch<ChatMembersResponse>("/chat/members", {
    method: "GET",
  });
}

export async function listChatDialogs(): Promise<ChatDialogsResponse> {
  return apiFetch<ChatDialogsResponse>("/chat/dialogs", {
    method: "GET",
  });
}

export async function openDirectChatDialog(userId: number): Promise<ChatDialog> {
  return apiFetch<ChatDialog>("/chat/dialogs/direct", {
    method: "POST",
    json: {
      user_id: userId,
    },
  });
}

export async function listChatMessages(
  dialogId: number,
  params: {
    limit?: number;
    before_id?: number | null;
  } = {}
): Promise<ChatMessagesResponse> {
  const qs = buildQuery({
    limit: params.limit ?? 100,
    before_id: params.before_id,
  });

  return apiFetch<ChatMessagesResponse>(`/chat/dialogs/${dialogId}/messages${qs}`, {
    method: "GET",
  });
}

export async function sendChatMessage(
  dialogId: number,
  bodyText: string
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/chat/dialogs/${dialogId}/messages`, {
    method: "POST",
    json: {
      body_text: bodyText,
    },
  });
}

export async function markChatDialogRead(
  dialogId: number
): Promise<ChatReadResponse> {
  return apiFetch<ChatReadResponse>(`/chat/dialogs/${dialogId}/read`, {
    method: "POST",
  });
}

export async function getChatUnreadCount(): Promise<ChatUnreadCountResponse> {
  return apiFetch<ChatUnreadCountResponse>("/chat/unread-count", {
    method: "GET",
  });
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("SMARTOFFER_AUTH_TOKEN");
  } catch {
    return null;
  }
}

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
    } catch {
      return utf8Match[1].replace(/"/g, "");
    }
  }

  const regularMatch = value.match(/filename="?([^"]+)"?/i);
  if (regularMatch?.[1]) {
    return regularMatch[1].trim();
  }

  return null;
}

export async function uploadChatAttachment(
  dialogId: number,
  file: File,
  bodyText = ""
): Promise<ChatMessage> {
  const form = new FormData();
  form.append("file", file);
  form.append("body_text", bodyText);

  return apiFetch<ChatMessage>(`/chat/dialogs/${dialogId}/attachments`, {
    method: "POST",
    body: form,
  });
}

export async function downloadChatAttachment(attachmentId: number): Promise<{
  blob: Blob;
  filename: string;
  contentType: string;
}> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Create .env.local with VITE_API_BASE_URL=http://127.0.0.1:10000"
    );
  }

  const headers: HeadersInit = {};
  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/chat/attachments/${attachmentId}/download`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Не удалось скачать файл: ${response.status}${text ? ` ${text}` : ""}`
    );
  }

  const blob = await response.blob();

  return {
    blob,
    filename:
      filenameFromContentDisposition(response.headers.get("content-disposition")) ||
      `chat-file-${attachmentId}`,
    contentType:
      response.headers.get("content-type") ||
      blob.type ||
      "application/octet-stream",
  };
}

export async function updateChatMessage(
  messageId: number,
  bodyText: string
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/chat/messages/${messageId}`, {
    method: "PATCH",
    json: {
      body_text: bodyText,
    },
  });
}