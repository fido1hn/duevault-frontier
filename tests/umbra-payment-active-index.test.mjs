import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const MIGRATION_PATH =
  "prisma/migrations/20260422170000_one_active_umbra_payment_per_invoice/migration.sql";

describe("Umbra active payment migration", () => {
  test("enforces one submitted or confirmed payment per invoice", async () => {
    const migration = await readFile(MIGRATION_PATH, "utf8");

    expect(migration).toContain("CREATE UNIQUE INDEX");
    expect(migration).toContain('"UmbraInvoicePayment_one_active_per_invoice_key"');
    expect(migration).toContain('ON "UmbraInvoicePayment"("invoiceId")');
    expect(migration).toContain("WHERE \"status\" IN ('submitted', 'confirmed')");
  });
});
