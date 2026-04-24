import { afterEach, describe, expect, test } from "bun:test";

import { getCheckoutPaymentConfig } from "../features/checkout/service.ts";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_UMBRA_NETWORK: process.env.NEXT_PUBLIC_UMBRA_NETWORK,
  NEXT_PUBLIC_UMBRA_RPC_URL: process.env.NEXT_PUBLIC_UMBRA_RPC_URL,
  NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL:
    process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL,
  NEXT_PUBLIC_CHECKOUT_MINT_ID: process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID,
  NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS:
    process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("getCheckoutPaymentConfig", () => {
  test("does not require Umbra RPC envs when only checkout network config is needed", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_UMBRA_NETWORK;
    delete process.env.NEXT_PUBLIC_UMBRA_RPC_URL;
    delete process.env.NEXT_PUBLIC_UMBRA_RPC_SUBSCRIPTIONS_URL;
    delete process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID;
    process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS =
      "11111111111111111111111111111111";

    expect(getCheckoutPaymentConfig()).toMatchObject({
      isConfigured: true,
      network: "mainnet",
      receiverAddress: "11111111111111111111111111111111",
      mint: {
        id: "USDC",
        network: "mainnet",
      },
    });
  });
});
