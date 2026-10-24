import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

type AdminAccessStateProps = {
  kind: "loading" | "unauthorized" | "forbidden" | "error";
};

export function AdminAccessState({ kind }: AdminAccessStateProps) {
  if (kind === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <Skeleton className="h-12 w-12 rounded-xl bg-white/10" />
          <Skeleton className="mt-6 h-7 w-64 bg-white/10" />
          <Skeleton className="mt-3 h-4 w-full bg-white/10" />
          <Skeleton className="mt-2 h-4 w-4/5 bg-white/10" />
        </div>
      </div>
    );
  }

  const isForbidden = kind === "forbidden";
  const title = isForbidden ? "Нет доступа" : kind === "unauthorized" ? "Требуется авторизация" : "Не удалось открыть панель";
  const description = isForbidden
    ? "У вашей учётной записи нет прав администратора."
    : kind === "unauthorized"
      ? "Для доступа к панели администратора войдите в SmartOffer."
      : "Не удалось выполнить операцию. Повторите попытку.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-card text-primary">
          {isForbidden ? <ShieldAlert className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>

        <Button asChild className="mt-6 w-fit">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Вернуться в SmartOffer
          </Link>
        </Button>
      </main>
    </div>
  );
}
