import { describe, expect, test } from "bun:test";

import { normalizeUmbraError } from "../features/umbra/errors.ts";

describe("normalizeUmbraError", () => {
  test("maps network failures to retryable user copy", () => {
    const normalized = normalizeUmbraError(
      "Auditor x25519 registration",
      new Error("Failed to fetch"),
    );

    expect(normalized.category).toBe("network");
    expect(normalized.userMessage).toContain("Retry");
    expect(normalized.debugMessage).toContain("Failed to fetch");
  });

  test("maps wallet rejection to cancellation copy", () => {
    const normalized = normalizeUmbraError(
      "Auditor x25519 registration",
      new Error("User rejected the request"),
    );

    expect(normalized.category).toBe("user_rejected");
    expect(normalized.userMessage).toBe("You cancelled the wallet approval.");
  });

  test("maps insufficient SOL from error messages", () => {
    const normalized = normalizeUmbraError(
      "Auditor x25519 registration",
      new Error("Transaction failed: insufficient lamports for fee"),
    );

    expect(normalized.category).toBe("insufficient_sol");
    expect(normalized.userMessage).toBe(
      "Add SOL for Umbra setup and transaction fees.",
    );
  });

  test("maps insufficient SOL from simulation logs", () => {
    const normalized = normalizeUmbraError("Auditor x25519 registration", {
      message: "Transaction simulation failed",
      logs: ["Program log: insufficient funds for rent"],
    });

    expect(normalized.category).toBe("insufficient_sol");
    expect(normalized.debugMessage).toContain("insufficient funds for rent");
  });

  test("maps missing x25519 account errors", () => {
    const normalized = normalizeUmbraError(
      "Auditor grant check",
      new Error("Auditor must register an Umbra X25519 key before continuing"),
    );

    expect(normalized.category).toBe("missing_registration");
    expect(normalized.userMessage).toBe(
      "Register your Umbra x25519 key to continue.",
    );
  });

  test("hides unknown raw errors from users but keeps debug detail", () => {
    const normalized = normalizeUmbraError(
      "Auditor x25519 registration",
      new Error("internal sdk stack detail"),
    );

    expect(normalized.category).toBe("unknown");
    expect(normalized.userMessage).toBe(
      "Auditor x25519 registration could not be completed. Please try again.",
    );
    expect(normalized.debugMessage).toContain("internal sdk stack detail");
  });
});
