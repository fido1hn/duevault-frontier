-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantWallet" TEXT NOT NULL,
    "amountAtomic" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT NOT NULL DEFAULT '',
    "customerLabel" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PaymentIntent_merchantWallet_idx" ON "PaymentIntent"("merchantWallet");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");
