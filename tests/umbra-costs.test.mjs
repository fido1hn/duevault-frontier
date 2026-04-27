import { describe, expect, test } from "bun:test";

import {
  formatAtomicTokenAmount,
  formatSolLamports,
  getUmbraBalanceReadiness,
  UMBRA_COST_ESTIMATE_LAMPORTS,
} from "../features/umbra/costs.ts";

describe("Umbra cost estimates", () => {
  test("uses conservative static SOL estimates", () => {
    expect(UMBRA_COST_ESTIMATE_LAMPORTS.registeredPayment).toBe(6_000_000n);
    expect(UMBRA_COST_ESTIMATE_LAMPORTS.firstTimeCustomerPayment).toBe(
      21_000_000n,
    );
    expect(UMBRA_COST_ESTIMATE_LAMPORTS.merchantRegistration).toBe(15_000_000n);
  });

  test("formats SOL lamports without noisy trailing decimals", () => {
    expect(formatSolLamports(0n)).toBe("0 SOL");
    expect(formatSolLamports(6_000_000n)).toBe("0.006 SOL");
    expect(formatSolLamports(1_234_567_890n)).toBe("1.23456789 SOL");
  });

  test("formats atomic token balances with mint decimals", () => {
    expect(formatAtomicTokenAmount(1_234_500n, 6, "USDC")).toBe("1.2345 USDC");
    expect(formatAtomicTokenAmount(10_000_000_000n, 9, "UMBRA-DEV")).toBe(
      "10 UMBRA-DEV",
    );
  });

  test("compares wallet balances against required SOL and token amounts", () => {
    expect(
      getUmbraBalanceReadiness({
        solBalanceLamports: 20_000_000n,
        tokenBalanceAtomic: 1_000_000n,
        requiredSolLamports: 21_000_000n,
        requiredTokenAtomic: 1_000_000n,
      }),
    ).toMatchObject({
      hasEnoughSol: false,
      hasEnoughToken: true,
    });

    expect(
      getUmbraBalanceReadiness({
        solBalanceLamports: 21_000_000n,
        tokenBalanceAtomic: 999_999n,
        requiredSolLamports: 21_000_000n,
        requiredTokenAtomic: 1_000_000n,
      }),
    ).toMatchObject({
      hasEnoughSol: true,
      hasEnoughToken: false,
    });
  });
});
