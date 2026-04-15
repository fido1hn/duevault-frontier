"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  ShieldCheck,
} from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { business, formatUsdc, getInvoiceById } from "@/lib/demo-data";

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoice = getInvoiceById(params.invoiceId);
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/pay/${invoice.id}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Checkout link copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
        <Button asChild variant="ghost" size="sm" className="w-fit pl-0 text-muted-foreground">
          <Link href="/invoices">
            <ArrowLeft className="size-4" /> Back to Invoices
          </Link>
        </Button>

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
            <Button variant="outline" onClick={handleCopyLink} className="bg-card">
              {copied ? <CheckCircle2 className="size-4 text-[var(--status-paid)]" /> : <Copy className="size-4" />}
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
                      {business.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{business.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-medium">{invoice.amount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Due {invoice.due}</p>
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
                          <td className="py-3 text-right">{formatUsdc(item.price)}</td>
                          <td className="py-3 text-right font-medium">
                            {formatUsdc(item.quantity * item.price)} USDC
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                  <div className="max-w-[220px]">
                    <p className="mb-1 text-xs tracking-wider uppercase">Notes</p>
                    <p className="italic">
                      Thank you for your business. Payment is expected within 30 days.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs tracking-wider uppercase">
                      Settlement details
                    </p>
                    <p>Network: Solana</p>
                    <p>Asset: USDC</p>
                    <p>Privacy: Umbra Protocol</p>
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
                  <Link href={`/pay/${invoice.id}`}>
                    Preview Checkout <ExternalLink className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="flex flex-col gap-6">
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-6">
                <h3 className="mb-4 font-serif font-medium">Status Timeline</h3>
                <div className="relative flex flex-col gap-6 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                  {[
                    { label: "Viewed", time: "Apr 02, 14:30 UTC", icon: Eye, active: true },
                    { label: "Sent", time: "Apr 01, 09:15 UTC", icon: CheckCircle2, active: true },
                    { label: "Created", time: "Apr 01, 08:42 UTC", icon: CheckCircle2, active: false },
                    { label: "Awaiting Payment", time: "", icon: Clock, active: false },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="relative flex gap-4 pl-7">
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

            <Card className="border-[var(--status-pending)]/20 bg-[var(--status-pending-bg)]/30 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-pending)]/10 text-[var(--status-pending)]">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--status-pending)]">
                      Payment Detected
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A stealth payment matching this amount has been detected on Solana.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="mt-4 w-full bg-[var(--status-pending)] text-white hover:bg-[var(--status-pending)]/90"
                    >
                      <Link href={`/invoices/${invoice.id}/settlement`}>Review & Claim</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
