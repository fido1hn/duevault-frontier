export const queryKeys = {
  merchantProfile: ["merchant-profile"] as const,
  invoices: ["invoices"] as const,
  invoice: (invoiceId: string) => ["invoice", invoiceId] as const,
  complianceGrants: ["compliance-grants"] as const,
  complianceGrant: (grantId: string) =>
    ["compliance-grant", grantId] as const,
};
