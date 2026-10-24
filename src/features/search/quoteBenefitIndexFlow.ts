import { getQuoteBenefitIndex, type BenefitIndexResponse } from "@/api/quoteBenefitIndex";

export function getBenefitIndexOnce(
  jobId: number,
  comparisonId: number,
  requests: Map<string, Promise<BenefitIndexResponse>>
): Promise<BenefitIndexResponse> {
  const key = `${jobId}:${comparisonId}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = getQuoteBenefitIndex(jobId);
  requests.set(key, request);
  return request;
}
