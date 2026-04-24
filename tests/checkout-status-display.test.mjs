import { describe, expect, test } from "bun:test";

import {
  getCheckoutPaymentDisplayStatus,
  mapCheckoutPaymentStatus,
} from "../features/checkout/status.ts";

describe("getCheckoutPaymentDisplayStatus", () => {
  test("keeps demo waiting copy preview-only", () => {
    const liveStatus = mapCheckoutPaymentStatus("Sent");
    const demoStatus = getCheckoutPaymentDisplayStatus(liveStatus, "demo");
    const demoCopy = `${demoStatus.statusLabel} ${demoStatus.statusDescription}`.toLowerCase();

    expect(liveStatus.statusDescription.toLowerCase()).toContain("qr code");
    expect(demoStatus.statusDescription).toBe(
      "Preview state for the Umbra mainnet demo checkout.",
    );
    expect(demoCopy).not.toContain("qr");
    expect(demoCopy).not.toContain("solana pay");
    expect(demoCopy).not.toContain("wallet");
    expect(demoCopy).not.toContain("connect");
    expect(demoCopy).not.toContain("required");
    expect(demoCopy).not.toContain("action");
  });
});
