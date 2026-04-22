import { describe, expect, test } from "bun:test";

import {
  getConfiguredPaymentMintId,
  resolvePaymentMintForNetwork,
} from "../features/payments/mints.ts";
import {
  atomicToNumber,
  parsePaymentAmountToAtomic,
} from "../features/invoices/validators.ts";

describe("payment mint catalog", () => {
  test("resolves supported network and mint pairs", () => {
    expect(resolvePaymentMintForNetwork("UMBRA_DEVNET", "devnet")).toMatchObject({
      address: "GvUQDFLWYH4QHKYot787616f61m1m5eZofhYKyaBkPn9",
      decimals: 9,
      id: "UMBRA_DEVNET",
      isTestMint: true,
      network: "devnet",
    });

    expect(resolvePaymentMintForNetwork("USDC", "mainnet")).toMatchObject({
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      id: "USDC",
      isTestMint: false,
      network: "mainnet",
    });
  });

  test("fails closed for unsupported network and mint pairs", () => {
    expect(() => resolvePaymentMintForNetwork("USDC", "devnet")).toThrow(
      /not supported/,
    );
    expect(() =>
      resolvePaymentMintForNetwork("UMBRA_DEVNET", "mainnet"),
    ).toThrow(/not supported/);
  });

  test("rejects unknown configured mint ids", () => {
    expect(() => getConfiguredPaymentMintId("devnet", "NOPE")).toThrow(
      /Unsupported payment mint/,
    );
  });

  test("production requires explicit USDC checkout mint", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = "production";

    try {
      expect(() => getConfiguredPaymentMintId("mainnet", undefined)).toThrow(
        /required/,
      );
      expect(() =>
        getConfiguredPaymentMintId("devnet", "UMBRA_DEVNET"),
      ).toThrow(/USDC/);
      expect(getConfiguredPaymentMintId("mainnet", "USDC")).toBe("USDC");
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });
});

describe("payment amount conversion", () => {
  test("parses and formats USDC with 6 decimals", () => {
    expect(parsePaymentAmountToAtomic("1.234567", "USDC")).toBe("1234567");
    expect(atomicToNumber("1234567", "USDC")).toBe(1.234567);
  });

  test("parses and formats Umbra devnet mint with 9 decimals", () => {
    expect(parsePaymentAmountToAtomic("1.234567891", "UMBRA_DEVNET")).toBe(
      "1234567891",
    );
    expect(atomicToNumber("1234567891", "UMBRA_DEVNET")).toBe(1.234567891);
  });

  test("rejects amounts beyond the mint decimals", () => {
    expect(() => parsePaymentAmountToAtomic("1.2345678", "USDC")).toThrow(
      /6 decimal places/,
    );
    expect(() =>
      parsePaymentAmountToAtomic("1.2345678911", "UMBRA_DEVNET"),
    ).toThrow(/9 decimal places/);
  });
});
