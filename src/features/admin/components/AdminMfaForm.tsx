import { useEffect, useRef, useState } from "react";
import { sendAdminMfa, pollAdminMfa, verifyAdminMfa, type AdminMfaResult, type AdminMfaState } from "@/api/admin";
import { ApiError } from "@/api/client";
import { getAuthContextKey, subscribeAuth } from "@/shared/utils/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type Challenge = { id: string; deadline: number };
const terminal = new Set<AdminMfaState>(["verified", "denied", "expired", "error"]);

export function AdminMfaForm({ phoneMasked, provisioned, onVerified }: {
  phoneMasked: string | null; provisioned: boolean; onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [phase, setPhase] = useState<AdminMfaState | "idle">("idle");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cooldown = useRef(0);
  const active = useRef(true);
  const epoch = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const verified = useRef(onVerified);
  verified.current = onVerified;

  function stop(state: AdminMfaState | "idle") {
    epoch.current += 1;
    pending.current?.abort(); pending.current = null;
    setChallenge(null); setCode(""); setBusy(false); setPhase(state);
  }
  useEffect(() => {
    active.current = true;
    const context = getAuthContextKey();
    const unsubscribe = subscribeAuth(() => {
      if (context !== getAuthContextKey()) {
        stop("idle"); setError("Сессия изменена. Войдите в аккаунт заново.");
      }
    });
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((cooldown.current - Date.now()) / 1000))), 500);
    return () => {
      active.current = false; epoch.current += 1; pending.current?.abort();
      pending.current = null; unsubscribe(); window.clearInterval(timer);
    };
  }, []);

  function accept(result: AdminMfaResult) {
    setError(""); setPhase(result.state);
    if (terminal.has(result.state)) {
      stop(result.state);
      if (result.state === "verified") verified.current();
    }
  }
  async function request(action: (signal: AbortSignal) => Promise<void>) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(true);
    const version = epoch.current, context = getAuthContextKey();
    // Verification can make three bounded provider calls (status/verify/status).
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      await action(controller.signal);
    } catch (err) {
      if (!active.current || version !== epoch.current || context !== getAuthContextKey()) return;
      if (err instanceof ApiError && [401, 403, 428].includes(err.status)) {
        stop("idle"); setError("Сессия недоступна. Войдите в аккаунт заново.");
      } else if (err instanceof ApiError && err.status === 400) {
        setCode(""); setError("Неверный SMS-код. Проверьте код и повторите ввод.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Слишком частые попытки. Подождите перед повторной проверкой.");
      } else if (!(err instanceof ApiError && err.status === 409)) {
        setError("Нет ответа от сервиса. Проверка повторится; при истечении срока начните заново.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; if (active.current) setBusy(false); }
    }
  }
  // Every async response is fenced against logout, unmount, expiry and resend.
  function fence() {
    const version = epoch.current, context = getAuthContextKey();
    return () => active.current && version === epoch.current && context === getAuthContextKey();
  }

  useEffect(() => {
    if (!challenge) return;
    let cancelled = false, timer: number;
    const current = fence();
    const expiry = window.setTimeout(() => { if (current()) stop("expired"); }, Math.max(0, challenge.deadline - Date.now()));
    async function poll() {
      if (cancelled || !current()) return;
      if (Date.now() >= challenge!.deadline) { stop("expired"); return; }
      await request(async signal => {
        const result = await pollAdminMfa(challenge!.id, signal);
        if (current() && !signal.aborted && Date.now() < challenge!.deadline) accept(result);
      });
      // Schedule after completion: no overlapping requests, including slow networks.
      if (!cancelled && current()) timer = window.setTimeout(poll, 4000);
    }
    timer = window.setTimeout(poll, 4000);
    return () => { cancelled = true; window.clearTimeout(timer); window.clearTimeout(expiry); };
  }, [challenge]);

  async function send() {
    stop("idle"); setError("");
    // A lost response may still have sent a request. Keep the resend cooldown.
    cooldown.current = Date.now() + 60000; setRemaining(60);
    const current = fence();
    await request(async signal => {
      const result = await sendAdminMfa(signal);
      if (!current() || signal.aborted) return;
      setCode(""); setPhase(result.state === "sms_required" ? "sms_required" : "waiting");
      setChallenge({id: result.challenge_id, deadline: Date.now() + Math.min(result.expires_in, 300) * 1000});
    });
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || phase !== "sms_required" || code.length !== 4) return;
    const current = fence();
    await request(async signal => {
      const result = await verifyAdminMfa(code, challenge.id, signal);
      if (current() && !signal.aborted && Date.now() < challenge.deadline) { setCode(""); accept(result); }
    });
  }
  return <form onSubmit={verify} className="space-y-4">
    <h1 className="text-xl font-semibold">Подтверждение входа в админ-панель</h1>
    {!provisioned ? <p>Мобильное подтверждение не настроено. Обратитесь к оператору проекта.</p> : <>
      {phoneMasked && <p>Телефон администратора: {phoneMasked}</p>}
      <p role="status">{phase === "waiting" || phase === "processing" ? "Ожидаем SIM-PUSH. Подтвердите вход на телефоне." :
        phase === "sms_required" ? "Введите четырёхзначный код из SMS." : phase === "denied" ? "Подтверждение отклонено. Можно начать заново." :
        phase === "expired" ? "Срок подтверждения истёк. Начните заново." : phase === "error" ? "Ошибка мобильной авторизации. Начните заново." :
        phase === "verified" ? "Вход подтверждён." : "Для входа требуется подтверждение Mobile ID."}</p>
      <Button type="button" onClick={send} disabled={busy || remaining > 0}>
        {remaining > 0 ? `Повторная попытка через ${remaining} сек.` : "Начать подтверждение"}
      </Button>
      {phase === "sms_required" && <>
        <label className="block" htmlFor="admin-mfa-code">Код из SMS</label>
        <Input id="admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={4}
          value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
        <Button type="submit" disabled={busy || code.length !== 4}>Подтвердить</Button>
      </>}
    </>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
