"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { useCreatePaymentIntentMutation } from "@/features/payment-intents/queries";

export function CreateIntentForm() {
  const router = useRouter();
  const createPaymentIntent = useCreatePaymentIntentMutation();
  const { profile } = useMerchantProfile();
  const [amountAtomic, setAmountAtomic] = useState("1000000");
  const [note, setNote] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = createPaymentIntent.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const intent = await createPaymentIntent.mutateAsync({
        amountAtomic,
        mint: "USDC",
        note,
        customerLabel,
        expiresAt: expiresAt || null,
      });

      router.push(`/pay/${intent.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create payment request.",
      );
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="section-copy">
        <p className="eyebrow">Create a payment request</p>
        <h2>Set up a private settlement request</h2>
        <p className="muted">
          Step 1 stores the off-chain payment record locally. Live Umbra
          settlement is wired in a later step.
        </p>
      </div>

      <label className="field">
        <span>Amount in atomic units</span>
        <input
          name="amountAtomic"
          value={amountAtomic}
          onChange={(event) => setAmountAtomic(event.target.value)}
          placeholder="1000000"
          inputMode="numeric"
          required
        />
      </label>

      <label className="field">
        <span>Mint</span>
        <input value="USDC" disabled readOnly />
      </label>

      <label className="field">
        <span>Note</span>
        <input
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="April advisory retainer"
        />
      </label>

      <label className="field">
        <span>Customer label</span>
        <input
          name="customerLabel"
          value={customerLabel}
          onChange={(event) => setCustomerLabel(event.target.value)}
          placeholder="Northwind Labs"
        />
      </label>

      <label className="field">
        <span>Expiry</span>
        <input
          name="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
        />
      </label>

      <div className="merchant-hint">
        <span>Receiving wallet</span>
        <code>{profile.walletAddress}</code>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create payment request"}
      </button>
    </form>
  );
}
