"use client";

import Link from "next/link";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Download, FileCheck, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInvoiceProofPacketClient } from "@/features/invoices/client";
import type { ProofPacket } from "@/features/invoices/proof-packet";
import { useInvoicesQuery } from "@/features/invoices/queries";

export default function ProofsPage() {
  const invoicesQuery = useInvoicesQuery();
  const { getAccessToken } = usePrivy();
  const invoices = invoicesQuery.data ?? [];
  const eligibleInvoices = invoices.filter(
    (invoice) => invoice.latestUmbraPayment?.status === "confirmed",
  );
  const submittedInvoices = invoices.filter(
    (invoice) => invoice.latestUmbraPayment?.status === "submitted",
  );
  const error = invoicesQuery.isError
    ? invoicesQuery.error instanceof Error
      ? invoicesQuery.error.message
      : "Unable to load proof data."
    : "";
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [packetErrors, setPacketErrors] = useState<Record<string, string>>({});

  function addGenerating(id: string) {
    setGenerating((prev) => new Set(prev).add(id));
  }

  function removeGenerating(id: string) {
    setGenerating((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function triggerDownload(packet: ProofPacket, invoiceId: string) {
    const json = JSON.stringify(packet, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proof-${invoiceId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handleDownload(invoiceId: string) {
    addGenerating(invoiceId);
    setPacketErrors((prev) => ({ ...prev, [invoiceId]: "" }));

    try {
      const packet = await getInvoiceProofPacketClient(invoiceId, getAccessToken);
      triggerDownload(packet, invoiceId);
      toast.success("Proof packet downloaded.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to generate proof packet.";
      setPacketErrors((prev) => ({ ...prev, [invoiceId]: message }));
      toast.error(message);
    } finally {
      removeGenerating(invoiceId);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Selective Disclosure
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Production proof packets will be generated from real confirmed Umbra
          payments only.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="border-card-border shadow-sm">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded bg-primary/10 text-primary">
                <FileCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-medium">Proof Eligibility</h2>
                <p className="text-sm text-muted-foreground">
                  Confirmed payments available for disclosure.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Confirmed Umbra payments
                  </span>
                  <span className="font-serif text-2xl font-medium">
                    {eligibleInvoices.length}
                  </span>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Awaiting merchant confirmation
                  </span>
                  <span className="font-serif text-2xl font-medium">
                    {submittedInvoices.length}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="mr-2 size-4" /> Disclosure policy
                </h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  <li>Only real invoice metadata is eligible for proof packets.</li>
                  <li>Raw payer evidence stays out of public checkout responses.</li>
                  <li>Wallet history and unrelated invoices remain private.</li>
                </ul>
              </div>

              {invoicesQuery.isPending && (
                <p className="text-sm text-muted-foreground">Loading proof data...</p>
              )}

              {!invoicesQuery.isPending && error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 bg-card"
                    onClick={() => void invoicesQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              )}

              {!invoicesQuery.isPending && !error && eligibleInvoices.length === 0 && (
                <div className="rounded-lg border border-dashed border-card-border bg-muted/5 p-4">
                  <p className="text-sm font-medium">No proof packets available yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirm an Umbra payment from an invoice detail page before
                    producing disclosure material.
                  </p>
                  <Button asChild size="sm" className="mt-4">
                    <Link href="/invoices">Review invoices</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-6">
          <h2 className="font-serif text-lg font-medium">Eligible Invoices</h2>
          <div className="flex flex-col gap-3">
            {eligibleInvoices.map((invoice) => (
              <div
                key={invoice.invoiceId}
                className="flex items-center justify-between gap-4 rounded-lg border border-card-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <FileCheck className="size-4 shrink-0 text-muted-foreground" />
                    {invoice.id}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invoice.client} - {invoice.amount}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="outline" className="bg-background font-mono text-[10px]">
                    Confirmed
                  </Badge>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {invoice.latestUmbraPayment?.confirmedAt ?? "Pending timestamp"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => void handleDownload(invoice.id)}
                    disabled={generating.has(invoice.id)}
                  >
                    {generating.has(invoice.id) ? (
                      <>
                        <Loader2 className="size-3 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Download className="size-3" /> Download Proof
                      </>
                    )}
                  </Button>
                  {packetErrors[invoice.id] && (
                    <p className="text-right text-[11px] text-destructive">
                      {packetErrors[invoice.id]}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {!invoicesQuery.isPending && !error && eligibleInvoices.length === 0 && (
              <div className="rounded-lg border border-dashed border-card-border bg-card p-6 text-center">
                <LockKeyhole className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No confirmed payments</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This list stays empty until production payment evidence is confirmed.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
