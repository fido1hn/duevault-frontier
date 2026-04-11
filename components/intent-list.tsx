import Link from "next/link";
import type { SerializedPaymentIntent } from "@/lib/payment-intents";
import { formatAtomicAmount, formatDateTime } from "@/lib/format";

type IntentListProps = {
  intents: SerializedPaymentIntent[];
  emptyTitle: string;
  emptyBody: string;
};

export function IntentList({
  intents,
  emptyTitle,
  emptyBody,
}: IntentListProps) {
  if (intents.length === 0) {
    return (
      <div className="card empty-card">
        <h2>{emptyTitle}</h2>
        <p className="muted">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="intent-list">
      {intents.map((intent) => (
        <article className="card intent-card" key={intent.id}>
          <div className="intent-header">
            <div>
              <p className="eyebrow">{intent.mint}</p>
              <h2>{formatAtomicAmount(intent.amountAtomic)} {intent.mint}</h2>
            </div>
            <span className={`status-pill status-${intent.status}`}>
              {intent.status}
            </span>
          </div>

          <dl className="intent-meta">
            <div>
              <dt>Note</dt>
              <dd>{intent.note || "No note"}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{intent.customerLabel || "Not set"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(intent.createdAt)}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{formatDateTime(intent.expiresAt)}</dd>
            </div>
          </dl>

          <div className="intent-links">
            <Link href={`/pay/${intent.id}`} className="text-link">
              Open checkout
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
