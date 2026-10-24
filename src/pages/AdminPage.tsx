import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { getAdminMe, getAdminMfaStatus, getAdminMonitoringSummary, ADMIN_MFA_EVENT } from "@/api/admin";
import { AdminMfaForm } from "@/features/admin/components/AdminMfaForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { AdminAccessState } from "@/features/admin/components/AdminAccessState";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import type { AdminSection } from "@/features/admin/components/AdminSidebar";
import { AdminUsersView } from "@/features/admin/components/AdminUsersView";
import { AdminBillingView } from "@/features/admin/components/AdminBillingView";
import { AdminMonitoringView } from "@/features/admin/components/AdminMonitoringView";
import { AdminAuditView } from "@/features/admin/components/AdminAuditView";
import { getAuthToken, getAuthContextKey, subscribeAuth } from "@/shared/utils/auth";

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [userSearch, setUserSearch] = useState("");
  const hasToken = !!useSyncExternalStore(subscribeAuth, getAuthToken);
  const generation = getAuthContextKey();
  const queryClient = useQueryClient();
  const [stepUp, setStepUp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const mfaQuery = useQuery({
    queryKey: ["admin", "mfa", generation], queryFn: getAdminMfaStatus,
    enabled: hasToken, retry: false, staleTime: 0,
  });

  const adminQuery = useQuery({
    queryKey: ["admin", "me", generation],
    queryFn: getAdminMe,
    retry: false,
    enabled: hasToken && mfaQuery.data?.verified === true,
  });
  const monitoring = useQuery({
    queryKey:["admin","monitoring","summary",generation],
    queryFn:({signal})=>getAdminMonitoringSummary(signal),
    enabled:hasToken && mfaQuery.data?.verified===true && !!adminQuery.data,
    refetchInterval:30_000, refetchIntervalInBackground:false, staleTime:10_000,
  });

  useEffect(() => {
    const required = () => { setConfirmed(false); setStepUp(true); };
    window.addEventListener(ADMIN_MFA_EVENT, required);
    return () => window.removeEventListener(ADMIN_MFA_EVENT, required);
  }, []);

  const verified = async () => {
    setStepUp(false); setConfirmed(true);
    await mfaQuery.refetch();
    await queryClient.invalidateQueries({queryKey: ["admin"]});
  };

  useEffect(() => {
    document.title = "SmartOffer Admin Console";
  }, []);

  if (!hasToken) {
    return <AdminAccessState kind="unauthorized" />;
  }

  if (mfaQuery.isLoading) {
    return <AdminAccessState kind="loading" />;
  }

  if (mfaQuery.error) {
    const error = mfaQuery.error;
    return <AdminAccessState kind={error instanceof ApiError && error.status === 403 ? "forbidden" :
      error instanceof ApiError && error.status === 401 ? "unauthorized" : "error"} />;
  }

  const form = <AdminMfaForm key={generation} phoneMasked={mfaQuery.data?.phone_masked ?? null}
    provisioned={mfaQuery.data?.provisioned ?? false} onVerified={verified} />;
  if (!mfaQuery.data?.verified || (adminQuery.error instanceof ApiError && adminQuery.error.status === 428)) {
    return <main className="mx-auto max-w-lg p-8">{form}</main>;
  }
  if (adminQuery.isLoading) return <AdminAccessState kind="loading" />;

  if (adminQuery.error) {
    const error = adminQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      return <AdminAccessState kind="unauthorized" />;
    }
    if (error instanceof ApiError && error.status === 403) {
      return <AdminAccessState kind="forbidden" />;
    }
    return <AdminAccessState kind="error" />;
  }

  if (!adminQuery.data) {
    return <AdminAccessState kind="error" />;
  }

  return (
    <AdminLayout admin={adminQuery.data} mfa={mfaQuery.data} monitoring={monitoring} section={section} onSectionChange={setSection} onUserSearch={setUserSearch}>
      {confirmed && <p role="status" className="p-3">Подтверждение выполнено. Для продолжения повторно подтвердите нужное действие.</p>}
      {section === "users" ? <AdminUsersView searchQuery={userSearch} /> : section === "billing" ? <AdminBillingView /> : section === "monitoring" ? <AdminMonitoringView monitoring={monitoring} /> : section === "audit" ? <AdminAuditView /> : <AdminDashboard />}
      <Dialog open={stepUp} onOpenChange={setStepUp}>
        <DialogContent>
          <DialogHeader><DialogTitle>Подтвердите доступ</DialogTitle>
            <DialogDescription>После подтверждения Mobile ID повторно подтвердите исходное действие. Оно не выполняется автоматически.</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
