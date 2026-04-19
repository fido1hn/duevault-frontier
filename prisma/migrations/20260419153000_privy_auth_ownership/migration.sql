-- This migration assumes the prototype app tables are empty.
-- No wallet-address backfill is performed.

-- DropIndex
DROP INDEX "PaymentIntent_merchantWallet_idx";

-- DropIndex
DROP INDEX "MerchantProfile_walletAddress_key";

-- DropIndex
DROP INDEX "Customer_email_key";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- AlterTable
ALTER TABLE "PaymentIntent" DROP COLUMN "merchantWallet",
ADD COLUMN     "merchantProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MerchantProfile" DROP COLUMN "walletAddress",
ADD COLUMN     "primaryWalletId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "merchantProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "merchantProfileId" TEXT NOT NULL,
ADD COLUMN     "publicId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "privyDid" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "walletClientType" TEXT,
    "connectorType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_privyDid_key" ON "User"("privyDid");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_chain_address_key" ON "Wallet"("chain", "address");

-- CreateIndex
CREATE INDEX "PaymentIntent_merchantProfileId_idx" ON "PaymentIntent"("merchantProfileId");

-- CreateIndex
CREATE INDEX "PaymentIntent_merchantProfileId_status_idx" ON "PaymentIntent"("merchantProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantProfile_userId_key" ON "MerchantProfile"("userId");

-- CreateIndex
CREATE INDEX "MerchantProfile_primaryWalletId_idx" ON "MerchantProfile"("primaryWalletId");

-- CreateIndex
CREATE INDEX "Customer_merchantProfileId_idx" ON "Customer"("merchantProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_merchantProfileId_email_key" ON "Customer"("merchantProfileId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicId_key" ON "Invoice"("publicId");

-- CreateIndex
CREATE INDEX "Invoice_merchantProfileId_idx" ON "Invoice"("merchantProfileId");

-- CreateIndex
CREATE INDEX "Invoice_merchantProfileId_dueAt_idx" ON "Invoice"("merchantProfileId", "dueAt");

-- CreateIndex
CREATE INDEX "Invoice_merchantProfileId_status_idx" ON "Invoice"("merchantProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_merchantProfileId_invoiceNumber_key" ON "Invoice"("merchantProfileId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantProfile" ADD CONSTRAINT "MerchantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantProfile" ADD CONSTRAINT "MerchantProfile_primaryWalletId_fkey" FOREIGN KEY ("primaryWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
