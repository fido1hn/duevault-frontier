import { UMBRA_MAINNET_MINTS } from "@/lib/umbra/sdk";

export type UmbraRegistrationResult = {
  mode: "stub";
  message: string;
};

export type PrivateBalanceSnapshot = {
  mode: "placeholder";
  mint: "USDC";
  amountAtomic: string;
};

export type PrivatePaymentResult = {
  mode: "stub";
  status: "queued";
};

export async function registerUser(): Promise<UmbraRegistrationResult> {
  return {
    mode: "stub",
    message: "Settlemark Umbra registration is not wired in step 1.",
  };
}

export async function getPrivateBalance(): Promise<PrivateBalanceSnapshot> {
  return {
    mode: "placeholder",
    mint: "USDC",
    amountAtomic: "0",
  };
}

export async function createPrivatePayment(): Promise<PrivatePaymentResult> {
  return {
    mode: "stub",
    status: "queued",
  };
}

export async function claimIncomingPayments(): Promise<PrivatePaymentResult> {
  return {
    mode: "stub",
    status: "queued",
  };
}

export { UMBRA_MAINNET_MINTS };
