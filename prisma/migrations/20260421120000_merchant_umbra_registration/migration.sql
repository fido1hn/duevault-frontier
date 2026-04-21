ALTER TABLE "MerchantProfile"
ADD COLUMN "umbraNetwork" TEXT NOT NULL DEFAULT 'devnet',
ADD COLUMN "umbraStatus" TEXT NOT NULL DEFAULT 'not_setup',
ADD COLUMN "umbraRegisteredAt" TIMESTAMP(3),
ADD COLUMN "umbraWalletAddress" TEXT,
ADD COLUMN "umbraRegistrationSignatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "umbraLastCheckedAt" TIMESTAMP(3);

CREATE INDEX "MerchantProfile_umbraStatus_idx" ON "MerchantProfile"("umbraStatus");
CREATE INDEX "MerchantProfile_umbraWalletAddress_idx" ON "MerchantProfile"("umbraWalletAddress");
