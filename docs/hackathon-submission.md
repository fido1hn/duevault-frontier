# Hackathon Submission Draft

## Project Name

DueVault

## Tagline

Bill in stablecoins. Without the public ledger.

## Short Description

DueVault is private stablecoin receivables software for Solana businesses. Merchants create invoice checkout links, customers pay USDC through Umbra, and merchants settle into encrypted Umbra balances while preserving a scoped compliance path for auditors.

## Long Description

Stablecoin receivables have a privacy problem. A normal Solana payment can expose customer wallets, invoice sizes, revenue timing, and treasury relationships to anyone watching the chain. That is a real blocker for agencies, contractors, exporters, DAOs, and crypto-native businesses that want fast settlement without broadcasting their books.

DueVault turns Umbra's privacy infrastructure into a Stripe-familiar billing product. A merchant signs in, completes Umbra registration, creates an invoice, and shares a checkout link. The customer pays with USDC through Umbra, and DueVault verifies the on-chain Umbra deposit and proof-account transaction before accepting the payment. The merchant then scans and claims the payment into their Umbra encrypted balance.

The product also includes merchant-controlled compliance disclosure. A merchant can select exact confirmed Umbra payment signatures, issue an X25519 grant to an auditor wallet, and share an auditor portal link. The auditor must sign in with the granted wallet and have an Umbra X25519 account before seeing the scoped invoice and payment evidence.

Umbra is essential to the core flow: DueVault uses Umbra registration, receiver-claimable UTXO creation, claimable UTXO scanning, encrypted balance claiming, encrypted balance reads, withdrawals, and X25519 compliance grants. Without Umbra, DueVault would collapse into ordinary public Solana Pay plus an invoice database.

The app is live on Solana mainnet with USDC at `https://duevault.xyz`. The repository includes a clear README, local setup instructions, and 126 passing tests covering the security-critical paths: payment verification, save validation, rate limiting, claim settlement, grant scoping, auditor gates, and public evidence redaction.

## Umbra SDK Usage

- Merchant and customer Umbra account registration.
- Customer public balance to receiver-claimable UTXO payment flow.
- ZK prover integration for Umbra payment creation and claiming.
- Server-side verification of Umbra deposit and proof-account transactions.
- Claimable UTXO scanning and merchant claim into encrypted balance.
- Encrypted balance query and withdrawal.
- X25519 compliance grant issuance and revocation.

## Demo Flow

1. Merchant signs in and completes Umbra setup.
2. Merchant creates a USDC invoice.
3. Customer opens public checkout and pays privately through Umbra.
4. Server verifies the Umbra payment evidence.
5. Merchant scans and claims settlement into encrypted balance.
6. Merchant issues a scoped auditor grant for the confirmed payment.
7. Auditor opens the portal and sees only the granted evidence.

## Links

- Live app: `https://duevault.xyz`
- GitHub repository: `TBD`
- Demo video: `TBD`

## Notes For Judges

DueVault is mainnet-only. Production and local Umbra flows use Solana mainnet USDC, so use tiny payment amounts when testing live flows.
