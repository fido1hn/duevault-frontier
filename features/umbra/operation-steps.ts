export type MerchantConfirmStepId =
  | "signing"
  | "scanning"
  | "verifying"
  | "saving"
  | "complete"
  | "error";

export type MerchantClaimStepId =
  | "signing"
  | "scanning"
  | "preparing"
  | "submitting"
  | "confirming"
  | "saving"
  | "complete"
  | "error";

export type OperationStep<Id extends string> = {
  id: Id;
  label: string;
  hint?: string;
};

export const MERCHANT_CONFIRM_STEPS: OperationStep<MerchantConfirmStepId>[] = [
  {
    id: "signing",
    label: "Connect wallet",
    hint: "Approve a signature so we can derive your Umbra scanning key.",
  },
  {
    id: "scanning",
    label: "Scan claimable UTXO",
    hint: "Arcium decrypts your stealth pool — typically the longest step.",
  },
  { id: "verifying", label: "Verify on-chain match" },
  { id: "saving", label: "Save evidence" },
  { id: "complete", label: "Done" },
];

export const MERCHANT_CLAIM_STEPS: OperationStep<MerchantClaimStepId>[] = [
  {
    id: "signing",
    label: "Connect wallet",
    hint: "Approve a signature so we can derive your Umbra scanning key.",
  },
  {
    id: "scanning",
    label: "Scan claimable UTXO",
    hint: "Arcium decrypts your stealth pool — typically the longest step.",
  },
  {
    id: "preparing",
    label: "Prepare claim",
    hint: "Generating zero-knowledge proof.",
  },
  { id: "submitting", label: "Submit to Solana" },
  { id: "confirming", label: "Confirm on-chain" },
  { id: "saving", label: "Record settlement" },
  { id: "complete", label: "Done" },
];

export const UMBRA_LONG_OPERATION_HINT =
  "ZK proof generation via Arcium typically takes 30–60 seconds. Keep this tab open.";
