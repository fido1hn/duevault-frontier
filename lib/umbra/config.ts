import type { UmbraNetwork } from "@/features/merchant-profiles/types";

export type UmbraRuntimeConfig = {
  network: UmbraNetwork;
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
};

const DEFAULT_UMBRA_NETWORK = "devnet";
const DEFAULT_UMBRA_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_UMBRA_RPC_SUBSCRIPTIONS_URL = "wss://api.devnet.solana.com";

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function normalizeNetwork(value: string | undefined): UmbraNetwork {
  const normalized = value?.trim();

  if (normalized === "mainnet" || normalized === "devnet") {
    return normalized;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "NEXT_PUBLIC_UMBRA_NETWORK must be set to mainnet in production.",
    );
  }

  return DEFAULT_UMBRA_NETWORK;
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

export function getUmbraRuntimeConfig(): UmbraRuntimeConfig {
  const network = normalizeNetwork(process.env.NEXT_PUBLIC_UMBRA_NETWORK);

  if (isProductionRuntime() && network !== "mainnet") {
    throw new Error("Production Umbra checkout must run on mainnet.");
  }

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
