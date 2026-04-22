"use client";

import Link from "next/link";
import { Coins, FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInvoicesQuery } from "@/features/invoices/queries";
import type { SerializedInvoice } from "@/features/invoices/types";

type ActivityRow = {
  id: string;
  timestamp: string;
  event: string;
  reference: string;
  amount: string;
  status: string;
  icon: typeof FileText;
};

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatTimestamp(value: string) {
  return timestampFormatter.format(new Date(value));
}

function buildActivityRows(invoices: SerializedInvoice[]): ActivityRow[] {
  return invoices
    .flatMap((invoice) => {
      const rows: ActivityRow[] = [
        {
          id: `${invoice.invoiceId}:created`,
          timestamp: invoice.createdAt,
          event: "Invoice created",
          reference: invoice.id,
          amount: invoice.amount,
          status: invoice.status,
          icon: FileText,
        },
      ];

      if (invoice.latestUmbraPayment) {
        rows.push({
          id: `${invoice.invoiceId}:umbra:${invoice.latestUmbraPayment.id}`,
          timestamp:
            invoice.latestUmbraPayment.confirmedAt ??
            invoice.latestUmbraPayment.updatedAt,
          event:
            invoice.latestUmbraPayment.status === "confirmed"
              ? "Umbra payment confirmed"
              : "Umbra payment submitted",
          reference: invoice.id,
          amount: invoice.amount,
          status: invoice.latestUmbraPayment.status,
          icon: invoice.latestUmbraPayment.status === "confirmed" ? Coins : ShieldCheck,
        });
      }

      return rows;
    })
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
}

export default function ActivityPage() {
  const invoicesQuery = useInvoicesQuery();
  const rows = buildActivityRows(invoicesQuery.data ?? []);
  const error = invoicesQuery.isError
    ? invoicesQuery.error instanceof Error
      ? invoicesQuery.error.message
      : "Unable to load activity."
    : "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Activity Ledger
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Production invoice and Umbra payment events for this merchant profile.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/invoices/new">Create Invoice</Link>
        </Button>
      </header>

      <Card className="overflow-hidden border-card-border">
        <div className="w-full overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-card-border bg-muted/10 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp (UTC)</th>
                <th className="px-6 py-4 font-medium">Event</th>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border bg-card">
              {invoicesQuery.isPending && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading activity...
                  </td>
                </tr>
              )}

              {!invoicesQuery.isPending && error && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
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
                rows.map((row) => {
                  const Icon = row.icon;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/5">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] text-muted-foreground">
                        {formatTimestamp(row.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-muted/20 text-muted-foreground">
                            <Icon className="size-3" />
                          </div>
                          <span className="font-medium text-foreground">{row.event}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-primary">
                        {row.reference}
                      </td>
                      <td className="px-6 py-4 font-medium">{row.amount}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="outline" className="bg-background text-xs font-normal">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}

              {!invoicesQuery.isPending && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No activity yet. Invoice and Umbra payment events will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
