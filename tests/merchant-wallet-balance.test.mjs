import { describe, expect, test } from "bun:test";

import {
  formatAtomicTokenAmount,
  getMerchantBalanceView,
  parseMerchantWithdrawAmount,
  validateMerchantWithdrawAmount,
} from "../features/wallet/merchant-balance.ts";

describe("merchant wallet balance helpers", () => {
  test("formats atomic token amounts without losing precision", () => {
    expect(formatAtomicTokenAmount(0n, 6, "USDC")).toBe("0 USDC");
    expect(formatAtomicTokenAmount(1_200_000n, 6, "USDC")).toBe("1.2 USDC");
    expect(formatAtomicTokenAmount(1_234_567n, 6, "USDC")).toBe(
      "1.234567 USDC",
    );
    expect(formatAtomicTokenAmount(42n, 9, "UMBRA-DEV")).toBe(
      "0.000000042 UMBRA-DEV",
    );
  });

  test("normalizes Umbra encrypted balance states for the dashboard", () => {
    expect(
      getMerchantBalanceView({ state: "shared", balance: 2_500_000n }, 6, "USDC"),
    ).toEqual({
      state: "available",
      atomicAmount: 2_500_000n,
      displayAmount: "2.5 USDC",
      canWithdraw: true,
      label: "Available",
      description: "Private merchant balance ready to withdraw.",
    });

    expect(getMerchantBalanceView({ state: "non_existent" }, 6, "USDC")).toMatchObject(
      {
        state: "empty",
        atomicAmount: 0n,
        displayAmount: "0 USDC",
        canWithdraw: false,
      },
    );

    expect(getMerchantBalanceView({ state: "uninitialized" }, 6, "USDC")).toMatchObject(
      {
        state: "empty",
        atomicAmount: 0n,
        canWithdraw: false,
      },
    );

    expect(getMerchantBalanceView({ state: "mxe" }, 6, "USDC")).toMatchObject({
      state: "unavailable",
      atomicAmount: 0n,
      displayAmount: "Unavailable",
      canWithdraw: false,
    });
  });

  test("parses merchant withdrawal input into atomic units", () => {
    expect(parseMerchantWithdrawAmount("1.25", 6)).toBe(1_250_000n);
    expect(parseMerchantWithdrawAmount("0.000001", 6)).toBe(1n);
    expect(parseMerchantWithdrawAmount(" 12 ", 6)).toBe(12_000_000n);
  });

  test("rejects invalid withdrawal amounts", () => {
    expect(() => parseMerchantWithdrawAmount("", 6)).toThrow(/Enter an amount/);
    expect(() => parseMerchantWithdrawAmount("0", 6)).toThrow(/greater than zero/);
    expect(() => parseMerchantWithdrawAmount("-1", 6)).toThrow(/valid amount/);
    expect(() => parseMerchantWithdrawAmount("1.0000001", 6)).toThrow(
      /6 decimal places/,
    );
  });

  test("validates withdrawal amount against available balance", () => {
    expect(validateMerchantWithdrawAmount("1", 2_000_000n, 6)).toEqual({
      ok: true,
      atomicAmount: 1_000_000n,
    });

    expect(validateMerchantWithdrawAmount("3", 2_000_000n, 6)).toEqual({
      ok: false,
      error: "Withdrawal amount exceeds the private balance.",
    });
  });
});
