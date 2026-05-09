export const BRAND_NAME = "DueVault";

export const BRAND_TAGLINES = [
  "Bill in stablecoins. Without the public ledger.",
  "Private settlement with scoped audit disclosure",
  "Stablecoin receivables that stay business-private",
] as const;

export const BRAND_POSITIONING = {
  eyebrow: "Private stablecoin receivables",
  heroTitle: "Bill in stablecoins. Without the public ledger.",
  heroDescription:
    "DueVault gives merchants a Stripe-familiar way to invoice and collect USDC on Solana while keeping customer relationships, revenue, and payment history private by default. When compliance needs proof, disclose only the exact invoice evidence an auditor is allowed to see.",
  foundationTitle: "Private settlement, accountable disclosure",
  foundationDescription:
    "The product centers on invoice-style payment requests, Umbra private settlement, merchant-owned records, and gated auditor grants scoped to selected payment evidence.",
  homepageDirection: [
    {
      title: "Issue",
      body: "Create business invoices and checkout links without publishing customer and invoice context to the public ledger.",
    },
    {
      title: "Collect",
      body: "Route Solana stablecoin payments through Umbra so settlement lands privately instead of exposing the merchant wallet graph.",
    },
    {
      title: "Disclose",
      body: "Issue signature-scoped auditor grants that reveal selected invoice and payment evidence while the rest of the books stay private.",
    },
  ],
} as const;

export const BRAND_DESCRIPTION =
  "DueVault is private stablecoin receivables software built on Umbra for businesses that want Solana settlement without exposing customers, balances, revenue, or audit history onchain.";
