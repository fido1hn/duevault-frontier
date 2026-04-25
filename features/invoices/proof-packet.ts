import type { SerializedInvoice } from "@/features/invoices/types";

export type ProofPacket = {
  version: "1.0";
  generatedAt: string;
  invoice: {
    id: string;
    client: string;
    clientEmail: string;
    amount: string;
    amountAtomic: string;
    mint: string;
    issued: string;
    due: string;
    notes: string;
  };
  payment: {
    network: string;
    payerWalletAddress: string;
    merchantUmbraWalletAddress: string;
    createUtxoSignature: string;
    confirmedAt: string;
  };
  merchant: {
    name: string;
    walletAddress: string;
    umbraWalletAddress: string | null;
  };
};

export function buildProofPacket(
  invoice: SerializedInvoice,
  generatedAt = new Date().toISOString(),
): ProofPacket {
  const payment = invoice.latestUmbraPayment;

  if (!payment || payment.status !== "confirmed" || !payment.confirmedAt) {
    throw new Error("Invoice does not have a confirmed Umbra payment.");
  }

  return {
    version: "1.0",
    generatedAt,
    invoice: {
      id: invoice.id,
      client: invoice.client,
      clientEmail: invoice.clientEmail,
      amount: invoice.amount,
      amountAtomic: invoice.amountAtomic,
      mint: invoice.mint,
      issued: invoice.issued,
      due: invoice.due,
      notes: invoice.notes,
    },
    payment: {
      network: payment.network,
      payerWalletAddress: payment.payerWalletAddress,
      merchantUmbraWalletAddress: payment.merchantUmbraWalletAddress,
      createUtxoSignature: payment.createUtxoSignature,
      confirmedAt: payment.confirmedAt,
    },
    merchant: {
      name: invoice.merchantName,
      walletAddress: invoice.merchantWalletAddress,
      umbraWalletAddress: invoice.merchantUmbraWalletAddress,
    },
  };
}
