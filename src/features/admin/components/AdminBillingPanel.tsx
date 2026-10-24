import { ArrowRight, CreditCard } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assignAdminUserPlan, type AdminUserDetailResponse } from "@/api/admin";
import { fetchBillingPlans } from "@/api/billing";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Progress } from "@/shared/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useToast } from "@/shared/hooks/use-toast";

import { apiErrorMessage, formatCurrencyRub, formatDateTime, formatNumber, percentUsed, statusBadgeClass } from "../adminUtils";

type AdminBillingPanelProps = {
  user: AdminUserDetailResponse;
};

export function AdminBillingPanel({ user }: AdminBillingPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const billing = user.billing;

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: fetchBillingPlans,
    enabled: dialogOpen,
  });

  const selectedPlan = useMemo(
    () => plansQuery.data?.items.find((plan) => plan.code === selectedPlanCode) || null,
    [plansQuery.data?.items, selectedPlanCode],
  );

  const assignMutation = useMutation({
    mutationFn: () => assignAdminUserPlan(user.profile.id, selectedPlanCode),
    onSuccess: () => {
      toast({ title: "Тариф пользователя изменён" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "user", user.profile.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Не удалось изменить тариф",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <CreditCard className="h-4 w-4 text-primary" />
          Тариф и лимиты
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setSelectedPlanCode(billing.plan_code || "");
            setDialogOpen(true);
          }}
          disabled={user.profile.is_deleted}
        >
          Изменить тариф
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Тариф" value={billing.plan_name || "Нет тарифа"} />
          <div>
            <div className="text-xs text-white/45">Status</div>
            <Badge className={`mt-1 border ${statusBadgeClass(billing.status)}`}>{billing.status}</Badge>
          </div>
          <Field label="Лимит" value={formatNumber(billing.requests_limit)} />
          <Field label="Использовано" value={formatNumber(billing.requests_used)} />
          <Field label="Осталось" value={formatNumber(billing.requests_remaining)} />
          <Field label="Активирован" value={formatDateTime(billing.activated_at)} />
          <Field label="Действует до" value={formatDateTime(billing.expires_at)} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>{formatNumber(billing.requests_used)} / {formatNumber(billing.requests_limit)}</span>
            <span>{percentUsed(billing.requests_used, billing.requests_limit)}%</span>
          </div>
          <Progress value={percentUsed(billing.requests_used, billing.requests_limit)} className="h-2 bg-white/10" />
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => !assignMutation.isPending && setDialogOpen(open)}>
        <DialogContent className="border-white/10 bg-card text-white">
          <DialogHeader>
            <DialogTitle>Изменить тариф</DialogTitle>
            <DialogDescription className="text-white/55">
              Использованные запросы не будут сброшены.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <PlanSummary
              label="Текущий тариф"
              name={billing.plan_name || "Нет тарифа"}
              limit={`${formatNumber(billing.requests_limit)} запросов`}
              price={null}
            />
            <ArrowRight className="h-4 w-4 text-white/35" />
            <PlanSummary
              label="Новый тариф"
              name={selectedPlan?.name || "Выберите тариф"}
              limit={selectedPlan ? `${formatNumber(selectedPlan.requests_limit)} запросов` : "—"}
              price={selectedPlan ? formatCurrencyRub(selectedPlan.price_rub) : null}
            />
          </div>

          <Select value={selectedPlanCode} onValueChange={setSelectedPlanCode}>
            <SelectTrigger className="border-white/10 bg-background text-white">
              <SelectValue placeholder={plansQuery.isLoading ? "Загрузка тарифов..." : "Выберите тариф"} />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-card text-white">
              {(plansQuery.data?.items || []).map((plan) => (
                <SelectItem key={plan.code} value={plan.code}>
                  {plan.name} · {formatNumber(plan.requests_limit)} запросов · {formatCurrencyRub(plan.price_rub)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={assignMutation.isPending}
              className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!selectedPlanCode || selectedPlanCode === billing.plan_code || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function PlanSummary({ label, name, limit, price }: { label: string; name: string; limit: string; price: string | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-background/45 p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{name}</div>
      <div className="mt-1 text-xs text-white/55">{limit}</div>
      {price ? <div className="mt-1 text-xs text-primary">{price}</div> : null}
    </div>
  );
}
