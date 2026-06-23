import * as React from "react";

import {
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createAddressBookContact,
  deleteAddressBookContact,
  listAllAddressBookContacts,
  updateAddressBookContact,
  type AddressBookContact,
  type AddressBookContactInput,
} from "@/api/addressBook";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/shared/utils/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ContactDraft = {
  first_name: string;
  last_name: string;
  email: string;
  website: string;
  note: string;
};

const EMPTY_DRAFT: ContactDraft = {
  first_name: "",
  last_name: "",
  email: "",
  website: "",
  note: "",
};

function normalizeApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Произошла ошибка";
  }

  const match = error.message.match(
    /^API error \d+:\s*([\s\S]+)$/
  );

  if (!match) {
    return error.message;
  }

  try {
    const parsed = JSON.parse(match[1]);

    if (
      typeof parsed?.detail === "string" &&
      parsed.detail.trim()
    ) {
      return parsed.detail.trim();
    }
  } catch {
    // Backend мог вернуть не JSON.
  }

  return error.message;
}

function contactName(contact: AddressBookContact): string {
  const value = [
    contact.first_name,
    contact.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return value || contact.email;
}

function initials(contact: AddressBookContact): string {
  const first = (contact.first_name || "").trim();
  const last = (contact.last_name || "").trim();

  const result = `${first.charAt(0)}${last.charAt(0)}`
    .trim()
    .toUpperCase();

  if (result) return result;

  return contact.email
    .slice(0, 2)
    .toUpperCase();
}

function websiteLabel(value?: string | null): string {
  return (value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function websiteHref(value?: string | null): string {
  const clean = (value || "").trim();

  if (!clean) return "#";

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  return `https://${clean}`;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

export function AddressBookModal({
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();

  const [contacts, setContacts] =
    React.useState<AddressBookContact[]>([]);

  const [loading, setLoading] =
    React.useState(false);

  const [search, setSearch] =
    React.useState("");

  const [editorOpen, setEditorOpen] =
    React.useState(false);

  const [editingId, setEditingId] =
    React.useState<number | null>(null);

  const [draft, setDraft] =
    React.useState<ContactDraft>(
      EMPTY_DRAFT
    );

  const [saving, setSaving] =
    React.useState(false);

  const [deletingId, setDeletingId] =
    React.useState<number | null>(null);

  const loadContacts =
    React.useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await listAllAddressBookContacts();

        setContacts(response);
      } catch (error) {
        toast({
          title:
            "Не удалось загрузить адресную книгу",
          description:
            normalizeApiError(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }, [toast]);

  React.useEffect(() => {
    if (!open) return;

    void loadContacts();
  }, [open, loadContacts]);

  React.useEffect(() => {
    if (open) return;

    setSearch("");
    setEditorOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }, [open]);

  const filteredContacts =
    React.useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return contacts;
      }

      return contacts.filter((contact) => {
        const haystack = [
          contact.first_name,
          contact.last_name,
          contact.email,
          contact.website,
          contact.note,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }, [contacts, search]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  };

  const openEdit = (
    contact: AddressBookContact
  ) => {
    setEditingId(contact.id);

    setDraft({
      first_name:
        contact.first_name || "",

      last_name:
        contact.last_name || "",

      email:
        contact.email || "",

      website:
        contact.website || "",

      note:
        contact.note || "",
    });

    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;

    setEditorOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const saveContact = async () => {
    const email = draft.email
      .trim()
      .toLowerCase();

    if (!validEmail(email)) {
      toast({
        title: "Некорректный email",
        description:
          "Укажите email в формате name@company.ru",
        variant: "destructive",
      });

      return;
    }

    const payload: AddressBookContactInput = {
      first_name:
        draft.first_name.trim() || null,

      last_name:
        draft.last_name.trim() || null,

      email,

      website:
        draft.website.trim() || null,

      note:
        draft.note.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId) {
        const updated =
          await updateAddressBookContact(
            editingId,
            payload
          );

        setContacts((current) =>
          current.map((contact) =>
            contact.id === updated.id
              ? updated
              : contact
          )
        );

        toast({
          title: "Контакт обновлён",
        });
      } else {
        const created =
          await createAddressBookContact(
            payload
          );

        setContacts((current) => [
          ...current,
          created,
        ]);

        toast({
          title: "Контакт добавлен",
        });
      }

      closeEditor();
    } catch (error) {
      toast({
        title:
          "Не удалось сохранить контакт",
        description:
          normalizeApiError(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (
    contact: AddressBookContact
  ) => {
    const confirmed = window.confirm(
      `Удалить контакт ${contact.email}?`
    );

    if (!confirmed) return;

    setDeletingId(contact.id);

    try {
      await deleteAddressBookContact(
        contact.id
      );

      setContacts((current) =>
        current.filter(
          (item) =>
            item.id !== contact.id
        )
      );

      toast({
        title: "Контакт удалён",
      });
    } catch (error) {
      toast({
        title:
          "Не удалось удалить контакт",
        description:
          normalizeApiError(error),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        className="
          w-[calc(100vw-20px)]
          max-w-[1460px]
          h-[88vh]
          max-h-[920px]
          overflow-hidden
          border-[#2d4059]
          bg-[#101722]
          p-0
          text-white
          shadow-[0_28px_100px_rgba(0,0,0,0.65)]
        "
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/10 px-6 py-5">
            <div className="flex items-start gap-5">
              <DialogHeader className="text-left">

                  <div>
                    <DialogTitle className="text-2xl font-semibold text-white">
                      Адресная книга
                    </DialogTitle>

                    <p className="mt-1 text-sm text-white/55">
                      Контакты поставщиков для быстрого добавления в запросы.
                    </p>
                </div>
              </DialogHeader>

            </div>
          </div>

          <div className="shrink-0 border-b border-white/10 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Поиск по имени, email, сайту или примечанию"
                  className="
                    h-10 border-[#2f3a4d]
                    bg-[#0d1420] pl-9
                    text-white
                    placeholder:text-white/40
                  "
                />
              </div>

              <Button
                type="button"
                onClick={openCreate}
                className="
                  h-10 shrink-0
                  bg-[#ffbf00]
                  px-5 text-[#2b2100]
                  hover:bg-[#ffd04d]
                "
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить контакт
              </Button>
            </div>
          </div>

          {editorOpen && (
            <div className="shrink-0 border-b border-white/10 bg-[#111b29] px-6 py-4">
              <div className="rounded-xl border border-[#ffbf00]/25 bg-[#ffbf00]/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-white">
                    {editingId
                      ? "Редактирование контакта"
                      : "Новый контакт"}
                  </div>

                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="text-white/55 transition hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="address-first-name">
                      Имя
                    </Label>

                    <Input
                      id="address-first-name"
                      value={draft.first_name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          first_name:
                            event.target.value,
                        }))
                      }
                      placeholder="Иван"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-last-name">
                      Фамилия
                    </Label>

                    <Input
                      id="address-last-name"
                      value={draft.last_name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          last_name:
                            event.target.value,
                        }))
                      }
                      placeholder="Петров"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-email">
                      Email
                    </Label>

                    <Input
                      id="address-email"
                      value={draft.email}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          email:
                            event.target.value,
                        }))
                      }
                      placeholder="sales@company.ru"
                      inputMode="email"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address-website">
                      Сайт
                    </Label>

                    <Input
                      id="address-website"
                      value={draft.website}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          website:
                            event.target.value,
                        }))
                      }
                      placeholder="company.ru"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="address-note">
                    Примечание
                  </Label>

                  <Textarea
                    id="address-note"
                    value={draft.note}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        note:
                          event.target.value,
                      }))
                    }
                    placeholder="Например: судовые насосы, запасные части, быстро отвечает..."
                    maxLength={2000}
                    rows={3}
                    disabled={saving}
                    className="resize-none"
                  />

                  <div className="text-right text-xs text-white/40">
                    {draft.note.length} / 2000
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Отмена
                  </Button>

                  <Button
                    type="button"
                    onClick={() =>
                      void saveContact()
                    }
                    disabled={
                      saving ||
                      !draft.email.trim()
                    }
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}

                    Сохранить
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 px-6 py-4">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1420]">
              <div
                className="
                  hidden shrink-0
                  grid-cols-[minmax(260px,1.2fr)_minmax(180px,0.8fr)_minmax(300px,1.4fr)_100px]
                  gap-5
                  border-b border-white/10
                  px-4 py-3
                  text-xs font-medium uppercase tracking-wide
                  text-white/45
                  lg:grid
                "
              >
                <div>Поставщик</div>
                <div>Сайт</div>
                <div>Примечание</div>
                <div className="text-center">
                  Действия
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center gap-2 text-sm text-white/55">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка адресной книги...
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
                    <div className="font-medium text-white">
                      {search.trim()
                        ? "Контакты не найдены"
                        : "Адресная книга пока пуста"}
                    </div>

                    <div className="mt-2 text-sm text-white/45">
                      {search.trim()
                        ? "Попробуйте изменить поисковый запрос."
                        : "Добавьте первый контакт поставщика."}
                    </div>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const href = websiteHref(
                      contact.website
                    );

                    return (
                      <div
                        key={contact.id}
                        className="
                          grid gap-4
                          border-b border-white/10
                          px-4 py-3
                          transition
                          last:border-b-0
                          hover:bg-white/[0.035]
                          lg:grid-cols-[minmax(260px,1.2fr)_minmax(180px,0.8fr)_minmax(300px,1.4fr)_100px]
                          lg:items-center lg:gap-5
                        "
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                              "border border-[#ffbf00]/20 bg-[#ffbf00]/10",
                              "text-xs font-semibold text-[#ffbf00]"
                            )}
                          >
                            {initials(contact)}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {contactName(contact)}
                            </div>

                            <div className="mt-1 truncate text-xs text-white/50">
                              {contact.email}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-white/35 lg:hidden">
                            Сайт
                          </div>

                          {href !== "#" ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-full items-center gap-1.5 text-sm text-[#ffbf00] hover:underline"
                            >
                              <span className="truncate">
                                {websiteLabel(
                                  contact.website
                                )}
                              </span>

                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-sm text-white/35">
                              —
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-white/35 lg:hidden">
                            Примечание
                          </div>

                          <div
                            className={cn(
                              "text-sm leading-relaxed",
                              contact.note
                                ? "text-white/75"
                                : "text-white/30"
                            )}
                          >
                            {contact.note || "Нет примечания"}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 lg:justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEdit(contact)
                            }
                            className="
                              h-8 w-8
                              border border-white/10
                              bg-white/[0.035]
                              text-white/75
                              hover:border-[#ffbf00]/40
                              hover:bg-[#ffbf00]/10
                              hover:text-[#ffbf00]
                            "
                            title="Изменить"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              void removeContact(
                                contact
                              )
                            }
                            disabled={
                              deletingId ===
                              contact.id
                            }
                            className="
                              h-8 w-8
                              border border-red-500/15
                              bg-red-500/[0.035]
                              text-red-400
                              hover:bg-red-500/10
                              hover:text-red-300
                            "
                            title="Удалить"
                          >
                            {deletingId ===
                            contact.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 px-6 py-3">
            <div className="text-sm text-white/50">
              Всего контактов:{" "}
              <span className="font-medium text-white">
                {contacts.length}
              </span>

              {search.trim() && (
                <>
                  {" · "}Найдено:{" "}
                  <span className="font-medium text-white">
                    {filteredContacts.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
