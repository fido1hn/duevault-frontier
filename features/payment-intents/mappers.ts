import type { PaymentIntentRecord } from "@/features/payment-intents/repository";
import type { SerializedPaymentIntent } from "@/features/payment-intents/types";
import { assertPaymentIntentStatus } from "@/features/payment-intents/validators";

export function serializePaymentIntent(
  intent: PaymentIntentRecord,
): SerializedPaymentIntent {
  assertPaymentIntentStatus(intent.status);

  return {
    id: intent.id,
    merchantProfileId: intent.merchantProfileId,
    merchantWallet: intent.merchantProfile.primaryWallet.address,
    amountAtomic: intent.amountAtomic,
    mint: intent.mint,
    status: intent.status,
    note: intent.note,
    customerLabel: intent.customerLabel,
    expiresAt: intent.expiresAt?.toISOString() ?? null,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
  };
}
