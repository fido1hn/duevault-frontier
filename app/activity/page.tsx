import { IntentList } from "@/components/intent-list";
import { listPaymentIntents } from "@/lib/payment-intents";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const intents = await listPaymentIntents();

  return (
    <>
      <section className="page-header">
        <p className="eyebrow">Activity</p>
        <h1>Settlement records</h1>
        <p className="muted">
          This operational ledger is backed by the local SQLite database and
          updates through the payment-request API routes.
        </p>
      </section>

      <IntentList
        intents={intents}
        emptyTitle="No activity yet"
        emptyBody="Payment requests will show up here once you create them."
      />
    </>
  );
}
