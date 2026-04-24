import {
  resolvePaymentMintForNetwork,
  type ResolvedPaymentMintConfig,
} from "@/features/payments/mints";
import type { UmbraNetwork } from "@/features/merchant-profiles/types";

export type UmbraRuntimeConfig = {
  network: UmbraNetwork;
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
};

export type UmbraAppConfig = UmbraRuntimeConfig & {
  checkoutMint: ResolvedPaymentMintConfig;
};

export const UMBRA_APP_NETWORK = "mainnet" as const;
export const UMBRA_APP_CHECKOUT_MINT_ID = "USDC" as const;
const DEFAULT_UMBRA_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_UMBRA_RPC_SUBSCRIPTIONS_URL = "wss://api.mainnet-beta.solana.com";

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function normalizeNetwork(value: string | undefined): UmbraNetwork | null {
  const normalized = value?.trim();

  if (normalized === "mainnet" || normalized === "devnet") {
    return normalized;
  }

  return null;
}

function assertExpectedEnvValue(
  name: "NEXT_PUBLIC_UMBRA_NETWORK" | "NEXT_PUBLIC_CHECKOUT_MINT_ID",
  expected: string,
) {
  const value = process.env[name]?.trim();

  if (!value) {
    return;
  }

  if (value !== expected) {
    throw new Error(`${name} must be ${expected} for this app.`);
  }
}

function readUmbraUrlEnv(
  name: "NEXT_PUBLIC_UMBRA_RPC_URL" | "NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL",
  fallback: string,
) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (isProductionRuntime()) {
    throw new Error(`${name} is required in production.`);
  }

  return fallback;
}

export function getUmbraRuntimeNetwork(): UmbraNetwork {
  const network = normalizeNetwork(process.env.NEXT_PUBLIC_UMBRA_NETWORK);

  if (network && network !== UMBRA_APP_NETWORK) {
    throw new Error("Umbra checkout must run on mainnet for this app.");
  }

  assertExpectedEnvValue("NEXT_PUBLIC_UMBRA_NETWORK", UMBRA_APP_NETWORK);

  return UMBRA_APP_NETWORK;
}

export function getUmbraCheckoutMint() {
  assertExpectedEnvValue(
    "NEXT_PUBLIC_CHECKOUT_MINT_ID",
    UMBRA_APP_CHECKOUT_MINT_ID,
  );

  return resolvePaymentMintForNetwork(
    UMBRA_APP_CHECKOUT_MINT_ID,
    getUmbraRuntimeNetwork(),
  );
}

export function getUmbraRuntimeConfig(): UmbraRuntimeConfig {
  const network = getUmbraRuntimeNetwork();

  return {
    network,
    rpcUrl: readUmbraUrlEnv(
      "NEXT_PUBLIC_UMBRA_RPC_URL",
      DEFAULT_UMBRA_RPC_URL,
    ),
    rpcSubscriptionsUrl: readUmbraUrlEnv(
      "NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL",
      DEFAULT_UMBRA_RPC_SUBSCRIPTIONS_URL,
    ),
  };
}

export function getUmbraAppConfig(): UmbraAppConfig {
  return {
    ...getUmbraRuntimeConfig(),
    checkoutMint: getUmbraCheckoutMint(),
  };
}
