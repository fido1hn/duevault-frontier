ALTER TABLE "UmbraInvoicePayment"
ADD COLUMN "claimableH1Hash" TEXT,
ADD COLUMN "claimableH2Hash" TEXT,
ADD COLUMN "claimableTreeIndex" TEXT,
ADD COLUMN "claimableInsertionIndex" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "claimResult" JSONB;
