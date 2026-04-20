import { PublicKey } from "@solana/web3.js";
import {
  mapCheckoutPaymentStatus,
  type CheckoutPaymentStatus,
} from "@/features/checkout/status";

export { mapCheckoutPaymentStatus };
export type { CheckoutPaymentStatus };

export type CheckoutPaymentLineItem = {
  id: string;
  description: string;
  quantity: number;
  amountDisplay: string;
};

export type CheckoutPaymentSource = "database" | "demo";

export type CheckoutPaymentViewModel = {
  invoiceNumber: string;
  merchantName: string;
  amountNumber: number;
  amountDisplay: string;
  mint: string;
  dueLong: string;
  lineItems: CheckoutPaymentLineItem[];
  receiverAddress: string | null;
  solanaPayUrl: string | null;
  memo: string;
  label: string;
  message: string;
  source: CheckoutPaymentSource;
  statusEndpoint: string | null;
  paymentStatus: CheckoutPaymentStatus;
  configurationError: string | null;
};

type CheckoutPaymentConfig =
  | {
      isConfigured: true;
      receiverAddress: string;
      usdcMint: string;
    }
  | {
      isConfigured: false;
      error: string;
      receiverAddress: null;
      usdcMint: string | null;
    };

const DEFAULT_DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

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
  const receiverAddress = process.env.NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS?.trim();
  const configuredMint =
    process.env.NEXT_PUBLIC_CHECKOUT_USDC_MINT?.trim() ??
    DEFAULT_DEVNET_USDC_MINT;

  let usdcMint: string;

  try {
    usdcMint = validatePublicKey(configuredMint, "USDC mint");
  } catch (error) {
    return {
      isConfigured: false,
      error:
        error instanceof Error
          ? error.message
          : "USDC mint must be a valid Solana address.",
      receiverAddress: null,
      usdcMint: null,
    };
  }

  if (!receiverAddress) {
    return {
      isConfigured: false,
      error:
        "Payment address not configured. Add NEXT_PUBLIC_CHECKOUT_RECIPIENT_ADDRESS to enable QR checkout.",
      receiverAddress: null,
      usdcMint,
    };
  }

  try {
    return {
      isConfigured: true,
      receiverAddress: validatePublicKey(receiverAddress, "Payment address"),
      usdcMint,
    };
  } catch (error) {
    return {
      isConfigured: false,
      error:
        error instanceof Error
          ? error.message
          : "Payment address must be a valid Solana address.",
      receiverAddress: null,
      usdcMint,
    };
  }
}

export function buildSolanaPayUrl({
  amountNumber,
  label,
  memo,
  message,
  receiverAddress,
  usdcMint,
}: {
  amountNumber: number;
  label: string;
  memo: string;
  message: string;
  receiverAddress: string;
  usdcMint: string;
}) {
  const params = new URLSearchParams({
    amount: formatSolanaPayAmount(amountNumber),
    "spl-token": usdcMint,
    label,
    message,
    memo,
  });

  return `solana:${receiverAddress}?${params.toString()}`;
}
