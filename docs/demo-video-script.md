# Demo Video Script

Target length: 3:30 to 4:30. The track allows under 5 minutes, but a tighter cut will land better with judges.

## One-Sentence Hook

DueVault is private stablecoin receivables for Solana businesses: merchants invoice in USDC, customers pay through Umbra, and only merchant-approved auditors can see the business evidence.

## Recording Checklist

- Use the live app: `https://duevault.xyz`
- Use mainnet with tiny USDC amounts.
- Keep Solana Explorer open for the payment transaction.
- Use clean demo wallets with no unrelated tabs or visible personal data.
- Pre-create at least one invoice if live transaction timing might be slow.
- Cut loading time aggressively.

## Timeline

### 0:00-0:25 — Problem

Show a public Solana transaction or explorer tab.

Voiceover:

> Stablecoin invoices are great until every customer, payment amount, revenue spike, and treasury relationship is visible to anyone watching the chain. That is not acceptable for real businesses.

### 0:25-0:45 — Product

Show DueVault landing or dashboard.

Voiceover:

> DueVault gives merchants a Stripe-familiar way to bill in USDC while settling through Umbra. Customers pay privately, merchants receive into an encrypted Umbra balance, and compliance disclosure is scoped by the merchant.

### 0:45-1:20 — Merchant Setup

Show sign-in, merchant profile, and Umbra readiness state.

Say:

- Merchant signs in with Privy.
- Merchant connects the Solana wallet used for receivables.
- DueVault registers or verifies the merchant's Umbra account.
- This is mainnet Umbra, not a mock.

### 1:20-1:55 — Invoice Creation

Show creating an invoice with a customer, line item, amount, and checkout link.

Say:

- The invoice stores business context privately in DueVault.
- The checkout link is public and shareable.
- The invoice reference that goes on-chain is a 32-byte hash, not the invoice ID or customer data.

### 1:55-2:45 — Customer Private Payment

Open checkout link in a customer browser/session.

Show:

- Customer connects wallet.
- Balance readiness check.
- "Pay privately" button.
- Umbra operation progress.
- Submitted or confirmed payment state.

Say:

> The customer payment creates an Umbra receiver-claimable UTXO for the merchant. On the server, DueVault verifies the Umbra instruction, token-balance deltas, event log, proof-account transaction, amount, mint, payer, and hashed invoice reference before accepting the payment.

### 2:45-3:20 — Merchant Settlement

Return to merchant invoice settlement page.

Show:

- Scan step.
- Claim step.
- Claimed/settled state.
- Merchant encrypted balance card if available.

Say:

> The merchant scans for the exact claimable UTXO, claims it into their Umbra encrypted balance, and DueVault records retry-safe settlement state.

### 3:20-4:05 — Compliance Grant

Show compliance page and auditor portal.

Show:

- Select confirmed payment signatures.
- Issue grant to auditor wallet.
- Open auditor portal with grant link.
- Auditor wallet gate and evidence view.

Say:

> Privacy does not mean unusable records. The merchant can grant an auditor access to selected payment evidence only. The rest of the business history remains private.

### 4:05-4:25 — Technical Proof

Briefly show the README reviewer map or code files.

Say:

> Umbra is core to the product: registration, private payment creation, claim scanning, encrypted balance settlement, and X25519 grants all go through the Umbra SDK. The repo includes tests for payment verification, grant scoping, claim persistence, rate limits, and redaction.

### 4:25-4:40 — Close

Say:

> DueVault turns Umbra's privacy infrastructure into usable financial software for Solana businesses: private by default, accountable by grant.

## Shots To Avoid

- Do not spend more than 10 seconds in the terminal.
- Do not show seed phrases, private keys, `.env` values, Privy secrets, or database dashboards.
- Do not narrate every UI field. Judges need the story and proof, not a form walkthrough.
- Do not overclaim the auditor portal as arbitrary ciphertext decryption. Say "scoped disclosure of verified invoice and payment evidence."

