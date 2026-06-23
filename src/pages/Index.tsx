import { useState, useCallback, useEffect, useMemo } from 'react';
import { StatusBadge } from '@/features/search/components/StatusBadge';
import { InputBlock } from '@/features/search/components/InputBlock';
import { SupplierTable } from '@/features/search/components/SupplierTable';
import { Footer } from '@/features/search/components/Footer';
import { useNavigate } from "react-router-dom";
import { SettingsModal, DEFAULT_TEMPLATE, STORAGE_KEY } from '@/features/settings/components/SettingsModal';
import { BillingCounter } from '@/features/search/components/BillingCounter';
import { Button } from '@/shared/ui/button';
import { BookOpen, Brain, History, LogIn, LogOut, MessageCircle, ShieldAlert } from 'lucide-react';
import { getChatUnreadCount } from "@/api/chat";
import { RequestStatus, Supplier } from '@/shared/types/rfq';
import {
  addManualSearchResult,
  searchSuppliers,
  type AddSupplierPayload,
  type SearchMode,
} from "@/api/search";
import { fetchBillingMe, type BillingMe } from '@/api/billing';
import { useToast } from '@/shared/hooks/use-toast';
import { useRequestHistory } from '@/features/search/hooks/useRequestHistory';
import { CURRENT_ORGANIZATION_ID, CURRENT_USER_ID } from "@/shared/utils/tenant";
import { RadarLogo } from "@/shared/ui/RadarLogo";
import {
  AddressBookModal,
} from "@/features/address-book/components/AddressBookModal";
import {
  createEquipmentAnalysis,
  type EquipmentAnalysisData,
} from "@/api/ai";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { fetchMe, type UserMe } from "@/api/auth";
import { clearAuthToken, getAuthToken } from "@/shared/utils/auth";

import { sendRFQ } from "@/api/mail";

function loadTemplate(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    const parsed = JSON.parse(raw);
    return typeof parsed.template === "string" ? parsed.template : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

function AiSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className="mb-2 text-sm font-semibold text-foreground">
        {title}
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function MainEquipmentAiPanel({
  query,
  analysis,
  loading,
  errorText,
  cached,
}: {
  query: string;
  analysis: EquipmentAnalysisData | null;
  loading: boolean;
  errorText: string | null;
  cached: boolean;
}) {
  return (
    <section className="rounded-lg border border-[#2d4059] bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffbf00]/15 text-[#ffbf00]">
          <Brain className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-foreground">
                AI-справка по оборудованию
              </div>
              <div className="text-xs text-muted-foreground">
                Формируется после запуска поиска поставщиков
              </div>
            </div>

            {analysis && (
              <div className="text-xs text-muted-foreground">
                {cached ? "Сохранённая справка" : "Справка сохранена"}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="mb-1 text-xs text-muted-foreground">
              Запрос
            </div>
            <div className="text-sm font-semibold text-foreground">
              {query || "—"}
            </div>
          </div>

          {loading && (
            <div className="mt-3 rounded-lg border border-[#ffbf00]/25 bg-[#ffbf00]/10 p-3 text-sm text-[#ffdf72]">
              AI-справка формируется. Если такая справка уже есть в базе, она будет загружена без повторной генерации.
            </div>
          )}

          {errorText && !loading && (
            <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
              {errorText}
            </div>
          )}

          {!loading && !errorText && !analysis && (
            <div className="mt-3 rounded-lg border border-white/10 bg-background/30 p-3 text-sm text-muted-foreground">
              AI-справка появится после успешного запуска поиска.
            </div>
          )}

          {!loading && !errorText && analysis && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="lg:col-span-2">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  Кратко
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  {analysis.short_summary}
                </div>
              </section>

              <AiSection title="Ключевые особенности" items={analysis.key_features} />
              <AiSection title="Модификации и отличия" items={analysis.important_modifications} />
              <AiSection title="Аналоги / альтернативы" items={analysis.analogs} />
              <AiSection title="Что указать в запросе КП" items={analysis.rfq_checklist} />
              <AiSection title="Что уточнить у поставщика" items={analysis.supplier_questions} />
              <AiSection title="Риски ошибки подбора" items={analysis.selection_risks} />

              <section className="lg:col-span-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Важно
                </div>
                {analysis.disclaimer ||
                  "AI-справка является вспомогательной. Перед закупкой данные нужно сверять с паспортом, даташитом или официальным каталогом производителя."}
              </section>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
export default function Index() {
  const [equipmentName, setEquipmentName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [rfqText, setRfqText] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requestId, setRequestId] = useState<string>('');
  const [noSuppliersFound, setNoSuppliersFound] = useState(false);
  const [mainAiVisible, setMainAiVisible] = useState(false);
  const [mainAiQuery, setMainAiQuery] = useState("");
  const [mainAiAnalysis, setMainAiAnalysis] =
    useState<EquipmentAnalysisData | null>(null);
  const [mainAiLoading, setMainAiLoading] = useState(false);
  const [mainAiError, setMainAiError] = useState<string | null>(null);
  const [mainAiCached, setMainAiCached] = useState(false);

  const [searchJobId, setSearchJobId] = useState<number | null>(null);

  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);

  const { toast } = useToast();
  const { addRequest, updateRequest } = useRequestHistory();

  const [authOpen, setAuthOpen] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);
  
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const [searchMode, setSearchMode] = useState<SearchMode>("cis");

  const canUseInternationalSearch = useMemo(() => {
  const planCode = billing?.current_plan_code || "";
  return ["free_50", "pro_500", "max_1000"].includes(planCode);
}, [billing?.current_plan_code]);

const handleLogout = useCallback(() => {
  clearAuthToken();
  setMe(null);
  setBilling(null);
  setChatUnreadCount(0);
  setSuppliers([]);
  setRequestId("");
  setSearchJobId(null);
  setNoSuppliersFound(false);
  setStatus("idle");

  setMainAiVisible(false);
  setMainAiQuery("");
  setMainAiAnalysis(null);
  setMainAiLoading(false);
  setMainAiError(null);
  setMainAiCached(false);
}, []);

useEffect(() => {
  if (!canUseInternationalSearch && searchMode === "international") {
    setSearchMode("cis");
  }
}, [canUseInternationalSearch, searchMode]);

  
  useEffect(() => {
    if (equipmentName.trim()) {
      setEmailSubject(`Запрос КП — ${equipmentName}`);
    }
  }, [equipmentName]);

  useEffect(() => {
    if (!rfqText.trim()) {
      setRfqText(loadTemplate());
    }
  }, [rfqText]);

  const refreshBilling = useCallback(async () => {
    if (!getAuthToken()) {
      setBilling(null);
      setBillingLoading(false);
      return;
    }

    try {
      setBillingLoading(true);
      const nextBilling = await fetchBillingMe();
      setBilling(nextBilling);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        setBillingLoading(true);
        const user = await fetchMe();
        if (cancelled) return;

        setMe(user);

        try {
          const nextBilling = await fetchBillingMe();
          if (!cancelled) {
            setBilling(nextBilling);
          }
        } catch {
          if (!cancelled) {
            setBilling(null);
          }
        } finally {
          if (!cancelled) {
            setBillingLoading(false);
          }
        }
      } catch {
        clearAuthToken();
        if (!cancelled) {
          setMe(null);
          setBilling(null);
          setBillingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

const canPollChatUnreadCount = useMemo(() => {
  if (!me || !billing) return false;

  const planCode = billing.current_plan_code || "";
  const status = billing.status || "";
  const source = billing.billing_source || "";

  return (
    status === "active" &&
    (planCode === "max_1000" || source === "team_business")
  );
}, [me, billing]);

const loadChatUnreadCount = useCallback(async () => {
  if (!canPollChatUnreadCount) {
    setChatUnreadCount(0);
    return;
  }

  try {
    const res = await getChatUnreadCount();
    setChatUnreadCount(Number(res.unread_count || 0));
  } catch {
    setChatUnreadCount(0);
  }
}, [canPollChatUnreadCount]);

useEffect(() => {
  loadChatUnreadCount().catch(() => {});

  if (!canPollChatUnreadCount) return;

  const timer = window.setInterval(() => {
    loadChatUnreadCount().catch(() => {});
  }, 10000);

  return () => window.clearInterval(timer);
}, [canPollChatUnreadCount, loadChatUnreadCount]);

  const selectedCount = suppliers.filter((s) => s.selected && Boolean(s.contact?.trim())).length;
  
  const loadMainEquipmentAnalysis = useCallback(async (query: string) => {
    const cleanQuery = query.trim();

    if (!cleanQuery) return;

    setMainAiVisible(true);
    setMainAiQuery(cleanQuery);
    setMainAiLoading(true);
    setMainAiError(null);
    setMainAiAnalysis(null);
    setMainAiCached(false);

    try {
      const result = await createEquipmentAnalysis(cleanQuery);

      if (!result.ok || !result.analysis) {
        throw new Error(result.error || "AI-сервис не вернул справку");
      }

      setMainAiAnalysis(result.analysis);
      setMainAiCached(Boolean(result.cached));
    } catch {
      setMainAiAnalysis(null);
      setMainAiCached(false);
      setMainAiError(
        "AI-справка временно недоступна. Сохранённой справки для этого оборудования пока нет."
      );
    } finally {
      setMainAiLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!me) {
      setAuthOpen(true);
      toast({
        title: 'Требуется вход',
        description: 'Войдите или зарегистрируйтесь, чтобы выполнять поиск.',
        variant: 'destructive',
      });
      return;
    }

    const cleanEquipmentName = equipmentName.trim();

    if (!cleanEquipmentName) {
      toast({
        title: "Введите оборудование",
        description: "Укажите наименование оборудования для поиска поставщиков.",
        variant: "destructive",
      });
      return;
    }

    const newRequestId = `req-${Date.now()}`;
    setRequestId(newRequestId);
    setStatus('searching');
    setSuppliers([]);
    setSearchJobId(null);
    setNoSuppliersFound(false);

    setMainAiVisible(true);
    setMainAiQuery(cleanEquipmentName);
    setMainAiAnalysis(null);
    setMainAiError(null);
    setMainAiCached(false);
    setMainAiLoading(false);

    try {
      const {
        jobId,
        suppliers: foundSuppliers,
        noSuppliersFound: noFoundFlag,
      } = await searchSuppliers(cleanEquipmentName, newRequestId, searchMode);

      setSuppliers(foundSuppliers);
      setSearchJobId(jobId);
      setStatus('search_completed');
      setNoSuppliersFound(!!noFoundFlag);

      void loadMainEquipmentAnalysis(cleanEquipmentName);

      addRequest({
        id: newRequestId,
        equipment_name: cleanEquipmentName,
        rfq_text: rfqText,
        email_subject: emailSubject,
        status: 'search_completed',
        created_at: new Date(),
        organization_id: CURRENT_ORGANIZATION_ID,
        created_by_user_id: CURRENT_USER_ID,
      });

      if (noFoundFlag) {
        toast({
          title: 'Поставщики не найдены',
          description: 'Возможно, ваше оборудование получится найти под другим именем.',
        });
      } else {
        toast({
          title: 'Поставщики найдены',
          description: `Найдено ${foundSuppliers.length} потенциальных поставщиков для "${cleanEquipmentName}"`,
        });
      }
    } catch (error) {
      setStatus('error');
      
      setMainAiVisible(false);
      setMainAiLoading(false);
      setMainAiAnalysis(null);
      setMainAiError(null);
      setMainAiCached(false);

      toast({
        title: 'Ошибка поиска',
        description: error instanceof Error ? error.message : 'Произошла ошибка',
        variant: 'destructive',
      });
    } finally {
      void refreshBilling();
    }
  }, [
  me,
  equipmentName,
  emailSubject,
  rfqText,
  searchMode,
  toast,
  addRequest,
  refreshBilling,
  loadMainEquipmentAnalysis,
]);

  const handleSend = useCallback(async () => {
    if (!me) {
      setAuthOpen(true);
      toast({
        title: 'Требуется вход',
        description: 'Войдите или зарегистрируйтесь, чтобы отправлять запросы.',
        variant: 'destructive',
      });
      return;
    }

    const selectedSuppliers = suppliers.filter(
  (s) => s.selected && s.status === "found" && Boolean(s.contact?.trim())
);

    if (selectedSuppliers.length === 0) {
      toast({
        title: 'Поставщики не выбраны',
        description: 'Выберите хотя бы одного поставщика с найденным email или добавьте email вручную.',
        variant: 'destructive',
      });
      return;
    }

    const hasNonManual = selectedSuppliers.some((s) => typeof s.backend_result_id === "number");
    if (hasNonManual && !searchJobId) {
      toast({
        title: 'Не найден ID поиска',
        description: 'Не удалось определить job_id бэкенда. Повторите поиск и попробуйте снова.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('sending');

    try {
      const results = await sendRFQ(
        searchJobId ?? 0,
        emailSubject,
        rfqText,
        selectedSuppliers
      );

      setSuppliers((prev) =>
        prev.map((supplier) => {
          const result = results.get(supplier.id);
          if (result) {
            return {
              ...supplier,
              status: result.status,
              error_message: result.error_message,
              error_details: result.error_details,
              error_code: result.error_code
            };
          }
          return supplier;
        })
      );

      const sentCount = Array.from(results.values()).filter((r) => r.status === 'sent').length;
      const errorCount = Array.from(results.values()).filter((r) => r.status === 'error').length;

      setStatus('completed');

      updateRequest(requestId, {
        status: 'completed',
        sent_at: new Date(),
        recipients_count: sentCount,
      });

      toast({
        title: 'Запрос отправлен',
        description: `Успешно отправлено ${sentCount} поставщикам${errorCount > 0 ? `, ${errorCount} с ошибкой` : ''}`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      setStatus('error');
      updateRequest(requestId, { status: 'error' });
      toast({
        title: 'Ошибка отправки',
        description: error instanceof Error ? error.message : 'Произошла ошибка',
        variant: 'destructive',
      });
    }
  }, [me, suppliers, requestId, rfqText, emailSubject, toast, updateRequest, searchJobId]);

  const handleToggleSelect = useCallback((id: string) => {
  setSuppliers((prev) =>
    prev.map((s) => {
      if (s.id !== id) return s;

      // Поставщиков без email показываем, но не даём выбрать для отправки КП.
      if (!s.contact?.trim()) {
        return { ...s, selected: false };
      }

      return { ...s, selected: !s.selected };
    })
  );
}, []);

  const handleDelete = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAddManual = useCallback(
  async (
    payload: AddSupplierPayload
  ) => {
    if (!searchJobId) {
      throw new Error(
        "Сначала выполните поиск поставщиков"
      );
    }

    const result =
      await addManualSearchResult(
        searchJobId,
        payload
      );

    const email =
      Array.isArray(result.emails)
        ? result.emails[0]?.trim() || ""
        : "";

    if (!email) {
      throw new Error(
        "Backend не вернул email поставщика"
      );
    }

    const newSupplier: Supplier = {
      id: `result-${result.id}`,

      request_id:
        requestId ||
        `job-${searchJobId}`,

      supplier_name:
        result.title ||
        result.domain ||
        email,

      contact: email,
      contact_status: "email",
      contact_label: email,

      source_url: result.url || "",

      selected: true,
      status: "found",
      created_at: new Date(),

      backend_result_id: result.id,

      is_manual:
        Boolean(result.is_manual),

      address_book_contact_id:
        result.address_book_contact_id ??
        null,
    };

    setSuppliers((current) => {
      const existingIndex =
        current.findIndex((supplier) => {
          if (
            supplier.backend_result_id ===
            result.id
          ) {
            return true;
          }

          return (
            supplier.contact
              ?.trim()
              .toLowerCase() ===
            email.toLowerCase()
          );
        });

      if (existingIndex === -1) {
        return [
          ...current,
          newSupplier,
        ];
      }

      return current.map(
        (supplier, index) =>
          index === existingIndex
            ? {
                ...supplier,

                supplier_name:
                  result.title ||
                  supplier.supplier_name,

                contact: email,
                contact_status: "email",
                contact_label: email,

                source_url:
                  result.url ||
                  supplier.source_url,

                selected:
                  supplier.status === "sent"
                    ? supplier.selected
                    : true,

                backend_result_id:
                  result.id,

                is_manual:
                  Boolean(
                    result.is_manual
                  ),

                address_book_contact_id:
                  result.address_book_contact_id ??
                  supplier.address_book_contact_id ??
                  null,
              }
            : supplier
      );
    });

    setNoSuppliersFound(false);

    if (status === "idle") {
      setStatus("search_completed");
    }

    toast({
      title: result.created
        ? "Поставщик добавлен"
        : "Поставщик уже был в запросе",

      description: result.contact_saved
        ? `${email} добавлен в запрос и сохранён в адресной книге.`
        : `${email} добавлен в текущий запрос.`,
    });
  },
  [
    requestId,
    searchJobId,
    status,
    toast,
  ]
);

  const handleSettingsOpenChange = useCallback((next: boolean) => {
    setSettingsOpen(next);
    if (!next && getAuthToken()) {
      void refreshBilling();
    }
  }, [refreshBilling]);

  const isProcessing = status === 'searching' || status === 'sending';

  const displayName = useMemo(() => {
    if (!me) return "Гость";
    const n = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim();
    return n || me.email;
  }, [me]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[996px] mx-auto space-y-4">
          <div className="pt-8 pb-0">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
              <div className="hidden lg:block shrink-0">
                <RadarLogo isActive={status === "searching"} size={220} />
              </div>

              <div className="flex-1 lg:relative lg:pr-[170px]">
                <div className="mb-3">
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-primary tracking-tight leading-none">
                    Smartoffer.pro
                  </h1>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-tight mb-3">
                  Интеллектуальный B2B-сервис
                  <br />
                  для снабжения и закупок 
                </h2>

                <p className="text-lg sm:text-xl text-muted-foreground">
                  Быстрый поиск поставщиков и аналогов оборудования
                </p>

                <div className="mt-6 flex items-center justify-between gap-4 lg:hidden">
                  <div className="shrink-0">
                    <RadarLogo isActive={status === "searching"} size={200} />
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
  {me && (
    <Button
      variant="outline"
      size="sm"
      className="relative h-9 flex-1 justify-center"
      onClick={() => navigate("/chat")}
      title="Чат сотрудников"
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      Чат

      {chatUnreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-[#2b2100] shadow-[0_0_0_2px_rgba(17,24,39,1)]">
          {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
        </span>
      )}
    </Button>
  )}

  {!me ? (
    <Button
      variant="outline"
      size="sm"
      className="h-9 flex-1 justify-center"
      onClick={() => setAuthOpen(true)}
    >
      <LogIn className="mr-2 h-4 w-4" />
      Войти
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={handleLogout}
      title="Выйти"
      aria-label="Выйти"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )}
</div>

<BillingCounter
  billing={billing}
  loading={billingLoading}
  isAuthenticated={!!me}
  onClick={() => setSettingsOpen(true)}
/>

<Button
  variant="outline"
  onClick={() => navigate("/history")}
  className="w-[132px] shrink-0 justify-center"
>
  <History className="w-4 h-4 mr-2" />
  История
</Button>
                  </div>
                </div>

               <div className="hidden lg:flex lg:absolute lg:right-0 lg:top-0 lg:flex-col lg:items-end lg:gap-5">
  <div className="flex items-center gap-2">
    {me && (
      <Button
        variant="outline"
        size="sm"
        className="relative h-9 w-[92px] justify-center"
        onClick={() => navigate("/chat")}
        title="Чат сотрудников"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Чат

        {chatUnreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-[#2b2100] shadow-[0_0_0_2px_rgba(17,24,39,1)]">
            {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
          </span>
        )}
      </Button>
    )}

    {!me ? (
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-[132px] justify-center"
        onClick={() => setAuthOpen(true)}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Войти
      </Button>
    ) : (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleLogout}
        title="Выйти"
        aria-label="Выйти"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    )}
  </div>

  <BillingCounter
    billing={billing}
    loading={billingLoading}
    isAuthenticated={!!me}
    onClick={() => setSettingsOpen(true)}
  />

  <Button
    variant="outline"
    onClick={() => navigate("/history")}
    className="w-[132px] shrink-0 justify-center"
  >
    <History className="w-4 h-4 mr-2" />
    История
  </Button>
</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {me ? me.email : "Войдите или зарегистрируйтесь"}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="shrink-0 text-sm font-semibold text-foreground sm:mr-2">
                    Режим поиска
                  </div>

                  <div className="grid h-9 w-full grid-cols-2 rounded-lg border border-border bg-background/40 p-[2px] sm:w-[230px]">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setSearchMode("cis")}
                      className={[
                        "inline-flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition",
                        searchMode === "cis"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        isProcessing ? "cursor-not-allowed opacity-60" : "",
                      ].join(" ")}
                    >
                      СНГ
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || !canUseInternationalSearch}
                      onClick={() => setSearchMode("international")}
                      className={[
                        "inline-flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition",
                        searchMode === "international"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        isProcessing || !canUseInternationalSearch
                          ? "cursor-not-allowed opacity-60"
                          : "",
                      ].join(" ")}
                      title={
                        canUseInternationalSearch
                          ? "Глобальный поиск по международным поставщикам"
                          : "Глобальный режим недоступен на тарифе Старт"
                      }
                    >
                      Глобальный
                    </button>
                  </div>
                </div>

<Button
  type="button"
  variant="outline"
  onClick={() =>
    setAddressBookOpen(true)
  }
  disabled={!me}
  className="h-9 w-full sm:w-auto"
>
  Адресная книга
</Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full sm:w-auto"
                  onClick={() => setSettingsOpen(true)}
                >
                  Настройки
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <InputBlock
              equipmentName={equipmentName}
              emailSubject={emailSubject}
              rfqText={rfqText}
              status={status}
              hasSuppliers={suppliers.length > 0}
              selectedCount={selectedCount}
              onEquipmentNameChange={setEquipmentName}
              onEmailSubjectChange={setEmailSubject}
              onRfqTextChange={setRfqText}
              onSearch={handleSearch}
              onSend={handleSend}
            />
          </div>

{mainAiVisible && (
  <MainEquipmentAiPanel
    query={mainAiQuery}
    analysis={mainAiAnalysis}
    loading={mainAiLoading}
    errorText={mainAiError}
    cached={mainAiCached}
  />
)}

          {status !== 'idle' && (
            <div className="flex justify-start">
              {noSuppliersFound ? (
                <div className="border border-[#ffbf00] rounded-md px-4 py-3 text-sm leading-relaxed">
                  <p className="text-foreground font-medium">
                    По данному запросу поставщик не найден.
                  </p>
                  <p className="text-yellow-300/80">
                    Попробуйте изменить наименование оборудования или режим поиска.
                  </p>
                </div>
              ) : (
                <StatusBadge status={status} />
              )}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Найденные поставщики</h2>
            <SupplierTable
              suppliers={suppliers}
              onToggleSelect={handleToggleSelect}
              onDelete={handleDelete}
              onAdd={handleAddManual}
              canAddSupplier={
                Boolean(searchJobId) &&
                !isProcessing
              }
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>

      <Footer />

      <AddressBookModal
        open={addressBookOpen}
        onOpenChange={setAddressBookOpen}
      />
      
      <SettingsModal
        open={settingsOpen}
        onOpenChange={handleSettingsOpenChange}
      />

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={(u) => {
          setMe(u);
          void refreshBilling();
        }}
      />
    </div>
  );
}