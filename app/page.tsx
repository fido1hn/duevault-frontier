import Link from "next/link";
import {
  BRAND_NAME,
  BRAND_POSITIONING,
  BRAND_TAGLINES,
} from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <section className="welcome-hero">
        <div className="card welcome-panel hero-panel">
          <div className="page-header">
            <p className="eyebrow">{BRAND_POSITIONING.eyebrow}</p>
            <h1>{BRAND_POSITIONING.heroTitle}</h1>
            <p className="muted">{BRAND_POSITIONING.heroDescription}</p>
          </div>

          <div className="cta-row">
            <Link href="/dashboard" className="primary-button">
              Open dashboard
            </Link>
            <Link href="/get-paid" className="secondary-button">
              Create payment request
            </Link>
          </div>

          <div className="brand-strip">
            {BRAND_TAGLINES.map((tagline) => (
              <span key={tagline} className="brand-pill">
                {tagline}
              </span>
            ))}
          </div>
        </div>

        <aside className="card quick-links foundation-panel">
          <div className="section-copy">
            <p className="eyebrow">Step 1 foundation</p>
            <h2>{BRAND_POSITIONING.foundationTitle}</h2>
            <p className="muted">{BRAND_POSITIONING.foundationDescription}</p>
          </div>

          <ul className="feature-list">
            <li>Next.js App Router shell for the merchant flow</li>
            <li>Solana wallet provider with connect and disconnect controls</li>
            <li>Prisma + SQLite payment-request records</li>
            <li>Checkout, dashboard, and activity routes wired to local data</li>
            <li>Umbra kept behind a dedicated service boundary</li>
          </ul>
        </aside>
      </section>

      <section className="card-grid home-pillars">
        {BRAND_POSITIONING.homepageDirection.map((pillar) => (
          <article key={pillar.title} className="card pillar-card">
            <p className="eyebrow">{BRAND_NAME}</p>
            <h2>{pillar.title}</h2>
            <p className="muted">{pillar.body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
