import { CreditCard } from "lucide-react";

import type { AdminRecentPaymentItem } from "@/api/admin";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { formatCurrencyRub, formatDateTime, statusBadgeClass } from "../adminUtils";

type AdminRecentPaymentsProps = {
  payments: AdminRecentPaymentItem[];
};

export function AdminRecentPayments({ payments }: AdminRecentPaymentsProps) {
  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <CreditCard className="h-4 w-4 text-primary" />
          Последние платежи
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-background/45 p-4 text-sm text-white/45">Платежей пока нет</div>
        ) : (
          <div className="space-y-2">
            {payments.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-background/45 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{item.provider_order_id}</div>
                    <div className="mt-1 text-xs text-white/45">
                      {item.plan_code} · {formatDateTime(item.created_at)}
                    </div>
                    {item.provider_payment_id ? (
                      <div className="mt-1 truncate text-[11px] text-white/35">payment: {item.provider_payment_id}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-white">{formatCurrencyRub(item.amount_rub)}</div>
                    <Badge className={`mt-1 border ${statusBadgeClass(item.status)}`}>{item.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
