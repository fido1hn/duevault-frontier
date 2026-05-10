# Pitch Deck Outline

Audience: Umbra track judges and hackathon reviewers.

Goal: make the project understandable in under 60 seconds, then prove that it works on mainnet.

## Slide 1: DueVault

**Headline:** Bill in stablecoins. Without the public ledger.

**Subhead:** Private USDC receivables for Solana businesses, powered by Umbra.

**Visual:** checkout or invoice screen with "Umbra private checkout" visible.

**Speaker note:** Start with the business problem, not the SDK.

## Slide 2: The Problem

**Headline:** Public payments leak private business data.

**Bullets:**

- Customer wallets become public relationship graphs.
- Invoice size and revenue timing become visible.
- Treasury movement can be tracked by competitors, vendors, and counterparties.
- Existing invoicing tools are either custodial or do not solve on-chain privacy.

**Speaker note:** Use one concrete story: a freelancer, agency, DAO contributor, or vendor does not want every client and invoice amount public.

## Slide 3: The Product

**Headline:** Stripe-style receivables on private Solana rails.

**Bullets:**

- Merchant creates invoice and checkout link.
- Customer pays USDC through Umbra.
- Merchant scans and claims into an encrypted Umbra balance.
- Auditor gets only the evidence the merchant grants.

**Speaker note:** This is not a wallet demo. It is business software built around private settlement.

## Slide 4: Why Umbra

**Headline:** DueVault needs Umbra at the center.

**Bullets:**

- Umbra registration makes merchants and customers privacy-ready.
- Receiver-claimable UTXOs power private checkout.
- Claim scanning and claiming settle funds into encrypted balances.
- X25519 grants enable selective compliance access.

**Speaker note:** If Umbra is removed, the product becomes public Solana Pay plus a database.

## Slide 5: Mainnet Demo Proof

**Headline:** Live on mainnet with real USDC flow.

**Bullets:**

- Production app: `https://duevault.xyz`
- Network: Solana mainnet
- Asset: USDC
- Flow: onboard → invoice → private checkout → verify → scan → claim → grant auditor access

**Speaker note:** Show the actual live product and transaction evidence in the video.

## Slide 6: Technical Execution

**Headline:** The server verifies privacy payments before trusting them.

**Bullets:**

- Verifies Umbra instruction discriminator and accounts.
- Checks payer, mint, amount, and hashed invoice reference.
- Checks token-balance deltas and Umbra event logs.
- Links deposit transaction to matching proof-account transaction.
- Includes 126 passing tests across payment, claim, audit, rate-limit, and redaction behavior.

**Speaker note:** This is the "we did the hard part" slide.

## Slide 7: Compliance Without Public Exposure

**Headline:** Private by default. Disclosable by grant.

**Bullets:**

- Merchant selects exact confirmed payment signatures.
- Auditor must use the grant recipient wallet.
- Auditor wallet must have Umbra X25519 registration.
- Revoked grants stop evidence access.
- The rest of the merchant history stays hidden.

**Speaker note:** Be precise: this is scoped disclosure of verified DueVault invoice/payment evidence using Umbra grant primitives.

## Slide 8: Market Wedge

**Headline:** Start with stablecoin receivables.

**Bullets:**

- Agencies, contractors, exporters, DAOs, and crypto-native vendors already receive stablecoins.
- They need records, checkout links, proof, and privacy.
- DueVault can grow from invoices into payroll, billing, and private merchant treasury workflows.

**Speaker note:** The wedge is not "all private finance"; it is receivables where privacy pain is immediate.

## Slide 9: Roadmap

**Headline:** From hackathon prototype to privacy finance suite.

**Near-term:**

- Improve auditor evidence exports.
- Add multi-asset support as Umbra pools expand.
- Add merchant reporting and tax packets.
- Add team roles and accountant workflows.

**Later:**

- Private subscriptions.
- Private payroll.
- API-first private billing.

## Slide 10: Close

**Headline:** DueVault turns Umbra into usable financial privacy for businesses.

**Bullets:**

- Real product
- Mainnet Umbra integration
- Clear business use case
- Selective disclosure path for compliance

**Speaker note:** End by tying back to Umbra's track: this is privacy infrastructure turned into a usable financial product.

