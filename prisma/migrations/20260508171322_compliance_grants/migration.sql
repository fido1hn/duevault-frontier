-- CreateTable
CREATE TABLE "ComplianceGrant" (
    "id" TEXT NOT NULL,
    "merchantProfileId" TEXT NOT NULL,
    "granterAddress" TEXT NOT NULL,
    "auditorAddress" TEXT NOT NULL,
    "granterX25519" BYTEA NOT NULL,
    "auditorX25519" BYTEA NOT NULL,
    "grantNonce" TEXT NOT NULL,
    "issuanceSignature" TEXT NOT NULL,
    "invoiceScopeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "label" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revocationSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceGrant_merchantProfileId_idx" ON "ComplianceGrant"("merchantProfileId");

-- CreateIndex
CREATE INDEX "ComplianceGrant_auditorAddress_idx" ON "ComplianceGrant"("auditorAddress");

-- CreateIndex
CREATE INDEX "ComplianceGrant_granterAddress_idx" ON "ComplianceGrant"("granterAddress");

-- AddForeignKey
ALTER TABLE "ComplianceGrant" ADD CONSTRAINT "ComplianceGrant_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
