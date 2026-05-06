# DueVault

> Private accounts receivable on Umbra for Solana stablecoin businesses.

**Live app:** https://duevault.xyz

Stack: Next.js 16 · TypeScript · Prisma · Supabase · Privy · Umbra SDK · Solana mainnet.

## What it does

- Merchants sign in with Privy (email or Solana wallet) and complete an Umbra registration tied to their primary Solana wallet.
- Create payment requests / invoices that resolve to a public, shareable checkout URL.
- Customers pay through Umbra's stealth pool from the public checkout. The server verifies the on-chain deposit transaction (instruction discriminator, accounts, token-balance deltas, event log) **and** the matching proof-account transaction before marking a payment confirmed.
- Merchants run a two-step **Scan → Claim** to settle confirmed payments into their Umbra balance, with retry-aware UI for failed claim attempts.
- Per-invoice proof-packet download for off-chain receipts.

## Try it in production

Visit https://duevault.xyz, sign in with email or Solana wallet, complete merchant onboarding, and create an invoice. The public checkout link is shareable.

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

> **Live Umbra payments locally?** `.env.example` is wired to **devnet** by default, but the runtime config in [lib/umbra/config.ts](lib/umbra/config.ts) currently rejects anything but `mainnet` for the live app. To exercise the full private-payment flow locally you'd need to override the `NEXT_PUBLIC_UMBRA_*` block to mainnet — meaning **real funds**. For most reviewers, the dashboard / invoice / checkout flow is enough to evaluate the codebase; rely on **duevault.xyz** for end-to-end mainnet behavior.

### Tests

```bash
bun run test
```

The [tests/](tests/) directory holds 20 `.mjs` test files covering the security-critical surface: Umbra payment verification, save validation, three-layer rate-limit policy, claim persistence and settlement, public payment-status mapping, and runtime config.

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
- [Privy React setup](https://docs.privy.io/basics/react/setup) · [Privy access-token verification](https://docs.privy.io/guide/server/authorization/verification)
- [Umbra Quickstart](https://sdk.umbraprivacy.com/quickstart) · [Supported tokens](https://sdk.umbraprivacy.com/supported-tokens) · [X25519 compliance grants](https://sdk.umbraprivacy.com/sdk/compliance-x25519-grants) · [Developer docs](https://docs.umbraprivacy.com/)
