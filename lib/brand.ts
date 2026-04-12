export const BRAND_NAME = "DueVault";

export const BRAND_TAGLINES = [
  "Private receivables for stablecoin businesses",
  "Business billing on Solana, with disclosure when needed",
  "Invoices, settlement, and proof without public books",
] as const;

export const BRAND_POSITIONING = {
  eyebrow: "Private receivables infrastructure",
  heroTitle: "Accounts receivable for businesses that settle in stablecoins.",
  heroDescription:
    "DueVault gives merchants, freelancers, and internet businesses a professional way to invoice, collect, and reconcile Solana stablecoin payments. Keep receivables and settlement context controlled by default, then share only the records an accountant, operator, or regulator actually needs.",
  foundationTitle: "Foundation mode, built for the real product",
  foundationDescription:
    "This repo is now structured around the private receivables workflow: invoice-style payment requests, checkout, operational records, wallet connectivity, and a clean Umbra integration boundary.",
  homepageDirection: [
    {
      title: "Receivables first",
      body: "Create invoice-style payment requests and checkout pages without turning your full business ledger into an onchain dashboard.",
    },
    {
      title: "Operational control",
      body: "Keep off-chain receivable records, merchant activity, and settlement states in one place before wiring live Umbra flows.",
    },
    {
      title: "Selective proof",
      body: "Design for regulated businesses from day one: private by default, accountable when disclosure is required.",
    },
  ],
} as const;

export const BRAND_DESCRIPTION =
  "DueVault is private accounts receivable software built on Umbra for merchants, freelancers, and service businesses that want business-grade Solana stablecoin billing without exposing balances, customers, or revenue onchain.";
