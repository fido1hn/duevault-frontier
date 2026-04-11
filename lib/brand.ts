export const BRAND_NAME = "Settlemark";

export const BRAND_TAGLINES = [
  "Private settlement rails for modern business",
  "Business-grade stablecoin payments, private by default",
  "Solana payments with selective disclosure built in",
] as const;

export const BRAND_POSITIONING = {
  eyebrow: "Private commerce infrastructure",
  heroTitle: "Stablecoin settlement for businesses that need privacy and proof.",
  heroDescription:
    "Settlemark gives merchants, freelancers, and internet businesses a more professional way to accept Solana payments. Keep balances and counterparties private by default, then share only the records an accountant, operator, or regulator actually needs.",
  foundationTitle: "Foundation mode, built for the real product",
  foundationDescription:
    "This repo is now structured around the merchant settlement workflow: payment requests, checkout, operational records, wallet connectivity, and a clean Umbra integration boundary.",
  homepageDirection: [
    {
      title: "Private acceptance",
      body: "Create payment requests and public checkout pages without turning your full balance sheet into an onchain dashboard.",
    },
    {
      title: "Operational control",
      body: "Keep off-chain settlement records, merchant activity, and payment states in one place before wiring live Umbra settlement flows.",
    },
    {
      title: "Selective proof",
      body: "Design for regulated businesses from day one: private by default, accountable when disclosure is required.",
    },
  ],
} as const;

export const BRAND_DESCRIPTION =
  "Settlemark is a private payments product built on Umbra for merchants, freelancers, and service businesses that want business-grade Solana payments without exposing balances, customers, or income onchain.";
