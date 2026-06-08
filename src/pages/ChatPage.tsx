import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  History,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { RadarLogo } from "@/shared/ui/RadarLogo";
import { cn } from "@/shared/utils/utils";
import { useToast } from "@/shared/hooks/use-toast";
import {
  downloadChatAttachment,  
  getChatUnreadCount,
  listChatDialogs,
  listChatMembers,
  listChatMessages,
  markChatDialogRead,
  openDirectChatDialog,
  sendChatMessage,
  uploadChatAttachment,
  type ChatAttachment,
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

function formatFileSize(sizeBytes?: number | null) {
  const value = Number(sizeBytes || 0);

  if (!Number.isFinite(value) || value <= 0) return "0 Б";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;

  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function isImageFile(file: File | null) {
  if (!file) return false;
  return (file.type || "").toLowerCase().startsWith("image/");
}

function isImageAttachment(attachment: ChatAttachment) {
  const contentType = (attachment.content_type || "").toLowerCase();
  const filename = (attachment.original_filename || "").toLowerCase();

  return (
    contentType.startsWith("image/") ||
    filename.endsWith(".png") ||
    filename.endsWith(".jpg") ||
    filename.endsWith(".jpeg") ||
    filename.endsWith(".webp") ||
    filename.endsWith(".gif")
  );
}

function pastedImageExtension(contentType: string) {
  const type = (contentType || "").toLowerCase();

  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";

  return "png";
}

function makePastedImageName(contentType: string) {
  const ext = pastedImageExtension(contentType);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  return `chat-image-${stamp}.${ext}`;
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

function normalizeSearchText(value?: string | null) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function messageMatchesSearch(message: ChatMessage, query: string) {
  const q = normalizeSearchText(query);
  if (!q) return true;

  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];

  const haystack = normalizeSearchText(
    [
      message.body_text,
      message.sender_name,
      message.sender_email,
      ...attachments.map((item) => item.original_filename),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return haystack.includes(q);
}

function highlightSearchText(text: string, query: string) {
  const q = query.trim();

  if (!q) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);

  if (index < 0) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <>
      {before}
      <mark className="rounded bg-primary/35 px-0.5 text-inherit">
        {match}
      </mark>
      {after}
    </>
  );
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
  const [dialogSearchQuery, setDialogSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<number, string>>({});
  const attachmentPreviewUrlsRef = useRef<Record<number, string>>({});

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

  useEffect(() => {
    if (!selectedFile || !isImageFile(selectedFile)) {
      setSelectedFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;
 
    const imageAttachments = messages.flatMap((message) =>
      (Array.isArray(message.attachments) ? message.attachments : []).filter(
        (attachment) =>
          isImageAttachment(attachment) &&
          !attachmentPreviewUrlsRef.current[attachment.id]
      )
    );

    if (imageAttachments.length === 0) return;

    for (const attachment of imageAttachments) {
      downloadChatAttachment(attachment.id)
        .then((result) => {
          const url = URL.createObjectURL(result.blob);

          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }

          attachmentPreviewUrlsRef.current[attachment.id] = url;

          setAttachmentPreviewUrls((current) => ({
            ...current,
            [attachment.id]: url,
          }));
        })
        .catch(() => {
          // Превью не должно ломать чат. Если не загрузилось — останется карточка файла.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [messages]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(attachmentPreviewUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }

      attachmentPreviewUrlsRef.current = {};
    };
  }, []);

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

const filteredMessages = useMemo(() => {
  const q = dialogSearchQuery.trim();

  if (!q) return messages;

  return messages.filter((message) => messageMatchesSearch(message, q));
}, [messages, dialogSearchQuery]);

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
    setDialogSearchQuery("");
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

    if (!selectedDialogId || sending || uploadingFile) return;
    if (!body && !selectedFile) return;

    if (selectedFile) {
      const maxBytes = 20 * 1024 * 1024;

      if (selectedFile.size > maxBytes) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер файла — 20 МБ.",
          variant: "destructive",
        });
        return;
      }
    }

    setSending(true);
    setUploadingFile(Boolean(selectedFile));

    try {
      const message = selectedFile
        ? await uploadChatAttachment(selectedDialogId, selectedFile, body)
        : await sendChatMessage(selectedDialogId, body);

      setMessages((current) => [...current, message]);
      setMessageDraft("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await markChatDialogRead(selectedDialogId);
      await refreshSidebar();
    } catch (e) {
      toast({
        title: selectedFile
          ? "Не удалось отправить файл"
          : "Не удалось отправить сообщение",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;

    event.preventDefault();
    handleSendMessage();
  }

  function applySelectedFile(file: File) {
    const maxBytes = 20 * 1024 * 1024;

    if (file.size > maxBytes) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла — 20 МБ.",
        variant: "destructive",
      });

      return;
    }

    setSelectedFile(file);
  }

  function extractImageFromClipboard(event: ClipboardEvent) {
    const items = Array.from(event.clipboardData?.items || []);

    const imageItem = items.find((item) => {
      return item.kind === "file" && item.type.toLowerCase().startsWith("image/");
    });

    if (!imageItem) return null;

    const rawFile = imageItem.getAsFile();
    if (!rawFile) return null;

    return new File(
      [rawFile],
      makePastedImageName(rawFile.type || "image/png"),
      {
        type: rawFile.type || "image/png",
        lastModified: Date.now(),
      }
    );
  }

  function handleSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    applySelectedFile(file);
  } 

  async function handleDownloadAttachment(attachment: ChatAttachment) {
    try {
      const result = await downloadChatAttachment(attachment.id);

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = result.filename || attachment.original_filename || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: "Не удалось скачать файл",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    function handleDocumentPaste(event: ClipboardEvent) {
      if (!selectedDialogId || sending || uploadingFile) return;

      const active = document.activeElement;

      // Не перехватываем вставку в поиске сотрудников и других input'ах.
      // Исключение — поле ввода сообщения.
      if (
        active instanceof HTMLInputElement &&
        active !== messageInputRef.current
      ) {
        return;
      }

      if (active instanceof HTMLTextAreaElement) {
        return;
      }

      const imageFile = extractImageFromClipboard(event);
      if (!imageFile) return;

      event.preventDefault();
      applySelectedFile(imageFile);

      toast({
        title: "Картинка добавлена",
        description: "Нажмите отправку или Enter, чтобы отправить изображение.",
      });
    }

    document.addEventListener("paste", handleDocumentPaste);

    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, [selectedDialogId, sending, uploadingFile, toast]);

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

              <div className="hidden min-w-[260px] max-w-[360px] flex-1 flex-col items-end gap-2 sm:flex">
  <div className="relative w-full">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

    <Input
      value={dialogSearchQuery}
      onChange={(event) => setDialogSearchQuery(event.target.value)}
      placeholder="Поиск в диалоге..."
      className="h-9 border-border bg-background/70 pl-9 text-sm"
      disabled={!selectedDialogId}
    />
  </div>

  <div className="text-right text-xs text-muted-foreground">
    {dialogSearchQuery.trim()
      ? `Найдено: ${filteredMessages.length}`
      : selectedDialog?.last_message_at
        ? `Последнее сообщение: ${formatDateTime(selectedDialog.last_message_at)}`
        : "История диалога"}
  </div>
</div>
            </div>

<div className="border-b border-border px-5 py-3 sm:hidden">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

    <Input
      value={dialogSearchQuery}
      onChange={(event) => setDialogSearchQuery(event.target.value)}
      placeholder="Поиск в диалоге..."
      className="h-10 border-border bg-background/70 pl-9 text-sm"
      disabled={!selectedDialogId}
    />
  </div>

  {dialogSearchQuery.trim() && (
    <div className="mt-2 text-xs text-muted-foreground">
      Найдено: {filteredMessages.length}
    </div>
  )}
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
      ) : dialogSearchQuery.trim() && filteredMessages.length === 0 ? (
  <div className="flex h-full items-center justify-center">
    <div className="max-w-sm rounded-2xl border border-dashed border-border p-6 text-center">
      <Search className="mx-auto h-10 w-10 text-primary" />
      <div className="mt-3 text-base font-semibold text-white">
        Ничего не найдено
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        Попробуйте другое слово или очистите поиск.
      </div>
    </div>
  </div>
) : (
  <div className="space-y-3">
    {filteredMessages.map((message) => {
        const attachments = Array.isArray(message.attachments)
          ? message.attachments
          : [];

        return (
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

                {message.body_text && (
                  <div className="whitespace-pre-wrap break-words leading-snug">
                    {highlightSearchText(message.body_text, dialogSearchQuery)}
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className={cn("mt-2 space-y-1", !message.body_text && "mt-0")}>
                    {attachments.map((attachment) => {
                      const previewUrl = attachmentPreviewUrls[attachment.id];
                      const image = isImageAttachment(attachment);

                      if (image && previewUrl) {
                        return (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => handleDownloadAttachment(attachment)}
                            className={cn(
                              "block w-full max-w-[320px] overflow-hidden rounded-xl border text-left transition",
                              message.is_own
                                ? "border-[#5b4200]/25 bg-[#2b2100]/10 hover:bg-[#2b2100]/15"
                                : "border-white/10 bg-black/15 hover:bg-black/25"
                            )}
                            title="Скачать изображение"
                          >
                            <img
                              src={previewUrl}
                              alt={attachment.original_filename || "Изображение"}
                              className="max-h-[260px] w-full object-contain"
                            />

                            <div className="flex items-center gap-2 px-3 py-2 text-xs">
                              <Paperclip className="h-4 w-4 shrink-0" />

                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">
                                  {attachment.original_filename || "Изображение"}
                                </span>
                                <span
                                  className={cn(
                                    "block text-[11px]",
                                    message.is_own
                                      ? "text-[#5b4200]/70"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {formatFileSize(attachment.size_bytes)}
                                </span>
                              </span>

                              <Download className="h-4 w-4 shrink-0 opacity-70" />
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => handleDownloadAttachment(attachment)}
                          className={cn(
                            "flex w-full max-w-[260px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition",
                            message.is_own
                              ? "border-[#5b4200]/25 bg-[#2b2100]/10 hover:bg-[#2b2100]/15"
                              : "border-white/10 bg-black/15 hover:bg-black/25"
                          )}
                          title="Скачать файл"
                        >
                          <Paperclip className="h-4 w-4 shrink-0" />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                              {attachment.original_filename || "Файл"}
                            </span>
                            <span
                              className={cn(
                                "block text-[11px]",
                                message.is_own
                                  ? "text-[#5b4200]/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatFileSize(attachment.size_bytes)}
                            </span>
                          </span>

                          <Download className="h-4 w-4 shrink-0 opacity-70" />
                        </button>
                      );
                    })}
                  </div>
                )}
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
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  )}
</div>

            <div className="border-t border-border p-4">
              {selectedFile && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                  <Paperclip className="h-4 w-4 shrink-0 text-primary" />

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">
                      {selectedFile.name}
                    </div>
                    <div>{formatFileSize(selectedFile.size)}</div>

                    {selectedFilePreviewUrl && (
                      <img
                        src={selectedFilePreviewUrl}
                        alt={selectedFile.name}
                        className="mt-2 max-h-40 max-w-full rounded-lg border border-border object-contain"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted"
                    title="Убрать файл"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleSelectFile}
                  disabled={!selectedDialogId || sending || uploadingFile}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedDialogId || sending || uploadingFile}
                  title="Прикрепить файл"
                  className="h-12 w-12 shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Input
                  ref={messageInputRef}
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!selectedDialogId || sending || uploadingFile}
                  placeholder="Введите сообщение..."
                  className="h-12 border-border bg-background/70"
                  maxLength={4000}
                />

                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={
                    !selectedDialogId ||
                    sending ||
                    uploadingFile ||
                    (!messageDraft.trim() && !selectedFile)
                  }
                  className="h-12 w-12 shrink-0 p-0"
                  title="Отправить"
                  aria-label="Отправить"
                >
                  {sending || uploadingFile ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Enter — отправить. Максимальный размер файла — 20 МБ.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}