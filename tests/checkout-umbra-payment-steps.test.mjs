import { describe, expect, test } from "bun:test";
import { PAYMENT_STEPS } from "../features/checkout/payment-steps.ts";

describe("PAYMENT_STEPS", () => {
  test("has exactly 7 steps", () => {
    expect(PAYMENT_STEPS).toHaveLength(7);
  });

  test("step IDs match the new model", () => {
    const ids = PAYMENT_STEPS.map((s) => s.id);
    expect(ids).toEqual([
      "wallet",
      "checking",
      "customer_registration",
      "preparing_payment",
      "create_utxo",
      "saving",
      "complete",
    ]);
  });

  test("every step has a non-empty label", () => {
    for (const step of PAYMENT_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  test("does not contain removed step IDs", () => {
    const ids = PAYMENT_STEPS.map((s) => s.id);
    const removed = [
      "preflight",
      "customer_account",
      "customer_encryption",
      "customer_anonymous",
      "customer_verifying",
      "payment_preflight",
      "master_seed",
      "proof_generation",
    ];
    for (const id of removed) {
      expect(ids).not.toContain(id);
    }
  });
});
