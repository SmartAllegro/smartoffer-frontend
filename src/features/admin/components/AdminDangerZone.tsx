import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { restoreAdminUser, softDeleteAdminUser, type AdminUserDetailResponse } from "@/api/admin";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useToast } from "@/shared/hooks/use-toast";

import { apiErrorMessage, formatDateTime } from "../adminUtils";

type AdminDangerZoneProps = {
  user: AdminUserDetailResponse;
};

export function AdminDangerZone({ user }: AdminDangerZoneProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "user", user.profile.id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteAdminUser(user.profile.id, confirmEmail),
    onSuccess: () => {
      toast({ title: "Аккаунт отключён" });
      setDeleteOpen(false);
      setConfirmEmail("");
      invalidate();
    },
    onError: (error) => {
      toast({
        title: "Не удалось удалить аккаунт",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreAdminUser(user.profile.id),
    onSuccess: () => {
      toast({ title: "Аккаунт восстановлен" });
      setRestoreOpen(false);
      invalidate();
    },
    onError: (error) => {
      toast({
        title: "Не удалось восстановить аккаунт",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const emailMatches = confirmEmail.trim().toLowerCase() === user.profile.email.trim().toLowerCase();

  return (
    <Card className="border-red-400/20 bg-red-500/[0.05]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-red-200">Управление аккаунтом</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {user.profile.is_deleted ? (
          <>
            {user.profile.purge_after ? (
              <div className="text-sm text-white/55">
                Запланированное окончательное удаление: {formatDateTime(user.profile.purge_after)}
              </div>
            ) : null}
            <Button onClick={() => setRestoreOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <RotateCcw className="h-4 w-4" />
              Восстановить аккаунт
            </Button>
          </>
        ) : (
          <>
            <div className="whitespace-pre-line text-sm leading-6 text-red-100/80">
              {`Аккаунт будет отключён.
Данные пользователя не удаляются немедленно,
и аккаунт можно восстановить до окончательного удаления.`}
            </div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Удалить аккаунт
            </Button>
          </>
        )}
      </CardContent>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleteMutation.isPending && setDeleteOpen(open)}>
        <AlertDialogContent className="border-white/10 bg-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аккаунт</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-white/55">
              {`Аккаунт будет отключён.
Данные пользователя не удаляются немедленно,
и аккаунт можно восстановить до окончательного удаления.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div>
            <label className="text-xs font-semibold text-white/55">Введите email пользователя</label>
            <Input
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder={user.profile.email}
              className="mt-2 border-white/10 bg-background text-white"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Отмена
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={!emailMatches || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Удаляем..." : "Удалить аккаунт"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={(open) => !restoreMutation.isPending && setRestoreOpen(open)}>
        <AlertDialogContent className="border-white/10 bg-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить аккаунт пользователя?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              Пользователь снова сможет использовать SmartOffer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Отмена
            </AlertDialogCancel>
            <Button onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? "Восстанавливаем..." : "Восстановить аккаунт"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
