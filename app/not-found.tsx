import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card empty-card">
      <p className="eyebrow">Not found</p>
      <h1>This payment request could not be found.</h1>
      <p className="muted">
        The ID may be wrong, or the local settlement store has not created that
        record yet.
      </p>
      <div className="cta-row">
        <Link href="/get-paid" className="primary-button">
          Create a payment request
        </Link>
        <Link href="/dashboard" className="secondary-button">
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}
