import Link from "next/link";
import { IntentList } from "@/components/intent-list";
import { getPrivateBalance } from "@/lib/umbra";
import { listPaymentIntents } from "@/lib/payment-intents";
import { formatAtomicAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [balance, intents] = await Promise.all([
    getPrivateBalance(),
    listPaymentIntents(5),
  ]);

  const paidCount = intents.filter((intent) => intent.status === "paid").length;
  const claimedCount = intents.filter(
    (intent) => intent.status === "claimed",
  ).length;

  return (
    <>
      <section className="page-header">
        <p className="eyebrow">Merchant operations</p>
        <h1>Settlement overview</h1>
        <p className="muted">
          Live private balances are still stubbed in step 1. The records below
          are real local payment requests backed by Prisma and SQLite, which
          gives Settlemark its first operational ledger for settlement flows.
        </p>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="eyebrow">Private balance</p>
          <strong>
            {formatAtomicAmount(balance.amountAtomic)} {balance.mint}
          </strong>
          <p className="muted">Placeholder until live Umbra balance wiring.</p>
        </article>

        <article className="stat-card">
          <p className="eyebrow">Open records</p>
          <strong>{intents.length}</strong>
          <p className="muted">Most recent payment requests in the local ledger.</p>
        </article>

        <article className="stat-card">
          <p className="eyebrow">Paid / claimed</p>
          <strong>
            {paidCount} / {claimedCount}
          </strong>
          <p className="muted">Manual lifecycle states for the foundation phase.</p>
        </article>
      </section>

      <section className="page-header">
        <div className="cta-row">
          <Link href="/get-paid" className="primary-button">
            Create payment request
          </Link>
          <Link href="/activity" className="secondary-button">
            View all activity
          </Link>
        </div>
      </section>

      <IntentList
        intents={intents}
        emptyTitle="No payment requests yet"
        emptyBody="Create your first payment request from the Get Paid page."
      />
    </>
  );
}
