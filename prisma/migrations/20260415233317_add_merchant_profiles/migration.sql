-- CreateTable
CREATE TABLE "MerchantProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "defaultNotes" TEXT NOT NULL DEFAULT 'Thank you for your business. Payment is expected within 30 days.',
    "defaultMint" TEXT NOT NULL DEFAULT 'USDC',
    "paymentRail" TEXT NOT NULL DEFAULT 'solana',
    "privacyRail" TEXT NOT NULL DEFAULT 'umbra',
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantProfile_walletAddress_key" ON "MerchantProfile"("walletAddress");

-- CreateIndex
CREATE INDEX "MerchantProfile_contactEmail_idx" ON "MerchantProfile"("contactEmail");
