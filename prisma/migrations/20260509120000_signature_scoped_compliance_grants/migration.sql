ALTER TABLE "ComplianceGrant"
ADD COLUMN "paymentScopeSignatures" TEXT[] DEFAULT ARRAY[]::TEXT[];
