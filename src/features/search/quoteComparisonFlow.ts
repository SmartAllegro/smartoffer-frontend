import { getAuthContextKey } from "@/shared/utils/auth";
import { createQuoteComparison, getQuoteComparison, type QuoteComparisonResponse } from "@/api/quoteComparison";

type Flight = { revision: string; task: Promise<QuoteComparisonResponse> };
const inFlight = new Map<string, Flight>();
export function analyzeQuoteComparison(jobId: number, retry = false, revision = ""): Promise<QuoteComparisonResponse> {
  const actor = getAuthContextKey();
  const key = `${actor}:${jobId}`;
  const existing = inFlight.get(key);
  if (existing?.revision === revision) return existing.task;
  const run = async () => {
    if (!retry) {
      const cached = await getQuoteComparison(jobId);
      if (cached.ok === true || cached.state === "not_enough_quotes") return cached;
      if (cached.state !== "cache_missing_or_stale") return cached;
    }
    return createQuoteComparison(jobId);
  };
  const task = existing ? existing.task.catch(() => undefined).then(run) : run();
  inFlight.set(key, { revision, task });
  void task.finally(() => { if (inFlight.get(key)?.task === task) inFlight.delete(key); }).catch(() => {});
  return task;
}
