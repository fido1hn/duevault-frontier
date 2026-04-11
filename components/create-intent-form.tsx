"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SerializedPaymentIntent } from "@/lib/payment-intents";

type CreateIntentResponse = {
  intent: SerializedPaymentIntent;
};

type CreateIntentErrorResponse = {
  error?: string;
};

export function CreateIntentForm() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [amountAtomic, setAmountAtomic] = useState("1000000");
  const [note, setNote] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantWallet: publicKey?.toBase58() ?? "demo-merchant-wallet",
          amountAtomic,
          mint: "USDC",
          note,
          customerLabel,
          expiresAt: expiresAt || null,
        }),
      });

      const payload = (await response.json()) as
        | CreateIntentResponse
        | CreateIntentErrorResponse;

      if (!response.ok) {
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to create payment request.";
        throw new Error(message);
      }

      if (!("intent" in payload)) {
        throw new Error("Unable to create payment request.");
      }

      router.push(`/pay/${payload.intent.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create payment request.",
      );
    } finally {
      setIsSubmitting(false);
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
        <code>{publicKey?.toBase58() ?? "demo-merchant-wallet"}</code>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create payment request"}
      </button>
    </form>
  );
}
