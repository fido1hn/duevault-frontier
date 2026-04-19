"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { business, getInvoiceById } from "@/fixtures/demo-data";

export default function SettlementPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoice = getInvoiceById(params.invoiceId);
  const [step, setStep] = useState(1);

  function handleClaim() {
    setStep(2);
    window.setTimeout(() => {
      setStep(3);
      toast.success(`Settlement successful. ${invoice.amount} claimed.`);
    }, 2500);
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
        <Button asChild variant="ghost" size="sm" className="w-fit pl-0 text-muted-foreground">
          <Link href={`/invoices/${invoice.id}`}>
            <ArrowLeft className="size-4" /> Back to Invoice
          </Link>
        </Button>

        <header>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Private Settlement
          </h1>
          <p className="mt-1 text-muted-foreground">
            Claim payments sent to your stealth addresses via Umbra Protocol.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-6 md:col-span-2">
            <Card className="overflow-hidden border-card-border">
              <div className="flex items-center gap-3 border-b border-card-border bg-[var(--status-claimed-bg)]/20 px-6 py-4">
                <ShieldCheck className="size-5 text-[var(--status-claimed)]" />
                <h2 className="font-medium text-[var(--status-claimed)]">
                  Stealth Payment Detected
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
                    <span>Sender:</span>
                    <span className="text-foreground">{invoice.client} (Public)</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Receiver:</span>
                    <span className="text-foreground">{business.stealthAddress}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Network:</span>
                    <span>Solana Mainnet</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Tx Hash:</span>
                    <span className="text-foreground">
                      5KJyTr...vB9Fg3x <ExternalLink className="ml-1 inline size-3" />
                    </span>
                  </div>
                </div>

                {step === 1 && (
                  <Button size="lg" className="h-14 w-full text-base" onClick={handleClaim}>
                    <Lock className="size-4" /> Claim to Private Balance
                  </Button>
                )}

                {step === 2 && (
                  <Button size="lg" disabled className="h-14 w-full bg-muted text-base text-muted-foreground">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating Proof & Claiming...
                  </Button>
                )}

                {step === 3 && (
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <h3 className="font-medium text-emerald-800 dark:text-emerald-400">
                        Settlement Complete
                      </h3>
                      <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-500/80">
                        Funds were swept to your treasury without exposing the link
                        between the sender and your identity.
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-3 border-emerald-500/30 bg-transparent text-emerald-700 hover:bg-emerald-500/10"
                      >
                        <Link href="/proofs">
                          Generate Auditor Proof <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
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
                    "Payment Sent",
                    "Client pays to a unique stealth address generated just for this invoice.",
                  ],
                  [
                    "Detection",
                    "DueVault monitors Umbra announcements and detects the payment using your viewing key.",
                  ],
                  [
                    "Claiming",
                    "You claim the funds. The footprint shows a transfer from a stealth address, not the client.",
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
      </div>
    </AppLayout>
  );
}
