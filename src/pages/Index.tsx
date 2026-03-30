import { useState, useCallback, useEffect, useMemo } from 'react';
import { StatusBadge } from '@/features/search/components/StatusBadge';
import { InputBlock } from '@/features/search/components/InputBlock';
import { SupplierTable } from '@/features/search/components/SupplierTable';
import { Footer } from '@/features/search/components/Footer';
import { HistoryModal } from "@/features/history/components/HistoryModal";
import { SettingsModal, DEFAULT_TEMPLATE, STORAGE_KEY } from '@/features/settings/components/SettingsModal';
import { BillingCounter } from '@/features/search/components/BillingCounter';
import { Button } from '@/shared/ui/button';
import { History } from 'lucide-react';
import { RequestStatus, Supplier } from '@/shared/types/rfq';
import { searchSuppliers } from "@/api/search";
import { fetchBillingMe, type BillingMe } from '@/api/billing';
import { useToast } from '@/shared/hooks/use-toast';
import { useRequestHistory } from '@/features/search/hooks/useRequestHistory';
import { CURRENT_ORGANIZATION_ID, CURRENT_USER_ID } from "@/shared/utils/tenant";
import { RadarLogo } from "@/shared/ui/RadarLogo";

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

export default function Index() {
  const [equipmentName, setEquipmentName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [rfqText, setRfqText] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requestId, setRequestId] = useState<string>('');
  const [noSuppliersFound, setNoSuppliersFound] = useState(false);

  const [searchJobId, setSearchJobId] = useState<number | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { toast } = useToast();
  const { history, addRequest, updateRequest } = useRequestHistory();

  const [authOpen, setAuthOpen] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);

  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const filteredHistory = useMemo(() => {
    return history.filter(
      (r) => !r.organization_id || r.organization_id === CURRENT_ORGANIZATION_ID
    );
  }, [history]);

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

  const selectedCount = suppliers.filter((s) => s.selected).length;

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

    const newRequestId = `req-${Date.now()}`;
    setRequestId(newRequestId);
    setStatus('searching');
    setSuppliers([]);
    setSearchJobId(null);
    setNoSuppliersFound(false);

    try {
      const {
        jobId,
        suppliers: foundSuppliers,
        noSuppliersFound: noFoundFlag,
      } = await searchSuppliers(equipmentName, newRequestId);

      setSuppliers(foundSuppliers);
      setSearchJobId(jobId);
      setStatus('search_completed');
      setNoSuppliersFound(!!noFoundFlag);

      addRequest({
        id: newRequestId,
        equipment_name: equipmentName,
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
          description: `Найдено ${foundSuppliers.length} потенциальных поставщиков для "${equipmentName}"`,
        });
      }
    } catch (error) {
      setStatus('error');
      toast({
        title: 'Ошибка поиска',
        description: error instanceof Error ? error.message : 'Произошла ошибка',
        variant: 'destructive',
      });
    } finally {
      void refreshBilling();
    }
  }, [me, equipmentName, emailSubject, rfqText, toast, addRequest, refreshBilling]);

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

    const selectedSuppliers = suppliers.filter((s) => s.selected && s.status === 'found');

    if (selectedSuppliers.length === 0) {
      toast({
        title: 'Поставщики не выбраны',
        description: 'Пожалуйста, выберите хотя бы одного поставщика для отправки запроса.',
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
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAddManual = useCallback((email: string) => {
    const newSupplier: Supplier = {
      id: `manual-${Date.now()}`,
      request_id: requestId || `req-${Date.now()}`,
      supplier_name: email.split('@')[1]?.split('.')[0] || 'Добавлено вручную',
      contact: email,
      source_url: '#',
      selected: true,
      status: 'found',
      created_at: new Date(),
      organization_id: CURRENT_ORGANIZATION_ID,
      created_by_user_id: CURRENT_USER_ID,
    };
    setSuppliers((prev) => [...prev, newSupplier]);

    if (status === 'idle') {
      setStatus('search_completed');
    }
  }, [requestId, status]);

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
                  Автоматизация запроса
                  <br />
                  коммерческих предложений
                </h2>

                <p className="text-lg sm:text-xl text-muted-foreground">
                  Быстрый поиск поставщиков
                </p>

                <div className="mt-6 flex items-center justify-between gap-4 lg:hidden">
                  <div className="shrink-0">
                    <RadarLogo isActive={status === "searching"} size={200} />
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <BillingCounter
                      billing={billing}
                      loading={billingLoading}
                      isAuthenticated={!!me}
                      onClick={() => setSettingsOpen(true)}
                    />

                    <Button
                      variant="outline"
                      onClick={() => setHistoryOpen(true)}
                      className="w-[132px] shrink-0 justify-center"
                    >
                      <History className="w-4 h-4 mr-2" />
                      История
                    </Button>
                  </div>
                </div>

                <div className="hidden lg:flex lg:absolute lg:right-0 lg:top-[38px] lg:flex-col lg:items-end lg:gap-3">
                  <BillingCounter
                    billing={billing}
                    loading={billingLoading}
                    isAuthenticated={!!me}
                    onClick={() => setSettingsOpen(true)}
                  />

                  <Button
                    variant="outline"
                    onClick={() => setHistoryOpen(true)}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {me ? me.email : "Войдите или зарегистрируйтесь"}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {!me ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setAuthOpen(true)}
                  >
                    Войти / Регистрация
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      clearAuthToken();
                      setMe(null);
                      setBilling(null);
                    }}
                  >
                    Выйти
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
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

          {status !== 'idle' && (
            <div className="flex justify-start">
              {noSuppliersFound ? (
                <div className="border border-[#ffbf00] rounded-md px-4 py-3 text-sm leading-relaxed">
                  <p className="text-foreground font-medium">
                    По данному запросу поставщик в странах СНГ не найден.
                  </p>
                  <p className="text-yellow-300/80">
                    Попробуйте изменить наименование оборудования.
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
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>

      <Footer />

      <HistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={filteredHistory}
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