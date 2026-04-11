"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  PaymentIntentStatus,
  SerializedPaymentIntent,
} from "@/lib/payment-intents";

type PaymentIntentActionsProps = {
  intent: SerializedPaymentIntent;
};

export function PaymentIntentActions({
  intent,
}: PaymentIntentActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function updateStatus(status: PaymentIntentStatus) {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/payment-intents/${intent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update payment request.");
      }

      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update payment request.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card action-card">
      <div className="section-copy">
        <p className="eyebrow">Settlement controls</p>
        <h2>Simulate the request lifecycle</h2>
        <p className="muted">
          Step 1 uses manual status updates instead of live Umbra settlement.
        </p>
      </div>

      <div className="action-row">
        <button
          className="secondary-button"
          type="button"
          disabled={isPending || intent.status !== "active"}
          onClick={() => updateStatus("paid")}
        >
          Mark paid
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={isPending || intent.status !== "paid"}
          onClick={() => updateStatus("claimed")}
        >
          Mark claimed
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={isPending || intent.status === "expired"}
          onClick={() => updateStatus("expired")}
        >
          Expire request
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
