import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const SCHEMA_PATH = "prisma/schema.prisma";
const MIGRATION_PATH =
  "prisma/migrations/20260422173000_default_umbra_payment_status_submitted/migration.sql";

describe("Umbra payment status default", () => {
  test("defaults new payments to submitted in Prisma schema", async () => {
    const schema = await readFile(SCHEMA_PATH, "utf8");

    expect(schema).toContain('status                      String          @default("submitted")');
    expect(schema).not.toContain('status                      String          @default("confirmed")');
  });

  test("sets the database default to submitted", async () => {
    const migration = await readFile(MIGRATION_PATH, "utf8");

    expect(migration).toContain(
      'ALTER TABLE "UmbraInvoicePayment" ALTER COLUMN "status" SET DEFAULT \'submitted\';',
    );
  });
});
