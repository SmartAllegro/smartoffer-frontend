import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { RadarLogo } from "@/shared/ui/RadarLogo";
import { cn } from "@/shared/utils/utils";
import { useToast } from "@/shared/hooks/use-toast";
import {
  getChatUnreadCount,
  listChatDialogs,
  listChatMembers,
  listChatMessages,
  markChatDialogRead,
  openDirectChatDialog,
  sendChatMessage,
  type ChatDialog,
  type ChatMember,
  type ChatMessage,
} from "@/api/chat";

type ContactItem = {
  key: string;
  kind: "dialog" | "member";
  user_id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  dialog?: ChatDialog;
  member?: ChatMember;
};

function formatName(params: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  const first = (params.first_name || "").trim();
  const last = (params.last_name || "").trim();
  const full = `${first} ${last}`.trim();

  return full || params.email || "Сотрудник";
}

function formatRole(role?: string | null) {
  if (role === "owner") return "Руководитель";
  if (role === "manager") return "Менеджер";
  return role || "Сотрудник";
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(params: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  const first = (params.first_name || "").trim();
  const last = (params.last_name || "").trim();

  const value =
    `${first.slice(0, 1)}${last.slice(0, 1)}`.trim() ||
    (params.email || "?").slice(0, 1);

  return value.toUpperCase();
}

function shortText(value?: string | null) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Нет сообщений";
  if (text.length <= 70) return text;
  return `${text.slice(0, 70)}…`;
}

function normalizeChatAccessError(error: unknown): string {
  const businessMessage = "Для использования чата подключите тариф Бизнес.";

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!raw.trim()) {
    return businessMessage;
  }

  if (
    raw.includes("API error 403") ||
    raw.includes("Чат доступен только участникам команды") ||
    raw.includes("Чат доступен только при активном тарифе Бизнес") ||
    raw.includes("Команда неактивна")
  ) {
    return businessMessage;
  }

  const match = raw.match(/^API error\s+\d+:\s*([\s\S]+)$/);

  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      const detail = parsed?.detail;

      if (
        typeof detail === "string" &&
        (
          detail.includes("Чат доступен только участникам команды") ||
          detail.includes("Чат доступен только при активном тарифе Бизнес") ||
          detail.includes("Команда неактивна")
        )
      ) {
        return businessMessage;
      }

      if (typeof detail === "string" && detail.trim()) {
        return detail.trim();
      }
    } catch {
      // оставляем fallback ниже
    }
  }

  return raw;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [members, setMembers] = useState<ChatMember[]>([]);
  const [dialogs, setDialogs] = useState<ChatDialog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [selectedDialogId, setSelectedDialogId] = useState<number | null>(null);
  const [selectedPeerUserId, setSelectedPeerUserId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const [bootLoading, setBootLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingPeerId, setOpeningPeerId] = useState<number | null>(null);

  const [unreadTotal, setUnreadTotal] = useState(0);
  const [accessError, setAccessError] = useState<string | null>(null);

  const refreshSidebar = useCallback(async () => {
    setSidebarLoading(true);

    try {
      const [membersRes, dialogsRes, unreadRes] = await Promise.all([
        listChatMembers(),
        listChatDialogs(),
        getChatUnreadCount(),
      ]);

      const nextMembers = Array.isArray(membersRes.items) ? membersRes.items : [];
      const nextDialogs = Array.isArray(dialogsRes.items) ? dialogsRes.items : [];

      setMembers(nextMembers);
      setDialogs(nextDialogs);
      setUnreadTotal(Number(unreadRes.unread_count || 0));

      return nextDialogs;
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (dialogId: number, markRead = true) => {
      setMessagesLoading(true);

      try {
        const res = await listChatMessages(dialogId, { limit: 100 });
        setMessages(Array.isArray(res.items) ? res.items : []);

        if (markRead) {
          await markChatDialogRead(dialogId);
          const [dialogsRes, unreadRes] = await Promise.all([
            listChatDialogs(),
            getChatUnreadCount(),
          ]);

          setDialogs(Array.isArray(dialogsRes.items) ? dialogsRes.items : []);
          setUnreadTotal(Number(unreadRes.unread_count || 0));
        }
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let alive = true;

    async function init() {
      setBootLoading(true);
      setAccessError(null);

      try {
        const nextDialogs = await refreshSidebar();

        if (!alive) return;

        const firstDialog = nextDialogs[0] || null;

        if (firstDialog) {
          setSelectedDialogId(firstDialog.id);
          setSelectedPeerUserId(firstDialog.peer_user_id);
          await loadMessages(firstDialog.id, true);
        }
      } catch (e) {
        if (!alive) return;

        setAccessError(normalizeChatAccessError(e));
      } finally {
        if (alive) setBootLoading(false);
      }
    }

    init();

    return () => {
      alive = false;
    };
  }, [loadMessages, refreshSidebar]);

  useEffect(() => {
    if (!selectedDialogId) return;

    const timer = window.setInterval(() => {
      refreshSidebar().catch(() => {});
      listChatMessages(selectedDialogId, { limit: 100 })
        .then((res) => setMessages(Array.isArray(res.items) ? res.items : []))
        .catch(() => {});
    }, 10000);

    return () => window.clearInterval(timer);
  }, [refreshSidebar, selectedDialogId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, selectedDialogId]);

  const contacts = useMemo<ContactItem[]>(() => {
    const dialogByPeer = new Map<number, ChatDialog>();

    for (const dialog of dialogs) {
      dialogByPeer.set(dialog.peer_user_id, dialog);
    }

    const dialogContacts: ContactItem[] = dialogs.map((dialog) => ({
      key: `dialog-${dialog.id}`,
      kind: "dialog",
      user_id: dialog.peer_user_id,
      email: dialog.peer_email,
      first_name: dialog.peer_first_name,
      last_name: dialog.peer_last_name,
      role: dialog.peer_role,
      dialog,
    }));

    const memberContacts: ContactItem[] = members
      .filter((member) => !member.is_self)
      .filter((member) => !dialogByPeer.has(member.user_id))
      .map((member) => ({
        key: `member-${member.user_id}`,
        kind: "member",
        user_id: member.user_id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role,
        member,
      }));

    return [...dialogContacts, ...memberContacts];
  }, [dialogs, members]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter((contact) => {
      const name = formatName(contact).toLowerCase();
      const email = (contact.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [contacts, searchQuery]);

  const selectedDialog = useMemo(() => {
    if (!selectedDialogId) return null;
    return dialogs.find((dialog) => dialog.id === selectedDialogId) || null;
  }, [dialogs, selectedDialogId]);

  const selectedMember = useMemo(() => {
    if (selectedDialog) return null;
    if (!selectedPeerUserId) return null;
    return members.find((member) => member.user_id === selectedPeerUserId) || null;
  }, [members, selectedDialog, selectedPeerUserId]);

  const selectedTitle = selectedDialog
    ? formatName({
        first_name: selectedDialog.peer_first_name,
        last_name: selectedDialog.peer_last_name,
        email: selectedDialog.peer_email,
      })
    : selectedMember
      ? formatName(selectedMember)
      : "Выберите сотрудника";

  const selectedSubtitle = selectedDialog
    ? `${selectedDialog.peer_email} · ${formatRole(selectedDialog.peer_role)}`
    : selectedMember
      ? `${selectedMember.email} · ${formatRole(selectedMember.role)}`
      : "Откройте диалог из списка слева";

  async function handleSelectContact(contact: ContactItem) {
    try {
      if (contact.kind === "dialog" && contact.dialog) {
        setSelectedDialogId(contact.dialog.id);
        setSelectedPeerUserId(contact.user_id);
        await loadMessages(contact.dialog.id, true);
        return;
      }

      setOpeningPeerId(contact.user_id);

      const dialog = await openDirectChatDialog(contact.user_id);

      setSelectedDialogId(dialog.id);
      setSelectedPeerUserId(dialog.peer_user_id);

      setDialogs((current) => {
        const exists = current.some((item) => item.id === dialog.id);
        if (exists) {
          return current.map((item) => (item.id === dialog.id ? dialog : item));
        }

        return [dialog, ...current];
      });

      await loadMessages(dialog.id, true);
    } catch (e) {
      toast({
        title: "Не удалось открыть диалог",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setOpeningPeerId(null);
    }
  }

  async function handleSendMessage() {
    const body = messageDraft.trim();

    if (!selectedDialogId || !body || sending) return;

    setSending(true);

    try {
      const message = await sendChatMessage(selectedDialogId, body);

      setMessages((current) => [...current, message]);
      setMessageDraft("");

      await markChatDialogRead(selectedDialogId);
      await refreshSidebar();
    } catch (e) {
      toast({
        title: "Не удалось отправить сообщение",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;

    event.preventDefault();
    handleSendMessage();
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-5 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Загрузка чата сотрудников…
          </div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div>
                <div className="text-xl font-semibold text-foreground">
                  Чат сотрудников недоступен
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {accessError}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                На главную
              </Button>

              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Повторить
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5">
  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
    <div className="flex justify-center sm:block">
      <RadarLogo className="h-24 w-24 shrink-0 sm:h-28 sm:w-28 lg:h-32 lg:w-32" />
    </div>

    <div className="min-w-0 flex-1 text-center sm:text-left">
      <div className="break-words text-4xl font-bold leading-none tracking-tight text-primary sm:text-5xl lg:text-6xl">
        Smartoffer.pro
      </div>

      <div className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
        Чат сотрудников
      </div>

      <div className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Внутренние текстовые диалоги команды SmartOffer
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="h-11 w-full justify-center sm:w-auto sm:min-w-[120px]"
        >
          Главная
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate("/history")}
          className="h-11 w-full justify-center sm:w-auto sm:min-w-[120px]"
        >
          <History className="mr-2 h-4 w-4" />
          История
        </Button>

        <Button
          className="h-11 w-full justify-center sm:w-auto sm:min-w-[120px]"
          onClick={() => refreshSidebar().catch(() => {})}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Чат

          {unreadTotal > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2b2100] px-1.5 text-xs font-bold text-primary">
              {unreadTotal}
            </span>
          )}
        </Button>
      </div>
    </div>
  </div>
</header>

        <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">
                    Сотрудники
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Диалоги компании
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => refreshSidebar().catch(() => {})}
                  title="Обновить"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      sidebarLoading ? "animate-spin" : ""
                    )}
                  />
                </Button>
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по сотрудникам..."
                  className="h-10 border-border bg-background/70 pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredContacts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Сотрудники не найдены
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => {
                    const active =
                      selectedPeerUserId === contact.user_id ||
                      selectedDialogId === contact.dialog?.id;

                    const unread = contact.dialog?.unread_count || 0;
                    const lastMessage = contact.dialog?.last_message?.body_text;
                    const lastTime = contact.dialog?.last_message_at;

                    return (
                      <button
                        key={contact.key}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition",
                          active
                            ? "border-primary/55 bg-primary/15 shadow-[0_0_0_1px_rgba(255,191,0,0.08)]"
                            : "border-transparent bg-background/45 hover:border-border hover:bg-background/70"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                              active
                                ? "border-primary/50 bg-primary text-[#2b2100]"
                                : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {openingPeerId === contact.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              initials(contact)
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="truncate text-sm font-semibold text-white">
                                {formatName(contact)}
                              </div>

                              <div className="shrink-0 text-xs text-muted-foreground">
                                {formatTime(lastTime)}
                              </div>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <span className="truncate text-xs text-muted-foreground">
                                {shortText(lastMessage)}
                              </span>

                              {unread > 0 && (
                                <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-[#2b2100]">
                                  {unread}
                                </span>
                              )}
                            </div>

                            <div className="mt-1 truncate text-[11px] text-muted-foreground/75">
                              {contact.email}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                {members.filter((member) => !member.is_self).length} сотрудников доступно
              </div>
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">
                    {selectedTitle}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">
                    {selectedSubtitle}
                  </div>
                </div>
              </div>

              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                {selectedDialog?.last_message_at
                  ? `Последнее сообщение: ${formatDateTime(selectedDialog.last_message_at)}`
                  : "История диалога"}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {!selectedDialogId ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm rounded-2xl border border-dashed border-border p-6 text-center">
                    <MessageCircle className="mx-auto h-10 w-10 text-primary" />
                    <div className="mt-3 text-base font-semibold text-white">
                      Выберите сотрудника
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Откройте диалог из списка слева или начните новый чат с сотрудником команды.
                    </div>
                  </div>
                </div>
              ) : messagesLoading && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                  Загрузка сообщений…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm rounded-2xl border border-dashed border-border p-6 text-center">
                    <MessageCircle className="mx-auto h-10 w-10 text-primary" />
                    <div className="mt-3 text-base font-semibold text-white">
                      Сообщений пока нет
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Напишите первое сообщение сотруднику.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                 {messages.map((message) => (
  <div
    key={message.id}
    className={cn(
      "flex w-full",
      message.is_own ? "justify-end" : "justify-start"
    )}
  >
    <div
      className={cn(
        "inline-flex max-w-[86%] min-w-[190px] items-end gap-3 rounded-[22px] px-4 py-2 text-sm shadow-sm sm:min-w-[240px]",
        message.is_own
          ? "border border-primary/40 bg-primary text-[#2b2100]"
          : "border border-border bg-muted/60 text-white"
      )}
    >
      <div className="min-w-0 flex-1">
        {!message.is_own && (
          <div className="mb-1 text-xs font-semibold text-muted-foreground">
            {message.sender_name || message.sender_email || "Сотрудник"}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words leading-snug">
          {message.body_text}
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 self-end whitespace-nowrap pb-0.5 text-[11px] leading-none",
          message.is_own
            ? "text-[#5b4200]/75"
            : "text-muted-foreground"
        )}
      >
        {formatTime(message.created_at)}
      </div>
    </div>
  </div>
))}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <Input
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!selectedDialogId || sending}
                  placeholder="Введите сообщение..."
                  className="h-12 border-border bg-background/70"
                  maxLength={4000}
                />

                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!selectedDialogId || !messageDraft.trim() || sending}
                  className="h-12 w-12 shrink-0 p-0"
                  title="Отправить"
                  aria-label="Отправить"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Enter — отправить. Вложения на первом этапе отключены.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}