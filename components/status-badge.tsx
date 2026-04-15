import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Paid: "bg-[var(--status-paid-bg)] text-[var(--status-paid)] border-[var(--status-paid)]",
  Sent: "bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending)]",
  Viewed: "bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending)]",
  Detected: "bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending)]",
  Draft: "bg-[var(--status-draft-bg)] text-[var(--status-draft)] border-[var(--status-draft)]",
  Overdue:
    "bg-[var(--status-overdue-bg)] text-[var(--status-overdue)] border-[var(--status-overdue)]",
  Claimed:
    "bg-[var(--status-claimed-bg)] text-[var(--status-claimed)] border-[var(--status-claimed)]",
  Settled:
    "bg-[var(--status-claimed-bg)] text-[var(--status-claimed)] border-[var(--status-claimed)]",
};

type StatusBadgeProps = {
  status: InvoiceStatus | string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border px-2 py-0.5 font-medium", statusStyles[status], className)}
    >
      {status}
    </Badge>
  );
}
