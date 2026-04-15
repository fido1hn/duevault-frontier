"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activityLog } from "@/lib/demo-data";

export default function ActivityPage() {
  return (
    <AppLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Activity Ledger
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comprehensive audit trail of all operations.
            </p>
          </div>

          <div className="flex gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="proof">Proofs</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="30d">
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                {activityLog.map((log) => {
                  const Icon = log.icon;
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-muted/5">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] text-muted-foreground">
                        {log.time}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-muted/20 text-muted-foreground">
                            <Icon className="size-3" />
                          </div>
                          <span className="font-medium text-foreground">{log.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-primary">{log.invoice}</td>
                      <td className="px-6 py-4 font-medium">{log.amount || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="outline" className="bg-background text-xs font-normal">
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
