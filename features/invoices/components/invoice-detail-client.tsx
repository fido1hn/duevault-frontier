"use client";

import Link from "next/link";
import { useState } from "react";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useConfirmUmbraInvoicePaymentMutation,
  useInvoiceQuery,
} from "@/features/invoices/queries";
import { getInvoiceUmbraSettlementView } from "@/features/invoices/settlement-view";
import { findMerchantClaimableUmbraPayment } from "@/features/merchant-profiles/umbra-claim-confirmation";
import { getPaymentMintConfig } from "@/features/payments/mints";
import { cn } from "@/lib/utils";

type InvoiceDetailClientProps = {
  invoiceId: string;
};

function truncateSignature(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export function InvoiceDetailClient({ invoiceId }: InvoiceDetailClientProps) {
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const {
    wallet: merchantWallet,
    signTransaction,
    signMessage,
  } = usePrivyUmbraSigner(profile.walletAddress);
  const invoiceQuery = useInvoiceQuery(invoiceId);
  const confirmUmbraPayment = useConfirmUmbraInvoicePaymentMutation(invoiceId);
  const invoice = invoiceQuery.data ?? null;
  const mint = invoice ? getPaymentMintConfig(invoice.mint) : null;
  const error = invoiceQuery.isError
    ? invoiceQuery.error instanceof Error
      ? invoiceQuery.error.message
      : "Unable to load invoice."
    : "";
  const isLoading = invoiceQuery.isPending;
  const [copied, setCopied] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const latestUmbraPayment = invoice?.latestUmbraPayment ?? null;
  const umbraSettlementView = getInvoiceUmbraSettlementView(
    invoice?.status ?? "Draft",
    latestUmbraPayment?.status ?? null,
  );
  const UmbraSettlementIcon =
    umbraSettlementView.tone === "settled"
      ? CheckCircle2
      : umbraSettlementView.tone === "waiting"
        ? Clock
        : ShieldCheck;

  function handleCopyLink() {
    if (!invoice) return;

    const url = `${window.location.origin}/pay/${invoice.publicId}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Checkout link copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmUmbraPayment() {
    if (!invoice || !latestUmbraPayment) return;

    setConfirmationError("");

    if (!merchantWallet) {
      const msg =
        "Connect the Solana wallet attached to this merchant profile.";
      setConfirmationError(msg);
      toast.error(msg);
      return;
    }

    try {
      const claimableEvidence = await findMerchantClaimableUmbraPayment({
        wallet: merchantWallet,
        signTransaction,
        signMessage,
        expected: {
          destinationAddress: latestUmbraPayment.merchantUmbraWalletAddress,
          payerWalletAddress: latestUmbraPayment.payerWalletAddress,
          mint: latestUmbraPayment.mint,
          amountAtomic: latestUmbraPayment.amountAtomic,
        },
      });

      await confirmUmbraPayment.mutateAsync({
        createUtxoSignature: latestUmbraPayment.createUtxoSignature,
        ...claimableEvidence,
      });
      toast.success("Umbra payment confirmed.");
      void invoiceQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to confirm Umbra payment.";

      setConfirmationError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit pl-0 text-muted-foreground">
        <Link href="/invoices">
          <ArrowLeft className="size-4" /> Back to Invoices
        </Link>
      </Button>

      {isLoading && (
        <Card className="border-card-border shadow-sm">
          <CardContent className="p-8 text-center">
            <h1 className="font-serif text-2xl font-semibold">
              Loading invoice
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Fetching the latest invoice details.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Card className="border-card-border shadow-sm">
          <CardContent className="p-8 text-center">
            <h1 className="font-serif text-2xl font-semibold">
              Invoice unavailable
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6">
              <Link href="/invoices/new">Create Invoice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && invoice && (
        <>
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
                  Invoice {invoice.id}
                </h1>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Billed to {invoice.client} • Due {invoice.dueLong}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="bg-card">
                {copied ? (
                  <CheckCircle2 className="size-4 text-[var(--status-paid)]" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="outline" className="bg-card">
                <Download className="size-4" /> PDF
              </Button>
              <Button asChild>
                <Link href="/proofs">
                  <ShieldCheck className="size-4" /> Create Proof
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-8 lg:col-span-2">
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-8">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <h2 className="font-serif text-xl font-bold text-primary">
                        {profile.businessName}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {profile.contactEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl font-medium">
                        {invoice.amount}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Due {invoice.due}
                      </p>
                    </div>
                  </div>

                  <div className="mb-8 border-y border-border/50 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
                          <th className="pb-3 font-normal">Description</th>
                          <th className="pb-3 text-right font-normal">Qty</th>
                          <th className="pb-3 text-right font-normal">Price</th>
                          <th className="pb-3 text-right font-normal">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {invoice.lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3">{item.description}</td>
                            <td className="py-3 text-right">{item.quantity}</td>
                            <td className="py-3 text-right">
                              {item.priceDisplay}
                            </td>
                            <td className="py-3 text-right font-medium">
                              {item.totalDisplay}{" "}
                              {mint?.displayName ?? invoice.mint}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                    <div className="max-w-[220px]">
                      <p className="mb-1 text-xs tracking-wider uppercase">
                        Notes
                      </p>
                      <p className="italic">
                        {invoice.notes || "No invoice notes provided."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-xs tracking-wider uppercase">
                        Settlement details
                      </p>
                      <p>Network: Solana</p>
                      <p>Asset: {mint?.displayName ?? invoice.mint}</p>
                      <p>
                        Privacy:{" "}
                        {invoice.privacyRail === "umbra"
                          ? "Umbra Protocol"
                          : "Public"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-card-border bg-muted/5">
                <CardContent className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-medium">Client Checkout View</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      See what the client sees when they open the payment link.
                    </p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/pay/${invoice.publicId}`}>
                      Preview Checkout <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <aside className="flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-serif font-medium">
                    Status Timeline
                  </h3>
                  <div className="relative flex flex-col gap-6 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                    {[
                      { label: "Viewed", time: "", icon: Eye },
                      {
                        label: invoice.status === "Draft" ? "Drafted" : "Sent",
                        time: invoice.issued,
                        icon: CheckCircle2,
                      },
                      {
                        label: "Created",
                        time: invoice.issued,
                        icon: CheckCircle2,
                      },
                      {
                        label: "Awaiting Payment",
                        time: "",
                        icon: Clock,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="relative flex gap-4 pl-7">
                          <span className="absolute left-0 top-0.5 flex size-4 rounded-full border-2 border-primary bg-background" />
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="size-3" /> {item.label}
                            </div>
                            {item.time && (
                              <div className="mt-1 font-mono text-xs text-muted-foreground">
                                {item.time}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "shadow-sm",
                  umbraSettlementView.tone === "settled"
                    ? "border-[var(--status-claimed)]/20 bg-[var(--status-claimed-bg)]/30"
                    : "border-[var(--status-pending)]/20 bg-[var(--status-pending-bg)]/30",
                )}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        umbraSettlementView.tone === "settled"
                          ? "bg-[var(--status-claimed)]/10 text-[var(--status-claimed)]"
                          : "bg-[var(--status-pending)]/10 text-[var(--status-pending)]",
                      )}>
                      <UmbraSettlementIcon className="size-4" />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "font-medium",
                          umbraSettlementView.tone === "settled"
                            ? "text-[var(--status-claimed)]"
                            : "text-[var(--status-pending)]",
                        )}>
                        {umbraSettlementView.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {umbraSettlementView.description}
                      </p>
                      {latestUmbraPayment && (
                        <p className="mt-3 font-mono text-xs text-muted-foreground">
                          {truncateSignature(
                            latestUmbraPayment.createUtxoSignature,
                          )}
                        </p>
                      )}
                      {confirmationError && (
                        <p className="mt-3 text-xs leading-relaxed text-red-700">
                          {confirmationError}
                        </p>
                      )}
                      {umbraSettlementView.action === "confirm" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            !standardWallets.ready ||
                            confirmUmbraPayment.isPending
                          }
                          className="mt-4 w-full bg-[var(--status-pending)] text-white hover:bg-[var(--status-pending)]/90"
                          onClick={() => void handleConfirmUmbraPayment()}>
                          {confirmUmbraPayment.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="size-4" />
                          )}
                          Confirm Claimable Payment
                        </Button>
                      ) : umbraSettlementView.action === "review_claim" ? (
                        <Button
                          asChild
                          size="sm"
                          className="mt-4 w-full bg-[var(--status-pending)] text-white hover:bg-[var(--status-pending)]/90">
                          <Link href={`/invoices/${invoice.id}/settlement`}>
                            Review & Claim
                          </Link>
                        </Button>
                      ) : umbraSettlementView.action === "claimed" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled
                          className="mt-4 w-full border-[var(--status-claimed)]/30 bg-[var(--status-claimed-bg)] text-[var(--status-claimed)]">
                          <CheckCircle2 className="size-4" />
                          Settlement Claimed
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled
                          className="mt-4 w-full">
                          <Clock className="size-4" />
                          Awaiting Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
