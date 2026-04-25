"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import {
  useClaimUmbraInvoicePaymentMutation,
  useInvoiceQuery,
} from "@/features/invoices/queries";
import { summarizeCompletedClaimResult } from "@/features/merchant-profiles/umbra-settlement-claim";
import { getPaymentMintConfig } from "@/features/payments/mints";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import { claimIncomingPayments } from "@/lib/umbra/sdk";

function truncate(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export default function SettlementPage() {
  const params = useParams<{ invoiceId: string }>();
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const { wallet: merchantWallet, signTransaction, signMessage } =
    usePrivyUmbraSigner(profile.walletAddress);
  const invoiceQuery = useInvoiceQuery(params.invoiceId);
  const claimUmbraPayment = useClaimUmbraInvoicePaymentMutation(params.invoiceId);
  const invoice = invoiceQuery.data ?? null;
  const latestUmbraPayment = invoice?.latestUmbraPayment ?? null;
  const mint = invoice ? getPaymentMintConfig(invoice.mint) : null;
  const isConfirmed = latestUmbraPayment?.status === "confirmed";
  const isSubmitted = latestUmbraPayment?.status === "submitted";
  const isClaimed = invoice?.status === "Claimed" || invoice?.status === "Settled";
  const error = invoiceQuery.isError
    ? invoiceQuery.error instanceof Error
      ? invoiceQuery.error.message
      : "Unable to load settlement details."
      : "";
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  async function handleClaimSettlement() {
    if (!invoice || !latestUmbraPayment) {
      const msg = "Load a confirmed Umbra payment before claiming settlement.";
      setClaimError(msg);
      toast.error(msg);
      return;
    }

    if (isClaimed) {
      return;
    }

    if (!merchantWallet) {
      const msg = "Connect the Solana wallet attached to this merchant profile.";
      setClaimError(msg);
      toast.error(msg);
      return;
    }

    setClaimError("");
    setIsClaiming(true);

    try {
      const runtimeConfig = getUmbraRuntimeConfig();
      const signer = createPrivyUmbraSigner({
        wallet: merchantWallet,
        signTransaction,
        signMessage,
        network: runtimeConfig.network,
      });
      const claimResult = summarizeCompletedClaimResult(
        await claimIncomingPayments(
          {
            ...runtimeConfig,
            signer,
            preferPollingTransactionForwarder: true,
          },
          {
            expected: {
              destinationAddress: latestUmbraPayment.merchantUmbraWalletAddress,
              payerWalletAddress: latestUmbraPayment.payerWalletAddress,
              mint: latestUmbraPayment.mint,
              amountAtomic: latestUmbraPayment.amountAtomic,
              h1Hash: latestUmbraPayment.claimableH1Hash,
              h2Hash: latestUmbraPayment.claimableH2Hash,
              treeIndex: latestUmbraPayment.claimableTreeIndex,
              insertionIndex: latestUmbraPayment.claimableInsertionIndex,
            },
          },
        ),
      );

      await claimUmbraPayment.mutateAsync({
        createUtxoSignature: latestUmbraPayment.createUtxoSignature,
        claimResult,
      });
      toast.success("Settlement claimed successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to claim settlement.";
      setClaimError(message);
      toast.error(message);
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
      <Button asChild variant="ghost" size="sm" className="w-fit pl-0 text-muted-foreground">
        <Link href={invoice ? `/invoices/${invoice.id}` : "/invoices"}>
          <ArrowLeft className="size-4" /> Back to Invoice
        </Link>
      </Button>

      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Private Settlement
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review real Umbra payment state before moving funds into the merchant
          settlement workflow.
        </p>
      </header>

      {invoiceQuery.isPending && (
        <Card className="border-card-border shadow-sm">
          <CardContent className="p-8 text-center">
            <h2 className="font-serif text-2xl font-semibold">Loading settlement</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fetching invoice and Umbra payment details.
            </p>
          </CardContent>
        </Card>
      )}

      {!invoiceQuery.isPending && error && (
        <Card className="border-card-border shadow-sm">
          <CardContent className="p-8 text-center">
            <h2 className="font-serif text-2xl font-semibold">Settlement unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6">
              <Link href="/invoices">Review invoices</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!invoiceQuery.isPending && !error && invoice && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-6 md:col-span-2">
            <Card className="overflow-hidden border-card-border">
              <div className="flex items-center gap-3 border-b border-card-border bg-[var(--status-claimed-bg)]/20 px-6 py-4">
                {isConfirmed ? (
                  <CheckCircle2 className="size-5 text-[var(--status-claimed)]" />
                ) : (
                  <ShieldCheck className="size-5 text-[var(--status-pending)]" />
                )}
                <h2 className="font-medium text-foreground">
                  {isConfirmed
                    ? "Umbra Payment Confirmed"
                    : isSubmitted
                      ? "Umbra Payment Submitted"
                      : "No Claimable Payment Confirmed"}
                </h2>
              </div>
              <CardContent className="p-6">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Matched to Invoice
                    </p>
                    <p className="font-mono font-medium text-foreground">{invoice.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-sm text-muted-foreground">Amount</p>
                    <p className="font-serif text-2xl font-medium">{invoice.amount}</p>
                  </div>
                </div>

                <div className="mb-6 flex flex-col gap-2 break-all rounded-lg border border-border bg-muted/10 p-4 font-mono text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span>Customer:</span>
                    <span className="text-foreground">{invoice.client}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Receiver:</span>
                    <span className="text-foreground">
                      {latestUmbraPayment?.merchantUmbraWalletAddress ??
                        invoice.merchantUmbraWalletAddress ??
                        "Not available"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Network:</span>
                    <span>{invoice.merchantUmbraNetwork}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Asset:</span>
                    <span>{mint?.displayName ?? invoice.mint}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Payment Tx:</span>
                    <span className="text-foreground">
                      {latestUmbraPayment ? (
                        <>
                          {truncate(latestUmbraPayment.createUtxoSignature)}
                          <ExternalLink className="ml-1 inline size-3" />
                        </>
                      ) : (
                        "Not submitted"
                      )}
                    </span>
                  </div>
                </div>

                {(isConfirmed || isClaimed) && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      <div>
                        <h3 className="font-medium text-emerald-800 dark:text-emerald-400">
                          Merchant Claimability Confirmed
                        </h3>
                        <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-500/80">
                          The merchant wallet has confirmed this payment is claimable.
                          Click below to claim funds into your Umbra encrypted balance.
                        </p>
                      </div>
                    </div>

                    {isClaimed && (
                      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                        <div>
                          <h3 className="font-medium text-emerald-800 dark:text-emerald-400">
                            Settlement Claimed
                          </h3>
                          <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-500/80">
                            The payment has been claimed into your Umbra encrypted balance.
                          </p>
                        </div>
                      </div>
                    )}

                    {claimError && (
                      <p className="text-sm text-destructive">{claimError}</p>
                    )}

                    <Button
                      size="lg"
                      className="h-14 w-full text-base"
                      onClick={handleClaimSettlement}
                      disabled={
                        !standardWallets.ready ||
                        isClaiming ||
                        claimUmbraPayment.isPending ||
                        isClaimed
                      }
                    >
                      {isClaiming || claimUmbraPayment.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Claiming Settlement…
                        </>
                      ) : isClaimed ? (
                        <>
                          <CheckCircle2 className="size-4" /> Settlement Claimed
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4" /> Claim Settlement
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isSubmitted && (
                  <Button asChild size="lg" className="h-14 w-full text-base">
                    <Link href={`/invoices/${invoice.id}`}>
                      <ShieldCheck className="size-4" /> Confirm On Invoice Detail
                    </Link>
                  </Button>
                )}

                {!latestUmbraPayment && (
                  <Button size="lg" disabled className="h-14 w-full text-base">
                    <Clock className="size-4" /> Awaiting Customer Payment
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-card-border bg-sidebar">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center font-medium">
                <Lock className="mr-2 size-4 text-muted-foreground" /> How this works
              </h3>
              <div className="relative flex flex-col gap-4 text-sm text-muted-foreground before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border">
                {[
                  [
                    "Submission",
                    "The customer submits verified Umbra transaction evidence for this invoice.",
                  ],
                  [
                    "Confirmation",
                    "The merchant wallet scans for the matching claimable payment.",
                  ],
                  [
                    "Settlement",
                    "Only confirmed claimability is used for production settlement state.",
                  ],
                ].map(([title, body], index) => (
                  <div key={title} className="relative pl-8">
                    <div className="absolute top-1 left-0 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium text-foreground">
                      {index + 1}
                    </div>
                    <p className="mb-0.5 font-medium text-foreground">{title}</p>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
