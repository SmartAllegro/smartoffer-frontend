import * as React from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import {
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
  listAddressBookContacts,
  updateAddressBookContact,
  type AddressBookContact,
} from "@/api/addressBook";

import { useToast } from "@/shared/hooks/use-toast";

type ContactDraft = {
  first_name: string;
  last_name: string;
  website: string;
  email: string;
};

const EMPTY_DRAFT: ContactDraft = {
  first_name: "",
  last_name: "",
  website: "",
  email: "",
};

function contactName(contact: AddressBookContact) {
  const name = [
    contact.first_name,
    contact.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Без имени";
}

function errorMessage(error: unknown) {
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
      typeof parsed?.detail === "string"
    ) {
      return parsed.detail;
    }
  } catch {
    // ignore
  }

  return error.message;
}

export function AddressBookSection() {
  const { toast } = useToast();

  const [contacts, setContacts] =
    React.useState<AddressBookContact[]>([]);

  const [total, setTotal] =
    React.useState(0);

  const [loading, setLoading] =
    React.useState(false);

  const [saving, setSaving] =
    React.useState(false);

  const [deletingId, setDeletingId] =
    React.useState<number | null>(null);

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

  const loadContacts =
    React.useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await listAddressBookContacts({
            limit: 200,
            offset: 0,
          });

        setContacts(
          Array.isArray(response.items)
            ? response.items
            : []
        );

        setTotal(
          Number(response.total || 0)
        );
      } catch (error) {
        toast({
          title:
            "Не удалось загрузить адресную книгу",
          description:
            errorMessage(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }, [toast]);

  React.useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const filteredContacts =
    React.useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return contacts;
      }

      return contacts.filter((contact) => {
        const text = [
          contact.first_name,
          contact.last_name,
          contact.email,
          contact.website,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
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

      website:
        contact.website || "",

      email:
        contact.email || "",
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

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      toast({
        title: "Некорректный email",
        description:
          "Укажите email в формате name@company.ru",
        variant: "destructive",
      });

      return;
    }

    setSaving(true);

    try {
      const payload = {
        first_name:
          draft.first_name.trim() ||
          null,

        last_name:
          draft.last_name.trim() ||
          null,

        website:
          draft.website.trim() ||
          null,

        email,
      };

      if (editingId) {
        await updateAddressBookContact(
          editingId,
          payload
        );

        toast({
          title: "Контакт обновлён",
        });
      } else {
        await createAddressBookContact(
          payload
        );

        toast({
          title: "Контакт добавлен",
        });
      }

      closeEditor();
      await loadContacts();
    } catch (error) {
      toast({
        title:
          "Не удалось сохранить контакт",
        description:
          errorMessage(error),
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

      setTotal((current) =>
        Math.max(0, current - 1)
      );

      toast({
        title: "Контакт удалён",
      });
    } catch (error) {
      toast({
        title:
          "Не удалось удалить контакт",
        description:
          errorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium text-foreground">
            Контакты поставщиков
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Контакты принадлежат только вашему аккаунту.
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={openCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить контакт
        </Button>
      </div>

      {editorOpen && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">
              {editingId
                ? "Редактирование контакта"
                : "Новый контакт"}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeEditor}
              disabled={saving}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-first-name">
                Имя
              </Label>

              <Input
                id="contact-first-name"
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
              <Label htmlFor="contact-last-name">
                Фамилия
              </Label>

              <Input
                id="contact-last-name"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">
              Email
            </Label>

            <Input
              id="contact-email"
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
            <Label htmlFor="contact-website">
              Сайт
            </Label>

            <Input
              id="contact-website"
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

          <div className="flex justify-end gap-2">
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
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Поиск по имени, email или сайту"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка контактов...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "Поиск не дал результатов"
              : "Адресная книга пока пуста"}
          </div>
        ) : (
          filteredContacts.map(
            (contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {contactName(contact)}
                  </div>

                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {contact.email}
                  </div>

                  {contact.website && (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-primary hover:underline"
                    >
                      {contact.website.replace(
                        /^https?:\/\//i,
                        ""
                      )}
                    </a>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      openEdit(contact)
                    }
                    className="h-8 w-8"
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
                      deletingId === contact.id
                    }
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            )
          )
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Всего контактов: {total}
      </div>
    </div>
  );
}