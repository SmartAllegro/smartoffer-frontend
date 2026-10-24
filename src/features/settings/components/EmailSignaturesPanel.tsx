import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { ApiError } from "@/api/client";
import {
  createEmailSignature,
  deleteEmailSignature,
  listEmailSignatures,
  updateEmailSignature,
  type EmailSignature,
  type EmailSignaturePayload,
} from "@/api/emailSignatures";

function emptyDraft(): EmailSignaturePayload {
  return {
    name: "",
    body_text: "",
    language_code: "",
    is_default_cis: false,
    is_default_international: false,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => typeof item?.msg === "string" ? item.msg : null)
        .filter(Boolean);
      if (messages.length) return messages.join("; ");
    }
    if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
      return detail.message;
    }
  }
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

export function EmailSignaturesPanel({ active = true }: { active?: boolean }) {
  const { toast } = useToast();
  const [signatures, setSignatures] = React.useState<EmailSignature[]>([]);
  const [signaturesLoading, setSignaturesLoading] = React.useState(true);
  const [signaturesLoaded, setSignaturesLoaded] = React.useState(false);
  const [signaturesError, setSignaturesError] = React.useState<string | null>(null);
  const [editingSignatureId, setEditingSignatureId] = React.useState<number | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<EmailSignaturePayload>(emptyDraft);
  const [signatureSaving, setSignatureSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<EmailSignature | null>(null);
  const [signatureDeleting, setSignatureDeleting] = React.useState(false);

  const reloadSignatures = React.useCallback(async () => {
    setSignaturesLoading(true);
    setSignaturesError(null);
    try {
      const items = await listEmailSignatures();
      setSignatures(items);
      setSignaturesLoaded(true);
      return true;
    } catch (error) {
      const message = errorMessage(error);
      setSignaturesError(message);
      toast({ title: "Не удалось загрузить подписи", description: message, variant: "destructive" });
      return false;
    } finally {
      setSignaturesLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (active && !signaturesLoaded) void reloadSignatures();
  }, [active, signaturesLoaded, reloadSignatures]);

  function startCreate() {
    setEditingSignatureId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  }

  function startEdit(signature: EmailSignature) {
    setEditingSignatureId(signature.id);
    setDraft({
      name: signature.name,
      body_text: signature.body_text,
      language_code: signature.language_code ?? "",
      is_default_cis: signature.is_default_cis,
      is_default_international: signature.is_default_international,
    });
    setEditorOpen(true);
  }

  function cancelEdit() {
    setEditorOpen(false);
    setEditingSignatureId(null);
    setDraft(emptyDraft());
  }

  async function saveSignature() {
    if (!draft.name.trim() || !draft.body_text.trim() || signatureSaving) return;
    setSignatureSaving(true);
    try {
      const payload = {
        ...draft,
        name: draft.name.trim(),
        body_text: draft.body_text.trimEnd(),
        language_code: draft.language_code?.trim() || null,
      };
      if (editingSignatureId === null) {
        await createEmailSignature(payload);
      } else {
        await updateEmailSignature(editingSignatureId, payload);
      }
      cancelEdit();
      await reloadSignatures();
      toast({ title: "Подпись сохранена" });
    } catch (error) {
      toast({ title: "Не удалось сохранить подпись", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSignatureSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || signatureDeleting) return;
    setSignatureDeleting(true);
    try {
      await deleteEmailSignature(deleteTarget.id);
      setDeleteTarget(null);
      await reloadSignatures();
      toast({ title: "Подпись удалена" });
    } catch (error) {
      toast({ title: "Не удалось удалить подпись", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSignatureDeleting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Подписи используются отдельно от текста запроса. Можно создать разные варианты для СНГ и международных писем.
      </p>

      {!editorOpen && !signaturesLoading && signatures.length > 0 && (
        <Button type="button" variant="secondary" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />Добавить подпись
        </Button>
      )}

      {signaturesLoading && <p className="text-sm text-muted-foreground">Загружаем подписи…</p>}
      {signaturesError && (
        <div className="space-y-2 text-sm text-destructive">
          <p>{signaturesError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void reloadSignatures()}>Повторить</Button>
        </div>
      )}
      {!signaturesLoading && !signaturesError && signatures.length === 0 && !editorOpen && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-4">
          <p className="font-medium">Подписей пока нет.</p>
          <p className="text-sm text-muted-foreground">Создайте подпись для запросов и ответов поставщикам.</p>
          <Button type="button" variant="secondary" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />Добавить подпись
          </Button>
        </div>
      )}

      {!signaturesLoading && signatures.map((signature) => (
        <div key={signature.id} className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{signature.name}</p>
              {signature.language_code && <p className="text-xs text-muted-foreground">{signature.language_code}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {signature.is_default_cis && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">СНГ по умолчанию</span>
              )}
              {signature.is_default_international && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">Международная по умолчанию</span>
              )}
            </div>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{signature.body_text}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(signature)}>Изменить</Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(signature)}>Удалить</Button>
          </div>
        </div>
      ))}

      {editorOpen && (
        <div className="space-y-4 rounded-lg border border-border bg-background p-4">
          <div className="space-y-2">
            <Label htmlFor="signature-name">Название</Label>
            <Input id="signature-name" maxLength={100} placeholder="Русская" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature-language">Язык</Label>
            <Input id="signature-language" maxLength={20} placeholder="ru, en, zh" value={draft.language_code ?? ""} onChange={(event) => setDraft((current) => ({ ...current, language_code: event.target.value }))} />
            <p className="text-xs text-muted-foreground">Необязательное служебное обозначение языка.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature-body">Подпись</Label>
            <Textarea id="signature-body" className="min-h-[140px] resize-y" maxLength={2000} placeholder={"С уважением,\nИмя Фамилия\nКомпания\nТелефон\nEmail"} value={draft.body_text} onChange={(event) => setDraft((current) => ({ ...current, body_text: event.target.value }))} />
            <p className="text-right text-xs text-muted-foreground">{draft.body_text.length} / 2000</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="signature-default-cis" checked={draft.is_default_cis} onCheckedChange={(checked) => setDraft((current) => ({ ...current, is_default_cis: checked === true }))} />
              <Label htmlFor="signature-default-cis">По умолчанию для запросов СНГ</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="signature-default-international" checked={draft.is_default_international} onCheckedChange={(checked) => setDraft((current) => ({ ...current, is_default_international: checked === true }))} />
              <Label htmlFor="signature-default-international">По умолчанию для международных запросов</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={cancelEdit} disabled={signatureSaving}>Отмена</Button>
            <Button type="button" onClick={() => void saveSignature()} disabled={!draft.name.trim() || !draft.body_text.trim() || signatureSaving}>
              {signatureSaving ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => { if (!next && !signatureDeleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить подпись «{deleteTarget?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Это не изменит уже отправленные письма.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signatureDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction disabled={signatureDeleting} onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>
              {signatureDeleting ? "Удаляем…" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
