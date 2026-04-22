"use client";

import { useEffect, useMemo, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import {
  useSignMessage,
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPrivyProvider } from "@/components/providers/privy-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOLANA_WALLET_LIST } from "@/features/auth/privy-wallets";
import {
  runCustomerUmbraPayment,
  type CustomerUmbraPaymentResult,
  type CustomerUmbraPaymentStepId,
} from "@/features/checkout/umbra-payment";
import type { CheckoutUmbraPaymentViewModel } from "@/features/checkout/service";
import type {
  InvoiceStatus,
  PublicUmbraPaymentStatus,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";

type CheckoutUmbraPaymentProps = {
  amountDisplay: string;
  mint: string;
  onPaymentSaved: (
    payment: PublicUmbraPaymentStatus,
    status: InvoiceStatus,
  ) => void;
  onStatusRefresh: () => void;
  umbra: CheckoutUmbraPaymentViewModel;
};

type SaveUmbraPaymentResponse = {
  invoice?: {
    status: InvoiceStatus;
  };
  payment?: PublicUmbraPaymentStatus;
  error?: string;
};

const PAYMENT_STEPS: {
  id: CustomerUmbraPaymentStepId;
  label: string;
}[] = [
  { id: "wallet", label: "Wallet" },
  { id: "checking", label: "Merchant check" },
  { id: "preflight", label: "Balance check" },
  { id: "customer_account", label: "Customer account" },
  { id: "customer_encryption", label: "Encryption key" },
  { id: "customer_anonymous", label: "Anonymous key" },
  { id: "customer_verifying", label: "Customer ready" },
  { id: "payment_preflight", label: "Payment balance" },
  { id: "master_seed", label: "Umbra signature" },
  { id: "proof_generation", label: "Proof account" },
  { id: "create_utxo", label: "Private payment" },
  { id: "saving", label: "Save result" },
  { id: "complete", label: "Complete" },
];

function truncateAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

async function saveUmbraPayment(publicId: string, result: CustomerUmbraPaymentResult) {
  const response = await fetch(
    `/api/checkout/${encodeURIComponent(publicId)}/umbra-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    },
  );
  const payload = (await response.json()) as SaveUmbraPaymentResponse;

  if (!response.ok || !payload.payment || !payload.invoice) {
    throw new Error(payload.error ?? "Unable to save Umbra payment.");
  }

  return {
    invoiceStatus: payload.invoice.status,
    payment: payload.payment,
  };
}

function MissingPrivyFallback() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Wallet connection is not configured</p>
          <p className="mt-2 leading-relaxed">
            Add NEXT_PUBLIC_PRIVY_APP_ID to enable private checkout payments.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CheckoutUmbraPayment(props: CheckoutUmbraPaymentProps) {
  return (
    <AppPrivyProvider missingAppIdFallback={<MissingPrivyFallback />}>
      <CheckoutUmbraPaymentInner {...props} />
    </AppPrivyProvider>
  );
}

function CheckoutUmbraPaymentInner({
  amountDisplay,
  mint,
  onPaymentSaved,
  onStatusRefresh,
  umbra,
}: CheckoutUmbraPaymentProps) {
  const { authenticated, linkWallet, ready } = usePrivy();
  const { login } = useLogin();
  const solanaWallets = useWallets();
  const { signMessage } = useSignMessage();
  const { signTransaction } = useSignTransaction();
  const [currentStep, setCurrentStep] =
    useState<CustomerUmbraPaymentStepId | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<
    string | null
  >(null);
  const [savedPayment, setSavedPayment] =
    useState<SerializedUmbraInvoicePayment | null>(null);
  const effectivePaymentStatus = savedPayment ?? umbra.latestPayment;
  const selectedWallet = useMemo(
    () =>
      selectedWalletAddress
        ? solanaWallets.wallets.find(
            (wallet) => wallet.address === selectedWalletAddress,
          ) ?? null
        : null,
    [selectedWalletAddress, solanaWallets.wallets],
  );
  const customerWalletAddress = selectedWallet?.address ?? null;
  const isPaymentRunning =
    currentStep !== null &&
    currentStep !== "complete" &&
    currentStep !== "error";
  const hasConfirmedPayment = effectivePaymentStatus?.status === "confirmed";
  const hasSubmittedPayment = effectivePaymentStatus?.status === "submitted";
  const hasPaymentInReview = hasSubmittedPayment || hasConfirmedPayment;
  const isReadyToPay =
    umbra.merchantReady &&
    umbra.merchantWalletAddress !== null &&
    umbra.mintAddress !== null;

  useEffect(() => {
    if (!solanaWallets.ready) {
      return;
    }

    if (solanaWallets.wallets.length === 0) {
      setSelectedWalletAddress(null);
      return;
    }

    if (
      selectedWalletAddress &&
      solanaWallets.wallets.some(
        (wallet) => wallet.address === selectedWalletAddress,
      )
    ) {
      return;
    }

    setSelectedWalletAddress(solanaWallets.wallets[0].address);
  }, [selectedWalletAddress, solanaWallets.ready, solanaWallets.wallets]);

  async function copyValue(label: string, value: string | null | undefined) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  async function handlePayPrivately() {
    if (hasPaymentInReview || isPaymentRunning) {
      return;
    }

    if (!ready) {
      return;
    }

    if (!authenticated) {
      login({
        loginMethods: ["wallet"],
        walletChainType: "solana-only",
      });
      return;
    }

    if (!selectedWallet) {
      linkWallet({
        walletChainType: "solana-only",
        walletList: SOLANA_WALLET_LIST,
      });
      return;
    }

    if (!isReadyToPay) {
      toast.error("Merchant Umbra checkout is not ready.");
      return;
    }

    const merchantUmbraWalletAddress = umbra.merchantWalletAddress;
    const mintAddress = umbra.mintAddress;

    if (!merchantUmbraWalletAddress || !mintAddress) {
      toast.error("Merchant Umbra checkout is not ready.");
      return;
    }

    setPaymentError("");

    try {
      const paymentResult = await runCustomerUmbraPayment({
        wallet: selectedWallet,
        signTransaction,
        signMessage,
        merchantUmbraWalletAddress,
        mintAddress,
        amountAtomic: umbra.amountAtomic,
        mintDisplayName: umbra.mintDisplayName,
        mintDecimals: umbra.mintDecimals,
        optionalData: umbra.optionalData,
        onStep: setCurrentStep,
      });

      setCurrentStep("saving");
      const saved = await saveUmbraPayment(umbra.publicId, paymentResult);
      setSavedPayment({
        id: "",
        invoiceId: "",
        merchantProfileId: "",
        payerWalletAddress: paymentResult.payerWalletAddress,
        merchantUmbraWalletAddress: paymentResult.merchantUmbraWalletAddress,
        network: umbra.network,
        mint: paymentResult.mint,
        amountAtomic: paymentResult.amountAtomic,
        status: saved.payment.status,
        optionalData: paymentResult.optionalData,
        closeProofAccountSignature:
          paymentResult.closeProofAccountSignature ?? null,
        createProofAccountSignature: paymentResult.createProofAccountSignature,
        createUtxoSignature: paymentResult.createUtxoSignature,
        error: null,
        confirmedAt: saved.payment.confirmedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onPaymentSaved(saved.payment, saved.invoiceStatus);
      setCurrentStep("complete");
      toast.success("Private payment submitted.");
      onStatusRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit Umbra payment.";
      setCurrentStep("error");
      setPaymentError(message);
      toast.error(message);
    }
  }

  function getPrimaryActionLabel() {
    if (hasConfirmedPayment) {
      return "Payment confirmed";
    }

    if (hasSubmittedPayment) {
      return "Awaiting merchant confirmation";
    }

    if (isPaymentRunning) {
      return currentStep?.startsWith("customer")
        ? "Setting up Umbra"
        : "Submitting payment";
    }

    if (!ready || (authenticated && !solanaWallets.ready)) {
      return "Loading wallet";
    }

    if (!authenticated) {
      return "Connect wallet";
    }

    if (!customerWalletAddress) {
      return "Link Solana wallet";
    }

    return "Pay privately";
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
              <ShieldCheck className="size-3.5" />
              Umbra private checkout
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">
              {amountDisplay}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Requires {umbra.network} SOL for Umbra setup and fees, plus{" "}
              {mint} for the invoice amount.
            </p>
            {umbra.isTestMint && umbra.mintNotice && (
              <p className="mt-2 text-xs font-medium leading-relaxed text-amber-700">
                {umbra.mintNotice}
              </p>
            )}
          </div>
          <Button
            type="button"
            disabled={
              !ready ||
              (authenticated && !solanaWallets.ready) ||
              isPaymentRunning ||
              hasPaymentInReview ||
              !isReadyToPay
            }
            onClick={() => void handlePayPrivately()}
          >
            {isPaymentRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasPaymentInReview ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Wallet className="size-4" />
            )}
            {getPrimaryActionLabel()}
          </Button>
        </div>

        {!isReadyToPay && (
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
            Merchant Umbra setup is not ready for this checkout.
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Customer wallet</p>
            {solanaWallets.wallets.length > 1 ? (
              <Select
                value={selectedWalletAddress ?? undefined}
                disabled={isPaymentRunning}
                onValueChange={setSelectedWalletAddress}
              >
                <SelectTrigger className="mt-2 bg-white font-mono">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {solanaWallets.wallets.map((wallet) => (
                    <SelectItem key={wallet.address} value={wallet.address}>
                      {wallet.standardWallet.name} {truncateAddress(wallet.address)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1 truncate font-mono text-sm text-slate-900">
                {customerWalletAddress
                  ? truncateAddress(customerWalletAddress)
                  : "Not connected"}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Merchant receiver</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="truncate font-mono text-sm text-slate-900">
                {umbra.merchantWalletAddress
                  ? truncateAddress(umbra.merchantWalletAddress)
                  : "Not ready"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!umbra.merchantWalletAddress}
                onClick={() =>
                  copyValue("Merchant receiver", umbra.merchantWalletAddress)
                }
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {PAYMENT_STEPS.map((step, index) => {
            const currentIndex = PAYMENT_STEPS.findIndex(
              (candidate) => candidate.id === currentStep,
            );
            const isComplete =
              hasPaymentInReview ||
              currentStep === "complete" ||
              (currentIndex > index && currentIndex !== -1);
            const isActive = currentStep === step.id && !hasConfirmedPayment;

            return (
              <div
                key={step.id}
                className="flex min-h-16 items-start gap-2 rounded-lg border border-white/70 bg-white p-3"
              >
                <div className="mt-0.5 text-emerald-700">
                  {isComplete ? (
                    <CheckCircle2 className="size-4" />
                  ) : isActive ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Circle className="size-4 text-slate-300" />
                  )}
                </div>
                <p className="text-xs font-medium leading-snug text-slate-700">
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {savedPayment ? (
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">
              Payment signatures
            </p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600">
              <SignatureRow
                label="Proof account"
                signature={savedPayment.createProofAccountSignature}
                onCopy={copyValue}
              />
              <SignatureRow
                label="Private payment"
                signature={savedPayment.createUtxoSignature}
                onCopy={copyValue}
              />
              {savedPayment.closeProofAccountSignature && (
                <SignatureRow
                  label="Proof cleanup"
                  signature={savedPayment.closeProofAccountSignature}
                  onCopy={copyValue}
                />
              )}
            </div>
          </div>
        ) : umbra.latestPayment ? (
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">
              Umbra payment status
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {umbra.latestPayment.status === "submitted"
                ? "Submitted and waiting for merchant confirmation."
                : "Confirmed by the merchant."}
            </p>
            {umbra.latestPayment.createUtxoSignaturePreview && (
              <p className="mt-2 font-mono text-xs text-slate-500">
                {umbra.latestPayment.createUtxoSignaturePreview}
              </p>
            )}
          </div>
        ) : null}

        {paymentError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{paymentError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignatureRow({
  label,
  onCopy,
  signature,
}: {
  label: string;
  onCopy: (label: string, value: string) => void;
  signature: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="truncate font-mono">{truncateAddress(signature)}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onCopy(label, signature)}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}
