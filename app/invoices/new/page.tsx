"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/app-layout";
import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { Button } from "@/components/ui/button";
import { createInvoiceClient } from "@/features/invoices/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateInvoiceInput,
  InvoiceStatus,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

type EditableLineItem = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

function formatUsdc(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function NewInvoicePage() {
  return (
    <AppLayout>
      <NewInvoiceContent />
    </AppLayout>
  );
}

function NewInvoiceContent() {
  const { profile } = useMerchantProfile();
  const router = useRouter();
  const [clientName, setClientName] = useState("Atlas Labs");
  const [clientEmail, setClientEmail] = useState("billing@atlaslabs.io");
  const [invoiceNumber, setInvoiceNumber] = useState("DV-1007");
  const [issuedAt, setIssuedAt] = useState("2026-04-01");
  const [dueAt, setDueAt] = useState("2026-04-30");
  const [notes, setNotes] = useState(profile.defaultNotes);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>(profile.paymentRail);
  const [privacyRail, setPrivacyRail] = useState<PrivacyRail>(profile.privacyRail);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([
    { id: 1, description: "Product strategy sprint", quantity: 1, price: 1600 },
    { id: 2, description: "Umbra integration advisory", quantity: 1, price: 650 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const total = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  function updateLineItem(id: number, patch: Partial<EditableLineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { id: Date.now(), description: "", quantity: 1, price: 0 },
    ]);
  }

  function removeLineItem(id: number) {
    setLineItems((items) => items.filter((item) => item.id !== id));
  }

  async function submitInvoice(status: InvoiceStatus) {
    setIsSubmitting(true);
    setSubmitError("");

    const payload: CreateInvoiceInput = {
      invoiceNumber,
      clientName,
      clientEmail,
      issuedAt,
      dueAt,
      notes,
      paymentRail,
      privacyRail,
      mint: "USDC",
      status,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    try {
      const invoice = await createInvoiceClient(payload);

      toast.success(
        status === "Draft" ? "Invoice draft saved." : "Invoice created.",
      );
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create invoice.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
        <section className="flex-1 overflow-y-auto border-r border-border bg-card p-6 md:p-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <header>
              <h1 className="font-serif text-2xl font-semibold text-foreground">
                New Invoice
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a new private receivable.
              </p>
            </header>

            <div className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Client Name</Label>
                  <Input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Client Email</Label>
                  <Input
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    type="email"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Invoice #</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    className="bg-background font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={issuedAt}
                    onChange={(event) => setIssuedAt(event.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Line Items</Label>
                </div>

                <div className="flex flex-col gap-3">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        className="flex-1 bg-background"
                      />
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(event) =>
                          updateLineItem(item.id, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className="w-20 bg-background"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price}
                        onChange={(event) =>
                          updateLineItem(item.id, {
                            price: Number(event.target.value),
                          })
                        }
                        className="w-32 bg-background"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove line item"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="w-full border-dashed"
                >
                  <Plus className="size-4" /> Add Item
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Payment Rail</Label>
                  <Select
                    value={paymentRail}
                    onValueChange={(value) => setPaymentRail(value as PaymentRail)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solana">Solana USDC</SelectItem>
                      <SelectItem value="ethereum" disabled>
                        Ethereum USDC (Coming Soon)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Privacy Rail</Label>
                  <Select
                    value={privacyRail}
                    onValueChange={(value) => setPrivacyRail(value as PrivacyRail)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select privacy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umbra">Umbra Protocol</SelectItem>
                      <SelectItem value="none">Public (No Privacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="resize-none bg-background"
                  rows={3}
                />
              </div>
            </div>

            {submitError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => void submitInvoice("Draft")}
              >
                {isSubmitting ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => void submitInvoice("Sent")}
              >
                {isSubmitting ? "Creating..." : "Create Invoice"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden overflow-y-auto bg-muted/20 p-8 lg:block lg:w-5/12">
          <div className="sticky top-8 mx-auto max-w-md">
            <Label className="mb-4 block text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Live Preview
            </Label>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="overflow-hidden rounded-sm border border-border bg-white shadow-xl dark:bg-[#1a1a1a]"
              style={{ minHeight: 600 }}
            >
              <div className="flex flex-col gap-8 p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-primary">
                      {profile.businessName}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile.contactEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                      Invoice
                    </h3>
                    <p className="mt-1 font-mono text-sm">{invoiceNumber || "DV-0000"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      Billed To
                    </p>
                    <p className="font-medium">{clientName || "Client name"}</p>
                    <p className="text-muted-foreground">
                      {clientEmail || "client@example.com"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      Details
                    </p>
                    <p>Issued: {issuedAt || "YYYY-MM-DD"}</p>
                    <p className="mt-0.5 font-medium">Due: {dueAt || "YYYY-MM-DD"}</p>
                  </div>
                </div>

                <div className="border-y border-border/50 py-4">
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
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3">
                            {item.description || "Item description"}
                          </td>
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

                <div className="flex justify-end">
                  <div className="flex w-1/2 flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatUsdc(total)} USDC</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-serif text-base font-medium">
                      <span>Total Due</span>
                      <span>{formatUsdc(total)} USDC</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-8">
                  <div>
                    <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      Payment Instructions
                    </p>
                    <p className="text-sm">
                      Pay via Solana USDC. This invoice uses Umbra Protocol for
                      private settlement through a stealth address.
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      Notes
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {notes || "Optional invoice note."}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </aside>
    </div>
  );
}
