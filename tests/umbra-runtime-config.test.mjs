import { afterEach, describe, expect, test } from "bun:test";

import {
  getUmbraAppConfig,
  getUmbraCheckoutMint,
  getUmbraRuntimeConfig,
  getUmbraRuntimeNetwork,
} from "../lib/umbra/config.ts";

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
  test("development with missing Umbra env falls back to mainnet defaults", () => {
    process.env.NODE_ENV = "development";
    clearUmbraEnv();

    expect(getUmbraRuntimeConfig()).toEqual({
      network: "mainnet",
      rpcUrl: "https://api.mainnet-beta.solana.com",
      rpcSubscriptionsUrl: "wss://api.mainnet-beta.solana.com",
      indexerApiEndpoint: "https://utxo-indexer.api.umbraprivacy.com",
    });
    expect(getUmbraCheckoutMint()).toMatchObject({
      id: "USDC",
      network: "mainnet",
    });
  });

  test("production with missing network and mint env still resolves app defaults", () => {
    process.env.NODE_ENV = "production";
    clearUmbraEnv();

    expect(getUmbraRuntimeNetwork()).toBe("mainnet");
    expect(getUmbraCheckoutMint()).toMatchObject({
      id: "USDC",
      network: "mainnet",
    });
    expect(() => getUmbraRuntimeConfig()).toThrow(/NEXT_PUBLIC_UMBRA_RPC_URL/);
  });

  test("production with devnet throws", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_UMBRA_RPC_URL = "https://api.devnet.solana.com";
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL =
      "wss://api.devnet.solana.com";

    expect(() => getUmbraRuntimeNetwork()).toThrow(/mainnet/);
  });

  test("production rejects non-USDC checkout mint config", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID = "UMBRA_DEVNET";
    process.env.NEXT_PUBLIC_UMBRA_RPC_URL = "https://mainnet.example";
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL =
      "wss://mainnet.example";

    expect(() => getUmbraCheckoutMint()).toThrow(/NEXT_PUBLIC_CHECKOUT_MINT_ID/);
  });

  test("production network and mint lookup do not require RPC envs", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID = "USDC";
    delete process.env.NEXT_PUBLIC_UMBRA_RPC_URL;
    delete process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL;

    expect(getUmbraRuntimeNetwork()).toBe("mainnet");
    expect(getUmbraCheckoutMint()).toMatchObject({
      id: "USDC",
      network: "mainnet",
    });
    expect(() => getUmbraRuntimeConfig()).toThrow(/NEXT_PUBLIC_UMBRA_RPC_URL/);
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
      indexerApiEndpoint: "https://utxo-indexer.api.umbraprivacy.com",
    });
    expect(getUmbraAppConfig()).toMatchObject({
      network: "mainnet",
      rpcUrl: "https://mainnet.example",
      rpcSubscriptionsUrl: "wss://mainnet.example",
      checkoutMint: {
        id: "USDC",
        network: "mainnet",
      },
    });
  });
});
