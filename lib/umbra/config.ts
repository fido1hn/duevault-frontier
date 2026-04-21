import type { UmbraNetwork } from "@/features/merchant-profiles/types";

export type UmbraRuntimeConfig = {
  network: UmbraNetwork;
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
};

const DEFAULT_UMBRA_NETWORK = "devnet";
const DEFAULT_UMBRA_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_UMBRA_RPC_SUBSCRIPTIONS_URL = "wss://api.devnet.solana.com";

function normalizeNetwork(value: string | undefined): UmbraNetwork {
  if (value === "mainnet" || value === "devnet") {
    return value;
  }

  return DEFAULT_UMBRA_NETWORK;
}

export function getUmbraRuntimeConfig(): UmbraRuntimeConfig {
  return {
    network: normalizeNetwork(process.env.NEXT_PUBLIC_UMBRA_NETWORK),
    rpcUrl: process.env.NEXT_PUBLIC_UMBRA_RPC_URL ?? DEFAULT_UMBRA_RPC_URL,
    rpcSubscriptionsUrl:
      process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL ??
      DEFAULT_UMBRA_RPC_SUBSCRIPTIONS_URL,
  };
}
