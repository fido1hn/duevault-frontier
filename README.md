# DueVault

> Bill in stablecoins. Without the public ledger.

**Live app:** https://duevault.xyz

Stack: Next.js 16 · TypeScript · Prisma · Supabase · Privy · Umbra SDK · Solana mainnet.

## Hackathon summary

DueVault is private stablecoin receivables software for Solana businesses. It turns Umbra's privacy primitives into a usable billing product: merchants create USDC invoices, customers pay through Umbra, merchants claim into encrypted balances, and auditors can review only the verified invoice/payment evidence a merchant explicitly grants.

The live app runs on Solana **mainnet** with **USDC**. Use tiny amounts when testing production flows.

## What it does

- Merchants sign in with Privy (email or Solana wallet) and complete an Umbra registration tied to their primary Solana wallet.
- Create invoice-style payment requests that resolve to a public, shareable checkout URL.
- Customers pay through Umbra's stealth pool from the public checkout. The server verifies the on-chain deposit transaction (instruction discriminator, accounts, token-balance deltas, event log) **and** the matching proof-account transaction before marking a payment confirmed.
- Merchants run a two-step **Scan → Claim** to settle confirmed payments into their Umbra balance, with retry-aware UI for failed claim attempts.
- Merchants issue signature-scoped compliance grants by selecting invoices or date ranges. Under the hood, DueVault freezes the exact confirmed Umbra payment signatures in the grant.
- Auditors open a gated portal, connect the grant-recipient Solana wallet, prove they have an Umbra X25519 account, and review only the verified invoice/payment evidence the merchant granted.

## How DueVault uses Umbra SDK

- **Merchant setup:** checks and creates Umbra accounts with confidential, X25519, and anonymous usage enabled.
- **Private checkout:** creates receiver-claimable Umbra UTXOs for invoice payments.
- **Payment verification:** verifies Umbra deposit and proof-account transactions before trusting a checkout submission.
- **Settlement:** scans claimable UTXOs and claims matched invoice payments into the merchant's encrypted Umbra balance.
- **Private wallet actions:** reads encrypted balances and supports withdrawals from encrypted to public balance.
- **Compliance grants:** issues and revokes Umbra X25519 grants, then scopes DueVault evidence access to selected confirmed payment signatures.

See [docs/umbra-sdk-product-flows.md](docs/umbra-sdk-product-flows.md) for the full product-to-SDK map.

## Why DueVault

Stablecoin receivables have a sharp privacy problem: public Solana payments can expose customers, invoice size, revenue timing, and treasury relationships. Stripe-style tools feel familiar, but they are custodial and traditional-rails first. DueVault aims for the middle path: self-custodial stablecoin settlement with business-grade records and merchant-controlled selective disclosure.

| Need | DueVault | Stripe | Request Network | Raw Solana Pay |
|---|---|---|---|---|
| Stablecoin-native settlement | Yes, Solana USDC through Umbra | Limited / offchain abstraction | Yes | Yes |
| Payment privacy from public observers | Umbra stealth settlement | Private ledger, custodial | Depends on payment rail | No, wallet metadata is public |
| Invoice and receivables workflow | Built around merchant invoices | Mature | Built around requests | Manual / external |
| Auditor disclosure | Wallet-gated, signature-scoped evidence grants | Platform reports | Not DueVault-style Umbra evidence | Manual screenshots / exports |
| Merchant custody posture | Self-custodial | Custodial | Varies | Self-custodial |

## Try it in production

Visit https://duevault.xyz, sign in with email or Solana wallet, complete merchant onboarding, and create an invoice. The public checkout link is shareable. After a confirmed Umbra payment, the settlement page can scan and claim into the merchant's encrypted balance, and the compliance page can issue an auditor grant scoped to selected invoice/payment evidence.

> Production runs on Solana **mainnet** with **USDC**. Real funds — use test amounts.

## Run it locally

### Prerequisites

You need all four before starting:

- **Docker Desktop** (running) — Supabase's local stack runs in containers.
- **Supabase CLI** — `brew install supabase/tap/supabase` (or see [Supabase CLI install](https://supabase.com/docs/guides/local-development/cli/getting-started)).
- **Bun** ≥ 1.3.9 — `curl -fsSL https://bun.sh/install | bash`.
- A **Privy app** (free tier) for `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` ([Privy dashboard](https://dashboard.privy.io)).

### Setup — exact sequence

```bash
# 1. Install deps
bun install

# 2. Make sure Docker Desktop is running.

# 3. Start the local Supabase stack (Postgres on :54322, Studio on :54323)
supabase start

# 4. Configure env. Copy the example then edit .env.local.
cp .env.example .env.local
```

In `.env.local`, set:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_PRIVY_APP_ID=...   # from your Privy dashboard
PRIVY_APP_SECRET=...           # from your Privy dashboard
```

Then push migrations and run the app:

```bash
# 5. Push Prisma migrations into the local DB
bun run db:migrate

# 6. Run the app
bun run dev
```

Open http://localhost:3000.

> **Mainnet-only:** local and production Umbra flows both use Solana mainnet USDC. Full private-payment tests use real funds, so keep invoice amounts tiny.

### Tests

```bash
bun run test
```

The [tests/](tests/) directory covers the security-critical surface: Umbra payment verification, save validation, three-layer rate-limit policy, claim persistence and settlement, public payment-status mapping, auditor grant scoping, revocation, and runtime config.

## Production environment

- Deployed on Vercel; domain **duevault.xyz**.
- Postgres: a separate Supabase cloud project (not the local stack).
- Rate limiting: Vercel KV / Upstash REST (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). The public Umbra-payment endpoint **fails closed** in production if these are unset — see [features/checkout/umbra-payment-rate-limit-policy.ts:108-119](features/checkout/umbra-payment-rate-limit-policy.ts#L108-L119).
- Umbra: mainnet only, USDC ([lib/umbra/config.ts](lib/umbra/config.ts)).

## Reviewer's map — where to look first

If you have ten minutes, these are the files that matter:

| Looking for | File |
|---|---|
| Auth boundary — Privy verify, wallet sync, IDOR scoping, in-memory cache | [server/auth.ts](server/auth.ts) |
| On-chain Umbra deposit verification — discriminator, accounts, token-balance delta, event-log decode | [features/checkout/umbra-payment-verification.ts](features/checkout/umbra-payment-verification.ts) |
| Public payment submission endpoint — body cap, validation, rate limit, idempotency, race guards | [app/api/checkout/[publicId]/umbra-payment/route.ts](app/api/checkout/%5BpublicId%5D/umbra-payment/route.ts) |
| Three-layer rate limiter (IP / IP+publicId / publicId) | [features/checkout/umbra-payment-rate-limit-policy.ts](features/checkout/umbra-payment-rate-limit-policy.ts) + [server/umbra-payment-rate-limit.ts](server/umbra-payment-rate-limit.ts) |
| Confirm flow — RPC re-verification + invoice transition | [app/api/invoices/[invoiceId]/umbra-payment/confirm/route.ts](app/api/invoices/%5BinvoiceId%5D/umbra-payment/confirm/route.ts) |
| Claim flow — Scan → Claim two-step + retry tracking | [app/api/invoices/[invoiceId]/umbra-payment/claim/route.ts](app/api/invoices/%5BinvoiceId%5D/umbra-payment/claim/route.ts), [claim-attempt/route.ts](app/api/invoices/%5BinvoiceId%5D/umbra-payment/claim-attempt/route.ts), [features/invoices/claim-settlement.ts](features/invoices/claim-settlement.ts), [features/merchant-profiles/umbra-settlement-claim.ts](features/merchant-profiles/umbra-settlement-claim.ts) |
| Auditor portal — wallet gate, X25519 setup, scoped evidence workspace | [components/auditor-portal.tsx](components/auditor-portal.tsx), [app/api/audit/evidence-index/route.ts](app/api/audit/evidence-index/route.ts), [app/api/audit/decrypt-evidence/route.ts](app/api/audit/decrypt-evidence/route.ts) |
| Privacy — invoice id is hashed (`sha256("duevault:invoice:" + publicId)`) before going on-chain | [features/checkout/service.ts:159-163](features/checkout/service.ts#L159-L163) |
| Database schema | [prisma/schema.prisma](prisma/schema.prisma) |
| Security headers (CSP TODO is acknowledged inline) | [next.config.ts](next.config.ts) |

## Architecture

- **[app/](app/)** — Next.js App Router pages + route handlers. Public checkout under [app/checkout/](app/checkout/) and [app/pay/[intentId]/](app/pay/%5BintentId%5D/); the merchant workspace lives under `app/(authenticated)/(workspace)/`.
- **[features/](features/)** — vertical slices (`invoices/`, `payment-intents/`, `checkout/`, `merchant-profiles/`, `waitlist/`, `umbra/`, `auth/`, `payments/`, `wallet/`). Each slice owns its own `service.ts` (server-only), `repository.ts` (Prisma), `validators.ts`, `client.ts` (browser fetch helpers), `mappers.ts`, `types.ts`.
- **[server/](server/)** — server-only singletons: [auth.ts](server/auth.ts) (Privy + DB sync), [db.ts](server/db.ts) (Prisma client), [privy.ts](server/privy.ts) (Privy node client), [umbra-payment-rate-limit.ts](server/umbra-payment-rate-limit.ts).
- **[lib/umbra/](lib/umbra/)** — Umbra SDK boundary: [config.ts](lib/umbra/config.ts), [retry.ts](lib/umbra/retry.ts), [zk-assets.ts](lib/umbra/zk-assets.ts), [sdk.ts](lib/umbra/sdk.ts).

## Environment reference

[.env.example](.env.example) is the source of truth. Quick callouts:

- **Required for the app to boot:** `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`.
- **Required in production only:** `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `NEXT_PUBLIC_UMBRA_RPC_URL`, `NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL`.
- **Optional:** `PRIVY_JWT_VERIFICATION_KEY` (pin to your Privy dashboard verification key), `NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS` (Solana Pay QR fallback), `DEBUG_PRIVY_AUTH` / `NEXT_PUBLIC_DEBUG_PRIVY_AUTH` (verbose auth logging).

## References

- [Umbra SDK product flows](docs/umbra-sdk-product-flows.md)
- [Demo video script](docs/demo-video-script.md)
- [Pitch deck outline](docs/pitch-deck-outline.md)
- [Hackathon submission draft](docs/hackathon-submission.md)
- [Privy React setup](https://docs.privy.io/basics/react/setup) · [Privy access-token verification](https://docs.privy.io/guide/server/authorization/verification)
- [Umbra Quickstart](https://sdk.umbraprivacy.com/quickstart) · [Supported tokens](https://sdk.umbraprivacy.com/supported-tokens) · [X25519 compliance grants](https://sdk.umbraprivacy.com/sdk/compliance-x25519-grants) · [Developer docs](https://docs.umbraprivacy.com/)
