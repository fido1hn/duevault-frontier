import { afterEach, describe, expect, test } from "bun:test";

import { getUmbraRuntimeConfig } from "../lib/umbra/config.ts";
import { getConfiguredPaymentMintId } from "../features/payments/mints.ts";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_UMBRA_NETWORK: process.env.NEXT_PUBLIC_UMBRA_NETWORK,
  NEXT_PUBLIC_UMBRA_RPC_URL: process.env.NEXT_PUBLIC_UMBRA_RPC_URL,
  NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL:
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL,
  NEXT_PUBLIC_CHECKOUT_MINT_ID: process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearUmbraEnv() {
  delete process.env.NEXT_PUBLIC_UMBRA_NETWORK;
  delete process.env.NEXT_PUBLIC_UMBRA_RPC_URL;
  delete process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL;
  delete process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID;
}

afterEach(() => {
  restoreEnv();
});

describe("Umbra runtime config", () => {
  test("development with missing Umbra env falls back to devnet", () => {
    process.env.NODE_ENV = "development";
    clearUmbraEnv();

    expect(getUmbraRuntimeConfig()).toEqual({
      network: "devnet",
      rpcUrl: "https://api.devnet.solana.com",
      rpcSubscriptionsUrl: "wss://api.devnet.solana.com",
    });
  });

  test("production with missing Umbra env throws", () => {
    process.env.NODE_ENV = "production";
    clearUmbraEnv();

    expect(() => getUmbraRuntimeConfig()).toThrow(
      /NEXT_PUBLIC_UMBRA_NETWORK/,
    );
    expect(() => getConfiguredPaymentMintId("mainnet")).toThrow(
      /NEXT_PUBLIC_CHECKOUT_MINT_ID/,
    );
  });

  test("production with devnet throws", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_UMBRA_RPC_URL = "https://api.devnet.solana.com";
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL =
      "wss://api.devnet.solana.com";

    expect(() => getUmbraRuntimeConfig()).toThrow(/mainnet/);
  });

  test("production with mainnet USDC config passes", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_UMBRA_RPC_URL = "https://mainnet.example";
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL =
      "wss://mainnet.example";
    process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID = "USDC";

    expect(getUmbraRuntimeConfig()).toEqual({
      network: "mainnet",
      rpcUrl: "https://mainnet.example",
      rpcSubscriptionsUrl: "wss://mainnet.example",
    });
    expect(getConfiguredPaymentMintId("mainnet")).toBe("USDC");
  });
});
