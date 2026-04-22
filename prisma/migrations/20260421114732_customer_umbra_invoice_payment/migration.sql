-- CreateTable
CREATE TABLE "UmbraInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "merchantProfileId" TEXT NOT NULL,
    "payerWalletAddress" TEXT NOT NULL,
    "merchantUmbraWalletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "amountAtomic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "optionalData" TEXT NOT NULL,
    "closeProofAccountSignature" TEXT,
    "createProofAccountSignature" TEXT NOT NULL,
    "createUtxoSignature" TEXT NOT NULL,
    "error" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmbraInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UmbraInvoicePayment_createUtxoSignature_key" ON "UmbraInvoicePayment"("createUtxoSignature");

-- CreateIndex
CREATE INDEX "UmbraInvoicePayment_invoiceId_idx" ON "UmbraInvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "UmbraInvoicePayment_merchantProfileId_idx" ON "UmbraInvoicePayment"("merchantProfileId");

-- CreateIndex
CREATE INDEX "UmbraInvoicePayment_invoiceId_status_idx" ON "UmbraInvoicePayment"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "UmbraInvoicePayment_payerWalletAddress_idx" ON "UmbraInvoicePayment"("payerWalletAddress");

-- AddForeignKey
ALTER TABLE "UmbraInvoicePayment" ADD CONSTRAINT "UmbraInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmbraInvoicePayment" ADD CONSTRAINT "UmbraInvoicePayment_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
