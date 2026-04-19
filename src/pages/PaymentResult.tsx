import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";

export default function PaymentResult() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const status = (params.get("status") || "").toLowerCase();

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-500" />
            )}
            <h1 className="text-2xl font-semibold">
              {isSuccess ? "Оплата выполнена" : "Оплата не завершена"}
            </h1>
          </div>

          <p className="mt-4 text-muted-foreground leading-relaxed">
            {isSuccess
              ? "Мы получили возврат с платёжной формы. Тариф активируется после подтверждения оплаты банком. Обычно это занимает считанные секунды."
              : "Платёж не был завершён или был отменён. Вы можете вернуться и повторить попытку."}
          </p>

          <div className="mt-8">
            <Button asChild>
              <Link to="/">Вернуться на главную</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}