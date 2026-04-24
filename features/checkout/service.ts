import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import {
  mapCheckoutPaymentStatus,
  type CheckoutPaymentStatus,
} from "@/features/checkout/status";
import type { PrivacyRail } from "@/features/invoices/types";
import type { PublicUmbraPaymentStatus } from "@/features/invoices/types";
import type {
  UmbraNetwork,
  UmbraRegistrationStatus,
} from "@/features/merchant-profiles/types";
import type { ResolvedPaymentMintConfig } from "@/features/payments/mints";
import { getUmbraCheckoutMint, getUmbraRuntimeNetwork } from "@/lib/umbra/config";

export { mapCheckoutPaymentStatus };
export type { CheckoutPaymentStatus };

export type CheckoutPresentationMode = "live" | "demo";

export type CheckoutPaymentLineItem = {
  id: string;
  description: string;
  quantity: number;
  amountDisplay: string;
};

export type CheckoutPaymentSource = "database" | "payment_intent" | "demo";

export type CheckoutPaymentViewModel = {
  publicId: string | null;
  invoiceNumber: string;
  merchantName: string;
  amountNumber: number;
  amountDisplay: string;
  amountAtomic: string | null;
  mint: string;
  mintAddress: string | null;
  mintDisplayName: string;
  mintDecimals: number;
  isTestMint: boolean;
  mintNotice: string | null;
  dueLong: string;
  lineItems: CheckoutPaymentLineItem[];
  receiverAddress: string | null;
  solanaPayUrl: string | null;
  memo: string;
  label: string;
  message: string;
  source: CheckoutPaymentSource;
  privacyRail: PrivacyRail;
  presentationMode: CheckoutPresentationMode;
  demoNotice: string | null;
  paymentMode: "solana_pay" | "umbra";
  statusEndpoint: string | null;
  paymentStatus: CheckoutPaymentStatus;
  configurationError: string | null;
  umbra: CheckoutUmbraPaymentViewModel | null;
};

export type CheckoutUmbraPaymentViewModel = {
  publicId: string;
  network: UmbraNetwork;
  merchantStatus: UmbraRegistrationStatus;
  merchantReady: boolean;
  merchantWalletAddress: string | null;
  amountAtomic: string;
  mintAddress: string | null;
  mintDisplayName: string;
  mintDecimals: number;
  isTestMint: boolean;
  mintNotice: string | null;
  optionalData: string;
  latestPayment: PublicUmbraPaymentStatus | null;
};

type CheckoutPaymentConfig =
  | {
      isConfigured: true;
      network: UmbraNetwork;
      receiverAddress: string;
      mint: ResolvedPaymentMintConfig;
    }
  | {
      isConfigured: false;
      network: UmbraNetwork;
      error: string;
      receiverAddress: null;
      mint: ResolvedPaymentMintConfig | null;
    };

export const CHECKOUT_UMBRA_OPTIONAL_DATA_PREFIX = "duevault:invoice:";

function validatePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} must be a valid Solana address.`);
  }
}

function formatSolanaPayAmount(amount: number) {
  return amount.toFixed(6).replace(/\.?0+$/, "");
}

export function getCheckoutPaymentConfig(): CheckoutPaymentConfig {
  const network = getUmbraRuntimeNetwork();
  const receiverAddress = process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS?.trim();
  let mint: ResolvedPaymentMintConfig;

  try {
    mint = getUmbraCheckoutMint();
    validatePublicKey(mint.address, `${mint.displayName} mint`);
  } catch (error) {
    return {
      isConfigured: false,
      network,
      error:
        error instanceof Error
          ? error.message
          : "Checkout mint is not configured correctly.",
      receiverAddress: null,
      mint: null,
    };
  }

  if (!receiverAddress) {
    return {
      isConfigured: false,
      network,
      error:
        "Payment address not configured. Add NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS to enable QR checkout.",
      receiverAddress: null,
      mint,
    };
  }

  try {
    return {
      isConfigured: true,
      network,
      receiverAddress: validatePublicKey(receiverAddress, "Payment address"),
      mint,
    };
  } catch (error) {
    return {
      isConfigured: false,
      network,
      error:
        error instanceof Error
          ? error.message
          : "Payment address must be a valid Solana address.",
      receiverAddress: null,
      mint,
    };
  }
}

export function buildUmbraInvoiceOptionalData(publicId: string) {
  return createHash("sha256")
    .update(`${CHECKOUT_UMBRA_OPTIONAL_DATA_PREFIX}${publicId}`)
    .digest("hex");
}

export function buildSolanaPayUrl({
  amountNumber,
  label,
  memo,
  message,
  receiverAddress,
  mintAddress,
}: {
  amountNumber: number;
  label: string;
  memo: string;
  message: string;
  receiverAddress: string;
  mintAddress: string;
}) {
  const params = new URLSearchParams({
    amount: formatSolanaPayAmount(amountNumber),
    "spl-token": mintAddress,
    label,
    message,
    memo,
  });

  return `solana:${receiverAddress}?${params.toString()}`;
}
