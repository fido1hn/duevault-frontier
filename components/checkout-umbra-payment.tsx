"use client";

import { useEffect, useMemo, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
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
import { PAYMENT_STEPS } from "@/features/checkout/payment-steps";
import type { CheckoutUmbraPaymentViewModel } from "@/features/checkout/service";
import {
  fetchWalletUmbraBalances,
  formatAtomicTokenAmount,
  formatSolLamports,
  UMBRA_COST_ESTIMATE_LAMPORTS,
  type UmbraBalanceReadiness,
} from "@/features/umbra/costs";
import type {
  InvoiceStatus,
  PublicUmbraPaymentStatus,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";

type CheckoutUmbraPaymentProps = {
  amountDisplay: string;
  mint: string;
  mode?: "live" | "demo";
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

export function CheckoutUmbraPayment({
  mode = "live",
  ...props
}: CheckoutUmbraPaymentProps) {
  if (mode === "demo") {
    return <CheckoutUmbraPaymentDemo {...props} />;
  }

  return (
    <AppPrivyProvider missingAppIdFallback={<MissingPrivyFallback />}>
      <CheckoutUmbraPaymentInner {...props} />
    </AppPrivyProvider>
  );
}

function CheckoutUmbraPaymentDemo({
  amountDisplay,
  mint,
  umbra,
}: CheckoutUmbraPaymentProps) {
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
              Mainnet preview for private {mint} settlement.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800">
            Demo preview only
          </div>
        </div>

        <div className="rounded-lg border border-white/70 bg-white p-4 text-sm leading-relaxed text-slate-700">
          This page shows the final Umbra checkout presentation without starting
          wallet, Privy, or on-chain payment flows.
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Merchant receiver</p>
            <p className="mt-1 truncate font-mono text-sm text-slate-900">
              {umbra.merchantWalletAddress
                ? truncateAddress(umbra.merchantWalletAddress)
                : "Not ready"}
            </p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Settlement mint</p>
            <p className="mt-1 text-sm text-slate-900">{mint}</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Network</p>
            <p className="mt-1 text-sm text-slate-900 capitalize">
              {umbra.network}
            </p>
          </div>
        </div>
      </div>
    </div>
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
  const runtimeConfig = useMemo(() => getUmbraRuntimeConfig(), []);
  const [currentStep, setCurrentStep] =
    useState<CustomerUmbraPaymentStepId | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [balanceReadiness, setBalanceReadiness] =
    useState<UmbraBalanceReadiness | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<
    string | null
  >(null);
  const [savedPayment, setSavedPayment] =
    useState<SerializedUmbraInvoicePayment | null>(null);
  const {
    wallets: solanaWallets,
    walletsReady,
    wallet: selectedWallet,
    signTransaction,
    signMessage,
  } = usePrivyUmbraSigner(selectedWalletAddress);
  const effectivePaymentStatus = savedPayment ?? umbra.latestPayment;
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
  const requiredSolLamports =
    UMBRA_COST_ESTIMATE_LAMPORTS.firstTimeCustomerPayment;
  const blocksPaymentForBalance =
    balanceReadiness !== null &&
    (!balanceReadiness.hasEnoughSol || !balanceReadiness.hasEnoughToken);

  useEffect(() => {
    if (!walletsReady) {
      return;
    }

    if (solanaWallets.length === 0) {
      setSelectedWalletAddress(null);
      return;
    }

    if (
      selectedWalletAddress &&
      solanaWallets.some(
        (wallet) => wallet.address === selectedWalletAddress,
      )
    ) {
      return;
    }

    setSelectedWalletAddress(solanaWallets[0].address);
  }, [selectedWalletAddress, walletsReady, solanaWallets]);

  useEffect(() => {
    if (!customerWalletAddress || !umbra.mintAddress || !umbra.amountAtomic) {
      setBalanceReadiness(null);
      setBalanceError("");
      setIsBalanceLoading(false);
      return;
    }

    let isCurrent = true;
    setIsBalanceLoading(true);
    setBalanceError("");

    fetchWalletUmbraBalances({
      amountAtomic: umbra.amountAtomic,
      mintAddress: umbra.mintAddress,
      requiredSolLamports,
      rpcUrl: runtimeConfig.rpcUrl,
      walletAddress: customerWalletAddress,
    })
      .then((readiness) => {
        if (!isCurrent) return;
        setBalanceReadiness(readiness);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setBalanceReadiness(null);
        setBalanceError(
          error instanceof Error
            ? error.message
            : "Unable to load wallet balances.",
        );
      })
      .finally(() => {
        if (!isCurrent) return;
        setIsBalanceLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    customerWalletAddress,
    requiredSolLamports,
    runtimeConfig.rpcUrl,
    umbra.amountAtomic,
    umbra.mintAddress,
  ]);

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

    if (blocksPaymentForBalance) {
      toast.error("Add the required SOL and invoice funds before paying.");
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
        optionalData: umbra.optionalData,
        onStep: setCurrentStep,
      });

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
        claimableH1Hash: null,
        claimableH2Hash: null,
        claimableTreeIndex: null,
        claimableInsertionIndex: null,
        claimedAt: null,
        claimResult: null,
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
      return currentStep === "customer_registration"
        ? "Setting up Umbra"
        : "Submitting payment";
    }

    if (!ready || (authenticated && !walletsReady)) {
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
              (authenticated && !walletsReady) ||
              isPaymentRunning ||
              hasPaymentInReview ||
              !isReadyToPay ||
              blocksPaymentForBalance
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
            <p className="text-xs font-medium text-slate-500">You need</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {amountDisplay}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Estimated Umbra setup and network cost:{" "}
              {formatSolLamports(requiredSolLamports)}
            </p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Your wallet has</p>
            {isBalanceLoading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="size-3.5 animate-spin" />
                Checking balances
              </p>
            ) : balanceReadiness ? (
              <div className="mt-1 space-y-1 text-sm text-slate-900">
                <p>
                  {formatAtomicTokenAmount(
                    balanceReadiness.tokenBalanceAtomic,
                    umbra.mintDecimals,
                    mint,
                  )}
                </p>
                <p>{formatSolLamports(balanceReadiness.solBalanceLamports)}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                {customerWalletAddress
                  ? "Balance unavailable"
                  : "Connect wallet to check"}
              </p>
            )}
          </div>
        </div>

        {balanceReadiness && !balanceReadiness.hasEnoughSol && (
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
            Add at least {formatSolLamports(requiredSolLamports)} for Umbra
            account setup, proof account rent, and transaction fees.
          </div>
        )}

        {balanceReadiness && !balanceReadiness.hasEnoughToken && (
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
            Add {amountDisplay} to this wallet before starting the private
            payment.
          </div>
        )}

        {balanceError && (
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
            Balance check unavailable: {balanceError}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/70 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Customer wallet</p>
            {solanaWallets.length > 1 ? (
              <Select
                value={selectedWalletAddress ?? undefined}
                disabled={isPaymentRunning}
                onValueChange={setSelectedWalletAddress}
              >
                <SelectTrigger className="mt-2 bg-white font-mono">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {solanaWallets.map((wallet) => (
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
                <div>
                  <p className="text-xs font-medium leading-snug text-slate-700">
                    {step.label}
                  </p>
                  {isActive && step.id === "customer_registration" && (
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      First-time setup — approve in wallet
                    </p>
                  )}
                  {isActive && step.id === "preparing_payment" && (
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      Generating zero-knowledge proof…
                    </p>
                  )}
                </div>
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
