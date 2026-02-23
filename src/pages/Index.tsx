import { useState, useCallback, useEffect, useMemo } from 'react';
import { StatusBadge } from '@/features/search/components/StatusBadge';
import { InputBlock } from '@/features/search/components/InputBlock';
import { SupplierTable } from '@/features/search/components/SupplierTable';
import { Footer } from '@/features/search/components/Footer';
import { HistoryModal } from "@/features/history/components/HistoryModal";
import { SettingsModal, DEFAULT_TEMPLATE, STORAGE_KEY } from '@/features/settings/components/SettingsModal';
import { Button } from '@/shared/ui/button';
import { History } from 'lucide-react';
import { RequestStatus, Supplier } from '@/shared/types/rfq';
import { searchSuppliers } from "@/api/search";
import { useToast } from '@/shared/hooks/use-toast';
import { useRequestHistory } from '@/features/search/hooks/useRequestHistory';
import { CURRENT_ORGANIZATION_ID, CURRENT_USER_ID } from "@/shared/utils/tenant";

// NEW: auth
import { AuthModal } from "@/features/auth/components/AuthModal";
import { fetchMe, type UserMe } from "@/api/auth";
import { clearAuthToken, getAuthToken } from "@/shared/utils/auth";

// NEW: mail
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

  // ВАЖНО: это настоящий job_id с бэка (число), нужен для /email/send и /history/{id}
  const [searchJobId, setSearchJobId] = useState<number | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { history, addRequest, updateRequest } = useRequestHistory();

  // NEW: auth state
  const [authOpen, setAuthOpen] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);

  // Filter history by current organization (scaffolding for multi-tenant)
  const filteredHistory = useMemo(() => {
    return history.filter(
      (r) => !r.organization_id || r.organization_id === CURRENT_ORGANIZATION_ID
    );
  }, [history]);

  // Auto-update email subject when equipment name changes
  useEffect(() => {
    if (equipmentName.trim()) {
      setEmailSubject(`Запрос КП — ${equipmentName}`);
    }
  }, [equipmentName]);

  // Auto-fill template when rfqText is empty
  useEffect(() => {
    if (!rfqText.trim()) {
      setRfqText(loadTemplate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: fetch /auth/me if token exists
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetchMe()
      .then(setMe)
      .catch(() => {
        clearAuthToken();
        setMe(null);
      });
  }, []);

  const selectedCount = suppliers.filter((s) => s.selected).length;

  const handleSearch = useCallback(async () => {
    const newRequestId = `req-${Date.now()}`;
    setRequestId(newRequestId);
    setStatus('searching');
    setSuppliers([]);
    setSearchJobId(null);

    try {
      const { jobId, suppliers: foundSuppliers } = await searchSuppliers(equipmentName, newRequestId);

      setSuppliers(foundSuppliers);
      setSearchJobId(jobId);
      setStatus('search_completed');

      // Save request to history with tenant context
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

      toast({
        title: 'Поставщики найдены',
        description: `Найдено ${foundSuppliers.length} потенциальных поставщиков для "${equipmentName}"`,
      });
    } catch (error) {
      setStatus('error');
      toast({
        title: 'Ошибка поиска',
        description: error instanceof Error ? error.message : 'Произошла ошибка',
        variant: 'destructive',
      });
    }
  }, [equipmentName, emailSubject, rfqText, toast, addRequest]);

  const handleSend = useCallback(async () => {
    const selectedSuppliers = suppliers.filter((s) => s.selected && s.status === 'found');

    if (selectedSuppliers.length === 0) {
      toast({
        title: 'Поставщики не выбраны',
        description: 'Пожалуйста, выберите хотя бы одного поставщика для отправки запроса.',
        variant: 'destructive',
      });
      return;
    }

    // ВАЖНО: отправка по результатам поиска возможна только при наличии backend job_id
    // Если выбраны только manual (у них backend_result_id нет) — job_id можно не требовать
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
      // ✅ ПРАВИЛЬНО:
      // sendRFQ(search_job_id:number, subject:string, body:string, suppliers:Supplier[])
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

      // Update request in history
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
  }, [suppliers, requestId, rfqText, emailSubject, toast, updateRequest, searchJobId]);

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

  const isProcessing = status === 'searching' || status === 'sending';

  const displayName = useMemo(() => {
    if (!me) return "Гость";
    const n = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim();
    return n || me.email;
  }, [me]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="pt-8 pb-4">
            {/* Brand */}
            <div className="mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
                Smartoffer.pro
              </h1>
            </div>

            {/* Title and Controls */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
                Автоматизация запроса<br />коммерческих предложений
              </h2>
              <Button
                variant="outline"
                onClick={() => setHistoryOpen(true)}
                className="shrink-0"
              >
                <History className="w-4 h-4 mr-2" />
                История
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground">
                Быстрый поиск поставщиков
              </p>
            </div>
          </div>

          {/* Authorization Block (REAL) */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {me ? me.email : "Войдите или зарегистрируйтесь"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!me ? (
                  <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
                    Войти / Регистрация
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearAuthToken();
                      setMe(null);
                    }}
                  >
                    Выйти
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  Настройки
                </Button>
              </div>
            </div>
          </div>

          {/* Input Section */}
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

          {/* Status */}
          {status !== 'idle' && (
            <div className="flex justify-start">
              <StatusBadge status={status} />
            </div>
          )}

          {/* Suppliers Section */}
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

      <Footer onOpenEmailVerification={() => setSettingsOpen(true)} />

      <HistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={filteredHistory}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* NEW: Auth modal */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={(u) => setMe(u)}
      />
    </div>
  );
}