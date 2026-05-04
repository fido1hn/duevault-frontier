ALTER TABLE "UmbraInvoicePayment"
ADD COLUMN "claimStatus" TEXT,
ADD COLUMN "claimAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "claimLastError" TEXT,
ADD COLUMN "claimLastAttemptedAt" TIMESTAMP(3);

UPDATE "UmbraInvoicePayment"
SET "claimStatus" = 'confirmed'
WHERE "claimedAt" IS NOT NULL;
