import { afterEach, describe, expect, test } from "bun:test";

import {
  buildDemoCheckoutViewModel,
  DEMO_CHECKOUT_NOTICE,
  DEMO_MERCHANT_RECEIVER_ADDRESS,
} from "../features/checkout/demo.ts";
import { getPaymentMintConfig } from "../features/payments/mints.ts";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_CHECKOUT_MINT_ID: process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID,
  NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS:
    process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS,
  NEXT_PUBLIC_UMBRA_NETWORK: process.env.NEXT_PUBLIC_UMBRA_NETWORK,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID =
    ORIGINAL_ENV.NEXT_PUBLIC_CHECKOUT_MINT_ID;
  process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS =
    ORIGINAL_ENV.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS;
  process.env.NEXT_PUBLIC_UMBRA_NETWORK = ORIGINAL_ENV.NEXT_PUBLIC_UMBRA_NETWORK;
});

describe("buildDemoCheckoutViewModel", () => {
  test("returns a read-only Umbra mainnet preview regardless of env", () => {
    process.env.NEXT_PUBLIC_UMBRA_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_CHECKOUT_MINT_ID = "UMBRA_DEVNET";
    process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS =
      "11111111111111111111111111111111";

    const checkout = buildDemoCheckoutViewModel();
    const mainnetUsdcAddress = getPaymentMintConfig("USDC").addresses.mainnet;

    expect(checkout).toMatchObject({
      paymentMode: "umbra",
      privacyRail: "umbra",
      presentationMode: "demo",
      demoNotice: DEMO_CHECKOUT_NOTICE,
      solanaPayUrl: null,
      mint: "USDC",
      mintNotice: null,
      receiverAddress: DEMO_MERCHANT_RECEIVER_ADDRESS,
      configurationError: null,
      statusEndpoint: null,
    });
    expect(checkout.mintAddress).toBe(mainnetUsdcAddress);
    expect(checkout.umbra).toMatchObject({
      network: "mainnet",
      merchantReady: true,
      merchantWalletAddress: DEMO_MERCHANT_RECEIVER_ADDRESS,
      mintAddress: mainnetUsdcAddress,
      mintNotice: null,
      isTestMint: false,
      latestPayment: null,
    });
  });
});
