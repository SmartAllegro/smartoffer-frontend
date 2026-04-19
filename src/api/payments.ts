import { apiFetch } from "./client";

export type TBankInitPaymentIn = {
  plan_code: string;
  preferred_method?: "card" | "sbp" | null;
};

export type TBankInitPaymentOut = {
  order_id: number;
  provider_order_id: string;
  amount_rub: number;
  plan_code: string;
  status: string;

  mode: "redirect" | "sbp_qr";

  payment_url?: string | null;

  provider_payment_id?: string | null;
  sbp_qr_svg?: string | null;
  sbp_qr_payload?: string | null;
  expires_at?: string | null;
};

export type PaymentOrderItemOut = {
  id: number;
  provider: string;
  plan_code: string;
  preferred_method?: string | null;
  amount_rub: number;
  status: string;
  provider_order_id: string;
  provider_payment_id?: string | null;
  provider_status?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function initTbankPayment(
  payload: TBankInitPaymentIn
): Promise<TBankInitPaymentOut> {
  return apiFetch<TBankInitPaymentOut>("/payments/tbank/init", {
    method: "POST",
    json: payload,
  });
}

export async function fetchMyPayment(orderId: number): Promise<PaymentOrderItemOut> {
  return apiFetch<PaymentOrderItemOut>(`/payments/${orderId}`, {
    method: "GET",
  });
}