export type PaymentMintNetwork = "devnet" | "mainnet";

export const PAYMENT_MINT_IDS = ["USDC", "UMBRA_DEVNET"] as const;

export type PaymentMintId = (typeof PAYMENT_MINT_IDS)[number];

export type PaymentMintConfig = {
  id: PaymentMintId;
  displayName: string;
  symbol: string;
  decimals: number;
  isTestMint: boolean;
  addresses: Partial<Record<PaymentMintNetwork, string>>;
  testnetNotice: string | null;
};

export type ResolvedPaymentMintConfig = PaymentMintConfig & {
  address: string;
  network: PaymentMintNetwork;
};

export const PAYMENT_MINTS: Record<PaymentMintId, PaymentMintConfig> = {
  USDC: {
    id: "USDC",
    displayName: "USDC",
    symbol: "USDC",
    decimals: 6,
    isTestMint: false,
    addresses: {
      mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
    testnetNotice: null,
  },
  UMBRA_DEVNET: {
    id: "UMBRA_DEVNET",
    displayName: "Umbra Devnet Mint",
    symbol: "UMBRA-DEV",
    decimals: 9,
    isTestMint: true,
    addresses: {
      devnet: "GvUQDFLWYH4QHKYot787616f61m1m5eZofhYKyaBkPn9",
    },
    testnetNotice:
      "This checkout uses an Umbra devnet test mint, not real USDC.",
  },
};

export function isPaymentMintId(value: string): value is PaymentMintId {
  return PAYMENT_MINT_IDS.includes(value as PaymentMintId);
}

export function assertPaymentMintId(value: string): asserts value is PaymentMintId {
  if (!isPaymentMintId(value)) {
    throw new Error("Unsupported payment mint.");
  }
}

export function getPaymentMintConfig(mintId: PaymentMintId) {
  return PAYMENT_MINTS[mintId];
}

export function getDefaultPaymentMintId(network: PaymentMintNetwork): PaymentMintId {
  return network === "mainnet" ? "USDC" : "UMBRA_DEVNET";
}

export function getConfiguredPaymentMintId(
  network: PaymentMintNetwork,
  value = process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID,
) {
  const configuredValue = value?.trim();

  if (process.env.NODE_ENV === "production" && !configuredValue) {
    throw new Error("NEXT_PUBLIC_CHECKOUT_MINT_ID is required in production.");
  }

  const normalized = configuredValue || getDefaultPaymentMintId(network);

  assertPaymentMintId(normalized);

  if (process.env.NODE_ENV === "production" && normalized !== "USDC") {
    throw new Error("Production checkout mint must be USDC.");
  }

  return normalized;
}

export function resolvePaymentMintForNetwork(
  mintId: PaymentMintId,
  network: PaymentMintNetwork,
): ResolvedPaymentMintConfig {
  const mint = getPaymentMintConfig(mintId);
  const mintAddress = mint.addresses[network];

  if (!mintAddress) {
    throw new Error(
      `${mint.displayName} is not supported for Umbra ${network} checkout.`,
    );
  }

  return {
    ...mint,
    address: mintAddress,
    network,
  };
}

export function getConfiguredPaymentMint(network: PaymentMintNetwork) {
  return resolvePaymentMintForNetwork(
    getConfiguredPaymentMintId(network),
    network,
  );
}

export function getPaymentMintDecimals(mintId: PaymentMintId) {
  return getPaymentMintConfig(mintId).decimals;
}

export function getPaymentMintDisplayName(mintId: PaymentMintId) {
  return getPaymentMintConfig(mintId).displayName;
}
