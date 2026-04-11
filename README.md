# Settlemark

Settlemark is a private payments product built on Umbra for merchants, freelancers, and service businesses that want business-grade Solana payments without exposing balances, counterparties, or revenue onchain.

Primary tagline: `Private settlement rails for modern business`

This repository is currently on **step 1 foundation**:

- Next.js App Router skeleton
- Solana wallet provider shell
- Prisma + SQLite for off-chain payment-request records
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

Create or update the local SQLite schema:

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

- SQLite for off-chain records
- Solana devnet RPC

## Project structure

- `app/`: Next.js pages and route handlers
- `components/`: UI building blocks and wallet providers
- `lib/payment-intents.ts`: payment-request domain logic
- `lib/db.ts`: Prisma client singleton
- `lib/umbra/`: Umbra boundary, placeholders, and future SDK integration
- `prisma/schema.prisma`: local DB schema

## References

- [Umbra Quickstart](https://sdk.umbraprivacy.com/quickstart)
- [Umbra Supported Tokens](https://sdk.umbraprivacy.com/supported-tokens)
- [Umbra X25519 Compliance Grants](https://sdk.umbraprivacy.com/sdk/compliance-x25519-grants)
- [Umbra Developer Docs](https://docs.umbraprivacy.com/)
