# DueVault

DueVault is private accounts receivable software built on Umbra for merchants, freelancers, and service businesses that want business-grade Solana stablecoin billing without exposing balances, counterparties, or revenue onchain.

Primary tagline: `Private receivables for stablecoin businesses`

This repository is currently on **step 1 foundation**:

- Next.js App Router skeleton
- Solana wallet provider shell
- Prisma + Supabase Postgres for off-chain receivables records
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

- real wallet-aware merchant session state
- Umbra registration flow
- live private payment creation and claiming
- live private balance query and withdrawals

## Local development

Install dependencies:

```bash
bun install
```

Create or update the Supabase Postgres schema from Prisma:

```bash
bun run db:migrate
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

Copy `.env.example` to `.env` if needed.

The default local setup uses:

- Supabase Postgres for off-chain records
- Solana devnet RPC

## Project structure

- `app/`: Next.js pages and route handlers
- `components/`: UI building blocks and wallet providers
- `features/`: vertical feature slices for invoices, merchant profiles, payment intents, waitlist, and checkout
- `server/db.ts`: server-only Prisma client singleton
- `fixtures/`: demo data used by prototype-only screens
- `lib/`: shared utilities, formatting, and brand constants
- `lib/umbra/`: Umbra boundary, placeholders, and future SDK integration
- `prisma/schema.prisma`: Prisma source of truth for app tables

## References

- [Umbra Quickstart](https://sdk.umbraprivacy.com/quickstart)
- [Umbra Supported Tokens](https://sdk.umbraprivacy.com/supported-tokens)
- [Umbra X25519 Compliance Grants](https://sdk.umbraprivacy.com/sdk/compliance-x25519-grants)
- [Umbra Developer Docs](https://docs.umbraprivacy.com/)
