import { notFound } from "next/navigation";
import { PaymentIntentActions } from "@/components/payment-intent-actions";
import { formatAtomicAmount, formatDateTime } from "@/lib/format";
import { getPaymentIntentById } from "@/lib/payment-intents";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{
    intentId: string;
  }>;
};

export default async function PayIntentPage({ params }: PayPageProps) {
  const { intentId } = await params;
  const intent = await getPaymentIntentById(intentId);

  if (!intent) {
    notFound();
  }

  return (
    <>
      <section className="page-header">
        <p className="eyebrow">Public checkout</p>
        <h1>DueVault checkout shell</h1>
        <p className="muted">
          This page resolves a real local payment request by ID. Live payment
          submission is intentionally deferred until the Umbra settlement step.
        </p>
      </section>

      <section className="detail-grid">
        <article className="card detail-card">
          <div className="section-copy">
            <p className="eyebrow">{intent.mint}</p>
            <h2>{formatAtomicAmount(intent.amountAtomic)} {intent.mint}</h2>
            <p className="muted">{intent.note || "No payment note added."}</p>
          </div>

          <div className="detail-stack">
            <div className="inline-kv">
              <span>Status</span>
              <span className={`status-pill status-${intent.status}`}>
                {intent.status}
              </span>
            </div>
            <div className="inline-kv">
              <span>Merchant</span>
              <code>{intent.merchantWallet}</code>
            </div>
            <div className="inline-kv">
              <span>Customer label</span>
              <strong>{intent.customerLabel || "Not set"}</strong>
            </div>
            <div className="inline-kv">
              <span>Expires</span>
              <strong>{formatDateTime(intent.expiresAt)}</strong>
            </div>
            <div className="inline-kv">
              <span>Request ID</span>
              <code>{intent.id}</code>
            </div>
          </div>
        </article>

        <PaymentIntentActions intent={intent} />
      </section>
    </>
  );
}
