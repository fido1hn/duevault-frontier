"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Download, ExternalLink } from "lucide-react";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoicesQuery } from "@/features/invoices/queries";
import type { SerializedInvoice } from "@/features/invoices/types";
import { getPaymentMintDisplayName } from "@/features/payments/mints";
import { cn } from "@/lib/utils";

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatInvoiceTotal(invoices: SerializedInvoice[]) {
  if (invoices.length === 0) {
    return "0";
  }

  const total = invoices.reduce((sum, invoice) => sum + invoice.amountNumber, 0);
  const firstMint = invoices[0]?.mint;
  const hasSingleMint = invoices.every((invoice) => invoice.mint === firstMint);
  const mintLabel =
    firstMint && hasSingleMint ? getPaymentMintDisplayName(firstMint) : "mixed";

  return `${amountFormatter.format(total)} ${mintLabel}`;
}

function buildSummaryItems(invoices: SerializedInvoice[]) {
  const outstanding = invoices.filter((invoice) =>
    ["Sent", "Viewed", "Detected", "Overdue"].includes(invoice.status),
  );
  const paidOrClaimed = invoices.filter((invoice) =>
    ["Paid", "Claimed", "Settled"].includes(invoice.status),
  );
  const pendingReview = invoices.filter(
    (invoice) => invoice.latestUmbraPayment?.status === "submitted",
  );
  const overdue = invoices.filter((invoice) => invoice.status === "Overdue");

  return [
    {
      title: "Total Outstanding",
      amount: formatInvoiceTotal(outstanding),
      detail: `${outstanding.length} open invoice${outstanding.length === 1 ? "" : "s"}`,
      tone: "pending",
    },
    {
      title: "Paid Or Claimed",
      amount: formatInvoiceTotal(paidOrClaimed),
      detail: `${paidOrClaimed.length} completed invoice${paidOrClaimed.length === 1 ? "" : "s"}`,
      tone: "paid",
    },
    {
      title: "Pending Review",
      amount: formatInvoiceTotal(pendingReview),
      detail: `${pendingReview.length} submitted Umbra payment${pendingReview.length === 1 ? "" : "s"}`,
      tone: "pending",
    },
    {
      title: "Overdue",
      amount: formatInvoiceTotal(overdue),
      detail: `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}`,
      tone: "overdue",
    },
  ];
}

export default function Dashboard() {
  return <DashboardContent />;
}

function DashboardContent() {
  const { profile } = useMerchantProfile();
  const invoicesQuery = useInvoicesQuery();
  const invoices = invoicesQuery.data ?? [];
  const recentInvoices = invoices.slice(0, 5);
  const summaryItems = buildSummaryItems(invoices);
  const error = invoicesQuery.isError
    ? invoicesQuery.error instanceof Error
      ? invoicesQuery.error.message
      : "Unable to load invoices."
    : "";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {profile.businessName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm" className="bg-card">
            <Link href="/proofs">
              <Download className="size-4" />
              Proofs
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/invoices/new">New Invoice</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Card className="border-card-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-serif text-2xl font-medium text-foreground">
                  {item.amount}
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    item.tone === "paid" && "text-[var(--status-paid)]",
                    item.tone === "pending" && "text-[var(--status-pending)]",
                    item.tone === "overdue" && "text-destructive",
                  )}
                >
                  {item.detail}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Recent Invoices</h2>
          <Button asChild variant="link" className="px-0 text-sm text-muted-foreground">
            <Link href="/invoices">
              View all <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-card-border bg-card">
          <div className="w-full overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-card-border bg-muted/10 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {invoicesQuery.isPending && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading invoices...
                    </td>
                  </tr>
                )}

                {!invoicesQuery.isPending && error && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-sm text-destructive">{error}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 bg-card"
                        onClick={() => void invoicesQuery.refetch()}
                      >
                        Try again
                      </Button>
                    </td>
                  </tr>
                )}

                {!invoicesQuery.isPending &&
                  !error &&
                  recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="group transition-colors hover:bg-muted/5">
                      <td className="px-4 py-3 font-mono text-xs">{invoice.id}</td>
                      <td className="px-4 py-3 font-medium">{invoice.client}</td>
                      <td className="px-4 py-3">{invoice.amount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{invoice.due}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Link href={`/invoices/${invoice.id}`}>
                            View <ExternalLink className="size-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}

                {!invoicesQuery.isPending && !error && recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No invoices yet. Create your first production invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
