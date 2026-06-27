import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

import {
  BookUser,
  Loader2,
  Search,
  UserPlus,
} from "lucide-react";

import { cn } from "@/shared/utils/utils";

import {
  listAddressBookContacts,
  type AddressBookContact,
} from "@/api/addressBook";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

import type {
  AddSupplierPayload,
} from "@/api/search";

type AddMode = "quick" | "address-book";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onConfirm: (
    payload: AddSupplierPayload
  ) => void | Promise<void>;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось добавить поставщика";
}

function contactName(contact: AddressBookContact) {
  const name = [
    contact.first_name,
    contact.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || contact.email;
}

function websiteLabel(value?: string | null) {
  return (value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

export function AddSupplierModal({
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [mode, setMode] =
    useState<AddMode>("quick");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] =
    useState("");
  const [lastName, setLastName] =
    useState("");
  const [website, setWebsite] =
    useState("");
  const [note, setNote] =
    useState("");

  const [
    saveToAddressBook,
    setSaveToAddressBook,
  ] = useState(false);

  const [contacts, setContacts] = useState<
    AddressBookContact[]
  >([]);

  const [contactsLoading, setContactsLoading] =
    useState(false);

  const [search, setSearch] = useState("");

  const [
    selectedContactIds,
    setSelectedContactIds,
  ] = useState<number[]>([]);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const reset = () => {
    setMode("quick");

    setEmail("");
    setFirstName("");
    setLastName("");
    setWebsite("");
    setNote("");

    setSaveToAddressBook(false);

    setSearch("");
    setSelectedContactIds([]);

    setError(null);
    setSubmitting(false);
  };

  const changeOpen = (next: boolean) => {
    if (!next) {
      reset();
    }

    onOpenChange(next);
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setContactsLoading(true);

      try {
        const response =
          await listAddressBookContacts({
            limit: 200,
            offset: 0,
          });

        if (!cancelled) {
          setContacts(
            Array.isArray(response.items)
              ? response.items
              : []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredContacts = useMemo(() => {
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

  const selectedCount =
    selectedContactIds.length;

  const visibleContactIds = useMemo(
    () => filteredContacts.map((contact) => contact.id),
    [filteredContacts]
  );

  const allVisibleSelected =
    visibleContactIds.length > 0 &&
    visibleContactIds.every((contactId) =>
      selectedContactIds.includes(contactId)
    );

  const toggleContact = (contactId: number) => {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );

    setError(null);
  };

  const toggleAllVisible = () => {
    setSelectedContactIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !visibleContactIds.includes(id)
        );
      }

      return Array.from(
        new Set([
          ...current,
          ...visibleContactIds,
        ])
      );
    });

    setError(null);
  };

  const submitQuick = async () => {
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Укажите корректный email поставщика"
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        email: normalizedEmail,

        first_name:
          saveToAddressBook &&
          firstName.trim()
            ? firstName.trim()
            : undefined,

        last_name:
          saveToAddressBook &&
          lastName.trim()
            ? lastName.trim()
            : undefined,

        website:
          saveToAddressBook &&
          website.trim()
            ? website.trim()
            : undefined,

        note:
          saveToAddressBook &&
          note.trim()
            ? note.trim()
            : undefined,

        save_to_address_book:
          saveToAddressBook,
      });

      changeOpen(false);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const submitAddressBook = async () => {
    if (selectedContactIds.length === 0) {
      setError(
        "Выберите хотя бы один контакт из адресной книги"
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    let addedCount = 0;

    try {
      /*
       * Добавляем последовательно, а не через Promise.all.
       * Это снижает нагрузку и гарантирует предсказуемое
       * обновление списка поставщиков в React-state.
       */
      for (const contactId of selectedContactIds) {
        await onConfirm({
          address_book_contact_id: contactId,
        });

        addedCount += 1;
      }

      changeOpen(false);
    } catch (submitError) {
      setError(
        addedCount > 0
          ? `Добавлено контактов: ${addedCount}. ${errorMessage(
              submitError
            )}`
          : errorMessage(submitError)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
    >
      <DialogContent
        className="
          sm:max-w-[620px]
          max-h-[85vh]
          overflow-hidden
          border-border
          bg-card
          p-0
        "
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            Добавить поставщика
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <div className="grid grid-cols-2 border-b border-border">
            <button
              type="button"
              onClick={() => {
                setMode("quick");
                setError(null);
              }}
              className={cn(
                "border-b-2 px-3 py-3 text-sm font-medium transition",
                mode === "quick"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Быстро вручную
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("address-book");
                setError(null);
              }}
              className={cn(
                "border-b-2 px-3 py-3 text-sm font-medium transition",
                mode === "address-book"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Из адресной книги
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === "quick" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitQuick();
              }}
              className="space-y-4"
            >
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex gap-3">
                  <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Быстрое добавление
                    </div>

                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Для добавления поставщика достаточно указать email.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-supplier-email">
                  Email поставщика
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="manual-supplier-email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="example@company.ru"
                  inputMode="email"
                  autoComplete="off"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border bg-background/30 p-3">
                <Checkbox
                  id="save-manual-contact"
                  checked={saveToAddressBook}
                  onCheckedChange={(checked) =>
                    setSaveToAddressBook(
                      checked === true
                    )
                  }
                  disabled={submitting}
                  className="mt-0.5"
                />

                <div>
                  <Label
                    htmlFor="save-manual-contact"
                    className="cursor-pointer"
                  >
                    Сохранить в адресную книгу
                  </Label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Контакт можно будет использовать в следующих запросах.
                  </p>
                </div>
              </div>

              {saveToAddressBook && (
                <div className="space-y-3 rounded-lg border border-border bg-background/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="manual-first-name">
                        Имя
                      </Label>

                      <Input
                        id="manual-first-name"
                        value={firstName}
                        onChange={(event) =>
                          setFirstName(
                            event.target.value
                          )
                        }
                        placeholder="Иван"
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-last-name">
                        Фамилия
                      </Label>

                      <Input
                        id="manual-last-name"
                        value={lastName}
                        onChange={(event) =>
                          setLastName(
                            event.target.value
                          )
                        }
                        placeholder="Петров"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-website">
                      Сайт
                    </Label>

                    <Input
                      id="manual-website"
                      value={website}
                      onChange={(event) =>
                        setWebsite(
                          event.target.value
                        )
                      }
                      placeholder="company.ru"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-note">
                      Примечание
                    </Label>

                    <Textarea
                      id="manual-note"
                      value={note}
                      onChange={(event) =>
                        setNote(event.target.value)
                      }
                      placeholder="Например: поставляет насосы и запасные части"
                      maxLength={2000}
                      rows={3}
                      disabled={submitting}
                      className="resize-none"
                    />

                    <div className="text-right text-xs text-muted-foreground">
                      {note.length} / 2000
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    changeOpen(false)
                  }
                  disabled={submitting}
                >
                  Отмена
                </Button>

                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !isValidEmail(email)
                  }
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {saveToAddressBook
                    ? "Добавить и сохранить"
                    : "Добавить"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Поиск по имени, email или сайту"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>

<div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/30 px-3 py-2">
  <label className="flex cursor-pointer items-center gap-3">
    <Checkbox
      checked={allVisibleSelected}
      onCheckedChange={toggleAllVisible}
      disabled={
        submitting ||
        filteredContacts.length === 0
      }
    />

    <span className="text-sm font-medium text-foreground">
      Выбрать все найденные
    </span>
  </label>

  <span className="text-xs text-muted-foreground">
    Выбрано: {selectedCount}
  </span>
</div>

              <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
                {contactsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка адресной книги...
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-10 text-center">
                    <BookUser className="mx-auto h-8 w-8 text-muted-foreground/60" />

                    <div className="mt-3 text-sm font-medium text-foreground">
                      Контакты не найдены
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Добавить контакты можно в настройках.
                    </div>
                  </div>
                ) : (
  filteredContacts.map((contact) => {
    const selected =
      selectedContactIds.includes(contact.id);

    return (
      <div
        key={contact.id}
        role="button"
        tabIndex={0}
        onClick={() =>
          toggleContact(contact.id)
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            toggleContact(contact.id);
          }
        }}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0",
          selected
            ? "bg-primary/10 ring-1 ring-inset ring-primary"
            : "hover:bg-muted/40"
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() =>
            toggleContact(contact.id)
          }
          onClick={(event) =>
            event.stopPropagation()
          }
          disabled={submitting}
          className="mt-1 shrink-0"
          aria-label={`Выбрать ${contactName(
            contact
          )}`}
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {contactName(contact)}
          </div>

          <div className="mt-1 truncate text-xs text-muted-foreground">
            {contact.email}
          </div>        
        </div>

        <div className="flex w-[300px] shrink-0 flex-col gap-2">
  <div className="w-full text-right">
  <div className="truncate text-xs text-muted-foreground">
    {websiteLabel(contact.website) || "Сайт не указан"}
  </div>
</div>

  {contact.note?.trim() ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="
            w-full
            cursor-help
            truncate
            rounded-md
            border border-border/70
            bg-background/35
            px-2.5 py-2
            text-left
            text-xs
            text-foreground/80
          "
        >
          {contact.note}
        </div>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="end"
        className="
          max-w-[420px]
          whitespace-pre-wrap
          break-words
          text-sm
          leading-relaxed
        "
      >
        {contact.note}
      </TooltipContent>
    </Tooltip>
  ) : (
    <div
      className="
        w-full
        truncate
        rounded-md
        border border-border/50
        bg-background/20
        px-2.5 py-2
        text-left
        text-xs
        text-muted-foreground/60
      "
    >
      Нет примечания
    </div>
  )}
</div>
      </div>
    );
  })
)}
</div>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    changeOpen(false)
                  }
                  disabled={submitting}
                >
                  Отмена
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    void submitAddressBook()
                  }
                  disabled={
                    submitting ||
                    selectedCount === 0
                  }
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {selectedCount === 0
                    ? "Добавить выбранных"
                    : `Добавить выбранных: ${selectedCount}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}