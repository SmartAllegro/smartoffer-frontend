import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ui/dialog";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Textarea } from "@ui/textarea";
import { Label } from "@ui/label";
import { ChevronDown, Key, FileText } from "lucide-react";

export const STORAGE_KEY = "smartoffer.settings";
export const DEFAULT_TEMPLATE = `Добрый день!

Просьба прислать КП:
- Наименование: {{equipment}}
- Технические характеристики: {{specs}}

Также прошу прислать реквизиты компании.

С уважением,
{{user_name}}`;

export type SettingsState = {
  apiKey: string;
  template: string;
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: "", template: DEFAULT_TEMPLATE };
    const parsed = JSON.parse(raw);
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      template: typeof parsed.template === "string" ? parsed.template : DEFAULT_TEMPLATE,
    };
  } catch {
    return { apiKey: "", template: DEFAULT_TEMPLATE };
  }
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function SettingsModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (state: SettingsState) => void;
}) {
  const [expanded, setExpanded] = React.useState<"auth" | "template" | null>("auth");
  const [state, setState] = React.useState<SettingsState>(() => loadSettings());

  React.useEffect(() => {
    if (open) setState(loadSettings());
  }, [open]);

  const setApiKey = (apiKey: string) => setState((s) => ({ ...s, apiKey }));
  const setTemplate = (template: string) => setState((s) => ({ ...s, template }));

  const handleSave = () => {
    saveSettings(state);
    onSaved?.(state);
    onOpenChange(false);
  };

  const handleResetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Auth section */}
          <button
            type="button"
            onClick={() => setExpanded((p) => (p === "auth" ? null : "auth"))}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <Key className="h-4 w-4 text-muted-foreground" />
              Настройка авторизации
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded === "auth" ? "rotate-180" : ""}`} />
          </button>

          {expanded === "auth" && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="api-key">X-API-Key</Label>
                <Input
                  id="api-key"
                  value={state.apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Вставьте ключ доступа к API"
                />
                <p className="text-xs text-muted-foreground">
                  Ключ будет сохранён локально в браузере (localStorage).
                </p>
              </div>
            </div>
          )}

          {/* Template section */}
          <button
            type="button"
            onClick={() => setExpanded((p) => (p === "template" ? null : "template"))}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Настройка шаблона запроса
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded === "template" ? "rotate-180" : ""}`} />
          </button>

          {expanded === "template" && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="template">Шаблон письма</Label>
                <Textarea
                  id="template"
                  className="min-h-[160px]"
                  value={state.template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Доступные переменные: <code>{"{{equipment}}"}</code>,{" "}
                  <code>{"{{specs}}"}</code>, <code>{"{{user_name}}"}</code>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="secondary" onClick={handleResetTemplate}>
                  Сбросить шаблон
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
