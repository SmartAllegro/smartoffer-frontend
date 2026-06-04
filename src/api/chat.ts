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