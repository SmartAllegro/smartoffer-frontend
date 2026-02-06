// src/features/settings/storage/settingsStorage.ts

export type AppSettings = {
  apiKey: string;
  emailTemplate: string;
};

export const SETTINGS_STORAGE_KEY = "smartoffer_settings";

// Шаблон по умолчанию: можно заменить позже на твой финальный вариант
export const DEFAULT_EMAIL_TEMPLATE = `Здравствуйте!

Прошу прислать коммерческое предложение на следующее оборудование:

{EQUIPMENT}

Технические характеристики / артикулы / количество:
{SPECS}

Реквизиты для счета:
{REQUISITES}

Спасибо!`;

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        apiKey: "",
        emailTemplate: DEFAULT_EMAIL_TEMPLATE,
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      emailTemplate:
        typeof parsed.emailTemplate === "string"
          ? parsed.emailTemplate
          : DEFAULT_EMAIL_TEMPLATE,
    };
  } catch {
    return {
      apiKey: "",
      emailTemplate: DEFAULT_EMAIL_TEMPLATE,
    };
  }
}

export function saveSettings(next: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
}

export function getApiKey(): string {
  return loadSettings().apiKey;
}

export function getEmailTemplate(): string {
  return loadSettings().emailTemplate;
}
