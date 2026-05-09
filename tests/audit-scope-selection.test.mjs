import { describe, expect, test } from "bun:test";

import {
  applyComplianceScopePreset,
  buildComplianceScopeSummary,
  getGrantableInvoicePayments,
  toggleInvoicePaymentScope,
} from "../features/audit/scope-selection.ts";

const MAY_SIG = "m".repeat(80);
const APRIL_SIG = "a".repeat(80);

function invoice(overrides = {}) {
  return {
    invoiceId: "inv_1",
    invoiceNumber: "INV-001",
    client: "Maya Client",
    amountAtomic: "1000000",
    amountNumber: 1,
    latestUmbraPayment: {
      createUtxoSignature: MAY_SIG,
      status: "confirmed",
      confirmedAt: "2026-05-08T10:00:00.000Z",
      network: "mainnet",
      mint: "USDC",
    },
    ...overrides,
  };
}

describe("compliance grant scope selection helpers", () => {
  test("only exposes invoices with confirmed Umbra payments as grantable", () => {
    const grantable = getGrantableInvoicePayments([
      invoice(),
      invoice({
        invoiceId: "inv_2",
        latestUmbraPayment: {
          createUtxoSignature: "s".repeat(80),
          status: "submitted",
          confirmedAt: null,
          network: "mainnet",
          mint: "USDC",
        },
      }),
      invoice({ invoiceId: "inv_3", latestUmbraPayment: null }),
    ]);

    expect(grantable).toHaveLength(1);
    expect(grantable[0].createUtxoSignature).toBe(MAY_SIG);
  });

  test("selecting an invoice materializes its confirmed payment signature", () => {
    const grantable = getGrantableInvoicePayments([invoice()]);

    expect(toggleInvoicePaymentScope([], grantable[0])).toEqual([MAY_SIG]);
    expect(toggleInvoicePaymentScope([MAY_SIG], grantable[0])).toEqual([]);
  });

  test("last month preset freezes matching confirmed payment signatures", () => {
    const grantable = getGrantableInvoicePayments([
      invoice(),
      invoice({
        invoiceId: "inv_2",
        invoiceNumber: "INV-002",
        latestUmbraPayment: {
          createUtxoSignature: APRIL_SIG,
          status: "confirmed",
          confirmedAt: "2026-04-15T10:00:00.000Z",
          network: "mainnet",
          mint: "USDC",
        },
      }),
    ]);

    expect(
      applyComplianceScopePreset("last_month", grantable, new Date("2026-05-09")),
    ).toEqual([APRIL_SIG]);
  });

  test("summary counts invoices, transactions, total amount, and date span", () => {
    const grantable = getGrantableInvoicePayments([
      invoice(),
      invoice({
        invoiceId: "inv_2",
        amountAtomic: "2000000",
        amountNumber: 2,
        latestUmbraPayment: {
          createUtxoSignature: APRIL_SIG,
          status: "confirmed",
          confirmedAt: "2026-04-15T10:00:00.000Z",
          network: "mainnet",
          mint: "USDC",
        },
      }),
    ]);

    expect(
      buildComplianceScopeSummary(grantable, [MAY_SIG, APRIL_SIG]),
    ).toMatchObject({
      invoiceCount: 2,
      transactionCount: 2,
      totalAmountNumber: 3,
      startDate: "2026-04-15T10:00:00.000Z",
      endDate: "2026-05-08T10:00:00.000Z",
    });
  });
});
