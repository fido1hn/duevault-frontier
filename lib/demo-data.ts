import type { LucideIcon } from "lucide-react";
import { Coins, Eye, FileText, Mail, ShieldCheck } from "lucide-react";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Paid"
  | "Detected"
  | "Claimed"
  | "Settled"
  | "Overdue";

export type LineItem = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  client: string;
  clientEmail: string;
  issued: string;
  due: string;
  dueLong: string;
  amount: string;
  amountNumber: number;
  status: InvoiceStatus;
  lineItems: LineItem[];
};

export type ActivityEvent = {
  id: number;
  type: "proof" | "settlement" | "payment" | "view" | "send" | "create";
  icon: LucideIcon;
  title: string;
  invoice: string;
  amount: string | null;
  time: string;
  status: string;
};

export const business = {
  name: "North Pier Studio",
  email: "hello@northpier.studio",
  address: "100 Crypto Way, Suite 400, San Francisco, CA 94105",
  wallet: "8xG...k9P",
  stealthAddress: "stealth_7hXf...9pQz",
  publicKey: "PubKey_7hXf...9pQz",
};

export const primaryInvoice: Invoice = {
  id: "DV-1007",
  client: "Atlas Labs",
  clientEmail: "billing@atlaslabs.io",
  issued: "Apr 01, 2026",
  due: "Apr 30, 2026",
  dueLong: "April 30, 2026",
  amount: "2,450 USDC",
  amountNumber: 2450,
  status: "Sent",
  lineItems: [
    { id: 1, description: "Product strategy sprint", quantity: 1, price: 1600 },
    { id: 2, description: "Umbra integration advisory", quantity: 1, price: 650 },
    { id: 3, description: "Compliance proof packet", quantity: 1, price: 200 },
  ],
};

export const invoices: Invoice[] = [
  primaryInvoice,
  {
    id: "DV-1006",
    client: "Bright Ledger",
    clientEmail: "ap@brightledger.co",
    issued: "Apr 15, 2026",
    due: "May 15, 2026",
    dueLong: "May 15, 2026",
    amount: "1,440 USDC",
    amountNumber: 1440,
    status: "Draft",
    lineItems: [{ id: 1, description: "Receivables setup", quantity: 1, price: 1440 }],
  },
  {
    id: "DV-1005",
    client: "Vanta Trust",
    clientEmail: "auditor@vanta.trust",
    issued: "Mar 15, 2026",
    due: "Apr 15, 2026",
    dueLong: "April 15, 2026",
    amount: "5,100 USDC",
    amountNumber: 5100,
    status: "Claimed",
    lineItems: [{ id: 1, description: "Treasury migration advisory", quantity: 1, price: 5100 }],
  },
  {
    id: "DV-1004",
    client: "Nexus Web3",
    clientEmail: "finance@nexusweb3.io",
    issued: "Mar 10, 2026",
    due: "Apr 10, 2026",
    dueLong: "April 10, 2026",
    amount: "1,200 USDC",
    amountNumber: 1200,
    status: "Paid",
    lineItems: [{ id: 1, description: "Protocol documentation", quantity: 1, price: 1200 }],
  },
  {
    id: "DV-1003",
    client: "Kelp Systems",
    clientEmail: "ops@kelpsystems.dev",
    issued: "Feb 28, 2026",
    due: "Mar 30, 2026",
    dueLong: "March 30, 2026",
    amount: "875 USDC",
    amountNumber: 875,
    status: "Overdue",
    lineItems: [{ id: 1, description: "Design review", quantity: 1, price: 875 }],
  },
  {
    id: "DV-1002",
    client: "Oasis Labs",
    clientEmail: "payables@oasislabs.dev",
    issued: "Feb 15, 2026",
    due: "Mar 15, 2026",
    dueLong: "March 15, 2026",
    amount: "4,500 USDC",
    amountNumber: 4500,
    status: "Claimed",
    lineItems: [{ id: 1, description: "Private payment pilot", quantity: 1, price: 4500 }],
  },
  {
    id: "DV-1001",
    client: "Meridian Creative",
    clientEmail: "studio@meridiancreative.co",
    issued: "Feb 01, 2026",
    due: "Mar 01, 2026",
    dueLong: "March 01, 2026",
    amount: "3,200 USDC",
    amountNumber: 3200,
    status: "Paid",
    lineItems: [{ id: 1, description: "Brand systems sprint", quantity: 1, price: 3200 }],
  },
];

export const summaryData = [
  { title: "Total Outstanding", amount: "6,325 USDC", change: "+12.5%", trend: "up" },
  { title: "Paid This Month", amount: "8,750 USDC", change: "+4.2%", trend: "up" },
  { title: "Pending Settlement", amount: "5,100 USDC", change: "-2.1%", trend: "down" },
  { title: "Overdue", amount: "875 USDC", change: "Action required", trend: "neutral" },
];

export const activityLog: ActivityEvent[] = [
  {
    id: 1,
    type: "proof",
    icon: ShieldCheck,
    title: "Proof packet generated",
    invoice: "DV-1007",
    amount: null,
    time: "Apr 15, 2026 14:45",
    status: "Success",
  },
  {
    id: 2,
    type: "settlement",
    icon: Coins,
    title: "Stealth payment claimed",
    invoice: "DV-1007",
    amount: "2,450 USDC",
    time: "Apr 15, 2026 14:32",
    status: "Settled",
  },
  {
    id: 3,
    type: "payment",
    icon: Coins,
    title: "Payment detected",
    invoice: "DV-1007",
    amount: "2,450 USDC",
    time: "Apr 15, 2026 10:15",
    status: "Pending Claim",
  },
  {
    id: 4,
    type: "view",
    icon: Eye,
    title: "Invoice viewed",
    invoice: "DV-1007",
    amount: null,
    time: "Apr 02, 2026 09:20",
    status: "Logged",
  },
  {
    id: 5,
    type: "send",
    icon: Mail,
    title: "Invoice sent",
    invoice: "DV-1007",
    amount: "2,450 USDC",
    time: "Apr 01, 2026 11:05",
    status: "Sent",
  },
  {
    id: 6,
    type: "create",
    icon: FileText,
    title: "Invoice created",
    invoice: "DV-1007",
    amount: "2,450 USDC",
    time: "Apr 01, 2026 10:42",
    status: "Draft",
  },
  {
    id: 7,
    type: "settlement",
    icon: Coins,
    title: "Stealth payment claimed",
    invoice: "DV-1005",
    amount: "5,100 USDC",
    time: "Mar 16, 2026 16:22",
    status: "Settled",
  },
  {
    id: 8,
    type: "payment",
    icon: Coins,
    title: "Payment detected",
    invoice: "DV-1005",
    amount: "5,100 USDC",
    time: "Mar 16, 2026 08:30",
    status: "Pending Claim",
  },
];

export const recentProofs = [
  {
    id: "DV-1005",
    target: "auditor@vanta.trust",
    date: "Apr 16, 2026",
    status: "Viewed",
  },
  {
    id: "DV-1001",
    target: "accountant@northpier.studio",
    date: "Mar 18, 2026",
    status: "Sent",
  },
  {
    id: "DV-0988",
    target: "tax@state.gov",
    date: "Jan 30, 2026",
    status: "Expired",
  },
];

export function getInvoiceById(id: string) {
  return (
    invoices.find((invoice) => invoice.id.toLowerCase() === id.toLowerCase()) ??
    primaryInvoice
  );
}

export function formatUsdc(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
