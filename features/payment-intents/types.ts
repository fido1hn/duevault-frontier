import type {
  PAYMENT_INTENT_STATUSES,
  SUPPORTED_MINTS,
} from "@/features/payment-intents/constants";

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];
export type SupportedMint = (typeof SUPPORTED_MINTS)[number];

export type SerializedPaymentIntent = {
  id: string;
  merchantProfileId: string;
  merchantName: string;
  merchantWallet: string;
  amountAtomic: string;
  mint: SupportedMint;
  status: PaymentIntentStatus;
  note: string;
  customerLabel: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentIntentInput = {
  amountAtomic: string;
  mint?: SupportedMint;
  note?: string;
  customerLabel?: string | null;
  expiresAt?: string | null;
};

export type UpdatePaymentIntentInput = {
  status?: PaymentIntentStatus;
  note?: string;
  customerLabel?: string | null;
  expiresAt?: string | null;
};

export type UpdatePaymentIntentRecordInput = {
  status?: PaymentIntentStatus;
  note?: string;
  customerLabel?: string | null;
  expiresAt?: Date | null;
};
