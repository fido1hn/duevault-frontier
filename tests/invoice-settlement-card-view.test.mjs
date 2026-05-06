import { describe, expect, test } from "bun:test";

import { getInvoiceUmbraSettlementView } from "../features/invoices/settlement-view.ts";

describe("invoice Umbra settlement card view", () => {
  test("keeps confirmed but unclaimed payments actionable", () => {
    expect(getInvoiceUmbraSettlementView("Detected", "confirmed")).toMatchObject({
      action: "continue_to_settlement",
      tone: "pending",
      title: "Umbra Payment Confirmed",
    });
  });

  test("routes submitted payments to settlement with the matching title", () => {
    expect(getInvoiceUmbraSettlementView("Detected", "submitted")).toMatchObject({
      action: "continue_to_settlement",
      tone: "pending",
      title: "Umbra Payment Submitted",
    });
  });

  test("renders claimed invoices as settled instead of pending", () => {
    expect(getInvoiceUmbraSettlementView("Claimed", "confirmed")).toMatchObject({
      action: "claimed",
      tone: "settled",
      title: "Private Settlement Claimed",
    });
  });

  test("does not show a claim action when no Umbra payment exists", () => {
    expect(getInvoiceUmbraSettlementView("Sent", null)).toMatchObject({
      action: "awaiting_payment",
      tone: "waiting",
      title: "Awaiting Umbra Payment",
    });
  });
});
