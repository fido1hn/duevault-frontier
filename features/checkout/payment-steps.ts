import type { CustomerUmbraPaymentStepId } from "@/features/checkout/umbra-payment";

export type PaymentStep = {
  id: CustomerUmbraPaymentStepId;
  label: string;
};

export const PAYMENT_STEPS: PaymentStep[] = [
  { id: "wallet", label: "Connect wallet" },
  { id: "checking", label: "Verify merchant" },
  { id: "customer_registration", label: "Set up account" },
  { id: "preparing_payment", label: "Prepare payment" },
  { id: "create_utxo", label: "Submit payment" },
  { id: "saving", label: "Confirm" },
  { id: "complete", label: "Done" },
];
