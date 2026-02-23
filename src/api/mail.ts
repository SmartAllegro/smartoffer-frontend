// src/api/mail.ts
import { apiFetch } from "./client";
import type { Supplier } from "@/shared/types/rfq";
import { getHistoryDetail } from "./history";

type EmailSendOut = {
  email_job_ids: number[];
  queued: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Отправка КП:
 * - search_result_ids берём из supplier.backend_result_id
 * - manual_emails берём из supplier.contact для manual записей
 *
 * ВАЖНО (фикс):
 * Бэкенд отправляет письма в background, поэтому /history/{job_id} может
 * обновиться не мгновенно. Чтобы UI не "врал", ставим optimistic status=sent
 * всем выбранным сразу, а polling используем, чтобы проставить error при failed.
 */
export async function sendRFQ(
  searchJobId: number,
  subject: string,
  body: string,
  suppliers: Supplier[]
): Promise<
  Map<
    string,
    { status: Supplier["status"]; error_message?: string; error_details?: string; error_code?: string }
  >
> {
  const selected = suppliers.filter((s) => s.selected);

  const search_result_ids = selected
    .map((s) => s.backend_result_id)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const manual_emails = selected
    .filter((s) => !s.backend_result_id)
    .map((s) => (s.contact || "").trim())
    .filter((e) => e.includes("@"));

  // 1) ставим в очередь на бэке
  await apiFetch<EmailSendOut>("/email/send", {
    method: "POST",
    json: {
      search_job_id: searchJobId,
      search_result_ids: search_result_ids.length ? search_result_ids : null,
      manual_emails: manual_emails.length ? manual_emails : null,
      subject,
      body,
    },
  });

  // 2) optimistic: считаем, что для всех выбранных поставили в отправку
  // и UI должен показать "Отправлено" сразу, иначе будет эффект "отправилось, но не видно".
  const optimistic = new Map<
    string,
    { status: Supplier["status"]; error_message?: string; error_details?: string; error_code?: string }
  >();

  for (const s of selected) {
    optimistic.set(s.id, { status: "sent" });
  }

  // 3) пробуем подтянуть статусы из /history/{job_id}
  // (письма отправляются в background, поэтому делаем polling)
  for (let i = 0; i < 6; i++) {
    await sleep(800);

    try {
      const detail = await getHistoryDetail(searchJobId);

      // result_id -> worst status
      const resultStatus = new Map<
        number,
        { status: Supplier["status"]; error_message?: string; error_details?: string; error_code?: string }
      >();

      for (const r of detail.results || []) {
        const statuses = r.email_statuses || [];
        if (!statuses.length) continue;

        const failed = statuses.find((x: any) => x?.status === "failed");
        const sent = statuses.find((x: any) => x?.status === "sent");

        if (failed) {
          const msg = failed?.last_error || "Ошибка отправки";
          resultStatus.set(r.id, {
            status: "error",
            error_message: msg,
            error_details: failed?.last_error ? String(failed.last_error) : undefined,
          });
        } else if (sent) {
          resultStatus.set(r.id, { status: "sent" });
        }
      }

      // применяем уточнение статусов: если по result_id видим failed — перетираем optimistic на error
      let anyOverride = false;
      for (const s of selected) {
        if (!s.backend_result_id) continue; // manual: на бэке может не быть result_id

        const st = resultStatus.get(s.backend_result_id);
        if (st) {
          optimistic.set(s.id, st);
          anyOverride = true;
        }
      }

      // Если что-то уточнили — можно вернуть уже улучшенную картину.
      // Если ещё ничего не появилось — продолжаем polling, optimistic уже корректен для UI.
      if (anyOverride) return optimistic;
    } catch {
      // временно не отдал history — оставляем optimistic и пытаемся ещё
    }
  }

  // 4) fallback: даже если history не успел обновиться — UI должен показать отправку
  return optimistic;
}