export const PAYMENT_MINT_IDS = ["USDC"] as const;
export const USDC_MAINNET_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type PaymentMintId = (typeof PAYMENT_MINT_IDS)[number];

export type PaymentMintConfig = {
  id: PaymentMintId;
  displayName: string;
  symbol: string;
  decimals: number;
  address: string;
};

export const PAYMENT_MINTS: Record<PaymentMintId, PaymentMintConfig> = {
  USDC: {
    id: "USDC",
    displayName: "USDC",
    symbol: "USDC",
    decimals: 6,
    address: USDC_MAINNET_ADDRESS,
  },
};

export function isPaymentMintId(value: string): value is PaymentMintId {
  return PAYMENT_MINT_IDS.includes(value as PaymentMintId);
}

export function getPaymentMintConfig(mintId: PaymentMintId) {
  return PAYMENT_MINTS[mintId];
}

export function getPaymentMintDecimals(mintId: PaymentMintId) {
  return getPaymentMintConfig(mintId).decimals;
}

export function getPaymentMintDisplayName(mintId: PaymentMintId) {
  return getPaymentMintConfig(mintId).displayName;
}
