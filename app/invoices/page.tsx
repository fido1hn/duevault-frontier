"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Search } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invoices } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const filters = ["All", "Draft", "Sent", "Overdue", "Paid", "Claimed"];

export default function InvoicesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = activeFilter === "All" || invoice.status === activeFilter;
    const matchesQuery =
      deferredQuery.length === 0 ||
      invoice.id.toLowerCase().includes(deferredQuery) ||
      invoice.client.toLowerCase().includes(deferredQuery);

    return matchesStatus && matchesQuery;
  });

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 md:p-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Invoices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and track your receivables.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/invoices/new">Create Invoice</Link>
          </Button>
        </header>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Badge
                key={filter}
                role="button"
                tabIndex={0}
                variant={activeFilter === filter ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  activeFilter !== filter &&
                    "bg-card text-muted-foreground hover:bg-muted/10"
                )}
                onClick={() => setActiveFilter(filter)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setActiveFilter(filter);
                }}
              >
                {filter}
              </Badge>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoices..."
              className="border-card-border bg-card pl-9"
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-lg border border-card-border bg-card"
        >
          <div className="w-full overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-card-border bg-muted/10 font-medium text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Invoice #</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Issued</th>
                  <th className="px-6 py-4 font-medium">Due</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/5"
                  >
                    <td className="px-6 py-4 font-mono text-xs">{invoice.id}</td>
                    <td className="px-6 py-4 font-medium">{invoice.client}</td>
                    <td className="px-6 py-4 text-muted-foreground">{invoice.issued}</td>
                    <td className="px-6 py-4 text-muted-foreground">{invoice.due}</td>
                    <td className="px-6 py-4">{invoice.amount}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Link href={`/invoices/${invoice.id}`}>
                          View <ArrowUpRight className="size-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No invoices found matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
