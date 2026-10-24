import { getAuthContextKey } from "@/shared/utils/auth";
import { createResultQuoteAnalysis, getResultQuoteAnalysis, type QuoteAnalysisResponse } from "@/api/quoteAnalysis";
import type { SupplierInnUpdate } from "@/api/quoteAnalysis";
import type { Supplier } from "@/shared/types/rfq";

export function syncSupplierQuoteInn(suppliers: Supplier[], resultId: number, update: SupplierInnUpdate): Supplier[] {
  if (update.status === "conflict") return suppliers;
  let changed = false;
  const next = suppliers.map(s => {
    if (s.backend_result_id !== resultId || s.supplier_inn === update.current_inn) return s;
    changed = true;
    return { ...s, supplier_inn: update.current_inn };
  });
  return changed ? next : suppliers;
}

// Shared across StrictMode mounts. Keep only live requests, never completed data.
const inFlight = new Map<string, { revision: string; task: Promise<QuoteAnalysisResponse> }>();
const waiting: Array<() => void> = [];
let activePosts = 0;
async function limitedPost(resultId: number, actor: number) {
  if (activePosts >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
  else activePosts += 1;
  try {
    if (getAuthContextKey() !== actor) throw new Error("quote_ai_request_superseded");
    return await createResultQuoteAnalysis(resultId);
  }
  finally {
    const next = waiting.shift();
    if (next) next(); // Hand off the occupied slot directly.
    else activePosts -= 1;
  }
}

export function analyzeResultQuote(resultId: number, retry = false, onAnalyzing?: () => void, revision = ""): Promise<QuoteAnalysisResponse> {
  const actor = getAuthContextKey();
  const key = `${actor}:${resultId}`;
  const existing = inFlight.get(key);
  if (existing?.revision === revision) return existing.task;
  const run = async () => {
    if (getAuthContextKey() !== actor) throw new Error("quote_ai_request_superseded");
    if (!retry) {
      const cached = await getResultQuoteAnalysis(resultId);
      if (cached.ok === true) return cached;
      if (cached.state === "no_quote") return cached;
      if (cached.state !== "cache_missing_or_stale") return cached;
    }
    onAnalyzing?.();
    return limitedPost(resultId, actor);
  };
  // An edited offer must recheck the backend after the previous revision settles.
  const task = existing ? existing.task.catch(() => undefined).then(run) : run();
  inFlight.set(key, { revision, task });
  void task.finally(() => { if (inFlight.get(key)?.task === task) inFlight.delete(key); }).catch(() => {});
  return task;
}
