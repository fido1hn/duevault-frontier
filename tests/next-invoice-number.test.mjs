import { describe, expect, test } from "bun:test";

import { computeNextInvoiceNumber } from "../features/invoices/next-invoice-number.ts";

function makeInvoice(invoiceNumber, createdAt) {
  return { invoiceNumber, createdAt };
}

describe("computeNextInvoiceNumber", () => {
  test("returns INV-0001 when there are no invoices", () => {
    expect(computeNextInvoiceNumber([])).toBe("INV-0001");
    expect(computeNextInvoiceNumber(undefined)).toBe("INV-0001");
  });

  test("increments the trailing number, preserving the prefix", () => {
    const invoices = [makeInvoice("DV-0007", "2026-05-10T00:00:00.000Z")];
    expect(computeNextInvoiceNumber(invoices)).toBe("DV-0008");
  });

  test("preserves zero padding when width is unchanged", () => {
    const invoices = [makeInvoice("INV-0009", "2026-05-10T00:00:00.000Z")];
    expect(computeNextInvoiceNumber(invoices)).toBe("INV-0010");
  });

  test("rolls width when padding is exceeded", () => {
    const invoices = [makeInvoice("INV-099", "2026-05-10T00:00:00.000Z")];
    expect(computeNextInvoiceNumber(invoices)).toBe("INV-100");
  });

  test("picks the most recent invoice by createdAt, not list order", () => {
    const invoices = [
      makeInvoice("DV-0001", "2026-05-01T00:00:00.000Z"),
      makeInvoice("DV-0042", "2026-05-09T00:00:00.000Z"),
      makeInvoice("DV-0010", "2026-05-05T00:00:00.000Z"),
    ];
    expect(computeNextInvoiceNumber(invoices)).toBe("DV-0043");
  });

  test("returns empty string when the most recent number has no trailing digits", () => {
    const invoices = [makeInvoice("FOO", "2026-05-10T00:00:00.000Z")];
    expect(computeNextInvoiceNumber(invoices)).toBe("");
  });

  test("uppercases the result to match the validator", () => {
    const invoices = [makeInvoice("inv-001", "2026-05-10T00:00:00.000Z")];
    expect(computeNextInvoiceNumber(invoices)).toBe("INV-002");
  });
});
