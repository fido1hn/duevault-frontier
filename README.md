# DueVault

DueVault is private accounts receivable software built on Umbra for merchants, freelancers, and service businesses that want business-grade Solana stablecoin billing without exposing balances, counterparties, or revenue onchain.

Primary tagline: `Private receivables for stablecoin businesses`

This repository is currently on **step 1 foundation**:

- Next.js App Router skeleton
- Privy auth with email or external Solana wallets
- Prisma + Supabase Postgres for owned off-chain receivables records
- minimal merchant pages and payment-request API routes
- Umbra SDK kept behind a clean app-facing service boundary

## Current scope

Step 1 intentionally stops before live chain actions.

What works now:

- create local payment requests
- list payment requests on dashboard and activity pages
- open a public checkout page for a single request
- manually move requests through `active -> paid -> claimed -> expired`

What comes next:

- Umbra registration flow
- live private payment creation and claiming
- live private balance query and withdrawals

## Design docs

- [Umbra SDK product flows](docs/umbra-sdk-product-flows.md)

## Local development

Install dependencies:

```bash
bun install
```

Create or update the Supabase Postgres schema from Prisma:

```bash
bun run db:migrate
```

Generate Prisma Client after schema changes:

```bash
bun run db:generate
```

Deploy committed migrations to Supabase production:

```bash
bun run db:deploy:prod
```

Start the app:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

## Environment

Copy `.env.example` to `.env.local` for local development.

The default local setup uses:

- Supabase Postgres for off-chain records
- Prisma migrations as the source of truth for app tables
- Privy for merchant authentication and external Solana wallet linking
- network-aware checkout mint config for Solana Pay and Umbra checkout

Required auth envs:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_JWT_VERIFICATION_KEY` if you want to pin token verification to the dashboard key

Required database envs:

- `DATABASE_URL` for runtime Prisma queries
- `DIRECT_URL` for Prisma migrations against Supabase Postgres

Required production rate-limit envs:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- These protect the public Umbra payment submission endpoint before it performs Solana RPC verification. Provision Redis through the Vercel Marketplace/Upstash; the app uses `@vercel/kv` because it exposes the expected Upstash-compatible REST client.

Checkout mint envs:

- Local/devnet demo: `NEXT_PUBLIC_UMBRA_NETWORK=devnet` and `NEXT_PUBLIC_CHECKOUT_MINT_ID=UMBRA_DEVNET`
- Production/mainnet: `NEXT_PUBLIC_UMBRA_NETWORK=mainnet` and `NEXT_PUBLIC_CHECKOUT_MINT_ID=USDC`
- Production must also set `NEXT_PUBLIC_UMBRA_RPC_URL` and `NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL`; missing Umbra envs fail closed instead of defaulting to devnet.
- `NEXT_PUBLIC_CHECKOUT_USDC_MINT` is deprecated; checkout mints are resolved from the supported catalog in `features/payments/mints.ts`.

## Project structure

- `app/`: Next.js pages and route handlers
- `components/`: UI building blocks and app providers
- `features/`: vertical feature slices for invoices, merchant profiles, payment intents, waitlist, and checkout
- `server/auth.ts`: server-only Privy access token verification and user/wallet sync
- `server/db.ts`: server-only Prisma client singleton
- `fixtures/`: demo data used by prototype-only screens
- `lib/`: shared utilities, formatting, and brand constants
- `lib/umbra/`: Umbra boundary, placeholders, and future SDK integration
- `prisma/schema.prisma`: Prisma source of truth for app tables

## References

- [Privy React setup](https://docs.privy.io/basics/react/setup)
- [Privy access token verification](https://docs.privy.io/guide/server/authorization/verification)
- [Umbra Quickstart](https://sdk.umbraprivacy.com/quickstart)
- [Umbra Supported Tokens](https://sdk.umbraprivacy.com/supported-tokens)
- [Umbra X25519 Compliance Grants](https://sdk.umbraprivacy.com/sdk/compliance-x25519-grants)
- [Umbra Developer Docs](https://docs.umbraprivacy.com/)
