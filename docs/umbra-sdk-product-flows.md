# Umbra SDK Product Flows

DueVault is a private stablecoin receivables product built around Umbra. This document gives judges and reviewers a short map from product behavior to the Umbra SDK primitives used in the codebase.

## Product Summary

Public stablecoin payments leak business context: customer wallets, invoice size, revenue timing, and treasury relationships. DueVault gives merchants invoice-style checkout links where customers pay USDC through Umbra, merchants settle into an encrypted balance, and auditors can review only the payment evidence a merchant explicitly grants.

Production runs on Solana mainnet with USDC. Use tiny amounts when testing.

## Flow 1: Merchant Umbra Setup

1. Merchant signs in with Privy.
2. Merchant connects the Solana wallet used for the business profile.
3. DueVault checks whether the wallet has a complete Umbra account.
4. If needed, DueVault registers the Umbra account with confidential and anonymous usage enabled.
5. The app stores only registration status and the transaction signatures needed to explain setup state.

Key code:

- [lib/umbra/sdk.ts](../lib/umbra/sdk.ts) wraps `getUmbraClient`, `getUserRegistrationFunction`, and `getUserAccountQuerierFunction`.
- [features/merchant-profiles/umbra-registration.ts](../features/merchant-profiles/umbra-registration.ts) runs the browser-side registration flow.
- [app/api/merchant-profile/umbra-registration/route.ts](../app/api/merchant-profile/umbra-registration/route.ts) persists the verified merchant registration state.

Umbra primitives:

- User account initialization
- X25519 public key registration
- Anonymous usage registration

## Flow 2: Private Customer Checkout

1. Merchant creates an invoice with line items and a public checkout URL.
2. DueVault derives a 32-byte invoice reference with `sha256("duevault:invoice:" + publicId)`.
3. Customer connects a Solana wallet on the checkout page.
4. DueVault checks or creates the customer Umbra registration.
5. Customer pays the invoice amount by creating an Umbra receiver-claimable UTXO for the merchant.
6. The server verifies the submitted on-chain evidence before saving the payment.

Key code:

- [features/checkout/service.ts](../features/checkout/service.ts) builds the hashed invoice reference.
- [features/checkout/umbra-payment.ts](../features/checkout/umbra-payment.ts) runs the customer payment flow.
- [app/api/checkout/[publicId]/umbra-payment/route.ts](../app/api/checkout/%5BpublicId%5D/umbra-payment/route.ts) validates, rate-limits, and stores submitted payment evidence.
- [features/checkout/umbra-payment-verification.ts](../features/checkout/umbra-payment-verification.ts) verifies the deposit and proof-account transactions.

Umbra primitives:

- Public balance to receiver-claimable UTXO creation
- Optional 32-byte data attached to the Umbra payment
- ZK proof generation through the Umbra web prover
- Umbra transaction and event verification through Codama decoders

Server verification checks:

- The deposit transaction succeeded on-chain.
- The Umbra instruction discriminator matches the expected deposit path.
- Payer, mint, amount, and optional invoice reference match the checkout.
- Token-balance deltas show the customer paid and the pool received the amount.
- The Umbra event log matches the checkout evidence.
- The proof-account transaction belongs to the same payer and invoice reference.

## Flow 3: Merchant Scan And Claim

1. Merchant opens the invoice settlement page.
2. DueVault scans the merchant's claimable Umbra UTXOs.
3. The app matches the claimable UTXO against the verified invoice evidence.
4. Merchant submits the Umbra claim.
5. DueVault records claim state, retry attempts, and completed claim summary.

Key code:

- [features/merchant-profiles/umbra-claim-confirmation.ts](../features/merchant-profiles/umbra-claim-confirmation.ts) scans and serializes claimability evidence.
- [features/merchant-profiles/umbra-settlement-claim.ts](../features/merchant-profiles/umbra-settlement-claim.ts) selects the exact UTXO to claim.
- [app/(authenticated)/(workspace)/invoices/[invoiceId]/settlement/page.tsx](../app/(authenticated)/%28workspace%29/invoices/%5BinvoiceId%5D/settlement/page.tsx) runs the scan and claim UI.
- [app/api/invoices/[invoiceId]/umbra-payment/claim/route.ts](../app/api/invoices/%5BinvoiceId%5D/umbra-payment/claim/route.ts) persists completed claims.

Umbra primitives:

- Claimable UTXO scanning
- Receiver-claimable UTXO to encrypted balance claiming
- Batch Merkle proof fetching
- Umbra relayer-backed claim submission

## Flow 4: Merchant Private Balance

1. Merchant can refresh encrypted balance state from the dashboard.
2. Merchant can withdraw from encrypted balance to public balance when needed.

Key code:

- [features/wallet/merchant-wallet-actions.ts](../features/wallet/merchant-wallet-actions.ts)
- [components/wallet/merchant-wallet-card.tsx](../components/wallet/merchant-wallet-card.tsx)

Umbra primitives:

- Encrypted balance query
- Encrypted balance to public balance withdrawal

## Flow 5: Scoped Compliance Grants

1. Merchant selects confirmed Umbra payment signatures to share with an auditor.
2. Merchant issues an Umbra X25519 compliance grant to the auditor wallet.
3. DueVault freezes the selected payment signatures in the grant record.
4. Auditor opens the portal, signs in with the grant recipient wallet, and proves the wallet has an Umbra X25519 key.
5. Auditor can view only the stored invoice and payment evidence included in the grant scope.
6. Merchant can revoke the Umbra grant.

Key code:

- [lib/umbra/sdk.ts](../lib/umbra/sdk.ts) wraps `getComplianceGrantIssuerFunction` and `getComplianceGrantRevokerFunction`.
- [app/(authenticated)/(workspace)/compliance/page.tsx](../app/(authenticated)/%28workspace%29/compliance/page.tsx) issues and revokes grants.
- [features/audit/scope-selection.ts](../features/audit/scope-selection.ts) freezes exact confirmed payment signatures.
- [app/api/audit/evidence-index/route.ts](../app/api/audit/evidence-index/route.ts) lists scoped evidence.
- [app/api/audit/decrypt-evidence/route.ts](../app/api/audit/decrypt-evidence/route.ts) gates evidence access by auth, grant token, wallet ownership, Umbra X25519 registration, rate limit, revocation state, and payment scope.

Umbra primitives:

- X25519 auditor key registration check
- Compliance grant issuance
- Compliance grant revocation

Scope note:

The current audit portal discloses DueVault's verified invoice and payment records for selected Umbra payment signatures. It does not yet use Umbra shared-ciphertext reencryption for arbitrary encrypted transaction payloads. The SDK wrapper includes a `requestAuditorReencryption` helper for that future extension.

## Why Umbra Is Essential

Without Umbra, DueVault would be ordinary public Solana Pay plus an invoice database. The product's core value depends on Umbra because the customer payment path, merchant settlement path, encrypted merchant balance, and compliance grant primitive all come from Umbra's privacy infrastructure.

