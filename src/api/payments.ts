import { apiFetch } from "./client";

export type TBankInitPaymentIn = {
  plan_code: string;
  preferred_method?: "card" | "sbp" | null;
};

export type TBankInitPaymentOut = {
  order_id: number;
  provider_order_id: string;
  payment_url: string;
  amount_rub: number;
  plan_code: string;
  status: string;
};

export async function initTbankPayment(
  payload: TBankInitPaymentIn
): Promise<TBankInitPaymentOut> {
  return apiFetch<TBankInitPaymentOut>("/payments/tbank/init", {
    method: "POST",
    json: payload,
  });
}