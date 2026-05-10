import { describe, expect, test } from "bun:test";

import { getPaymentMintConfig } from "../features/payments/mints.ts";
import {
  atomicToNumber,
  parsePaymentAmountToAtomic,
} from "../features/invoices/validators.ts";

describe("payment mint catalog", () => {
  test("resolves mainnet USDC", () => {
    expect(getPaymentMintConfig("USDC")).toMatchObject({
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      id: "USDC",
    });
  });

});

describe("payment amount conversion", () => {
  test("parses and formats USDC with 6 decimals", () => {
    expect(parsePaymentAmountToAtomic("1.234567", "USDC")).toBe("1234567");
    expect(atomicToNumber("1234567", "USDC")).toBe(1.234567);
  });

  test("rejects amounts beyond the mint decimals", () => {
    expect(() => parsePaymentAmountToAtomic("1.2345678", "USDC")).toThrow(
      /6 decimal places/,
    );
  });
});
