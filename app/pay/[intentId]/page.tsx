"use client";

import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { QrCode, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { business, formatUsdc, getInvoiceById } from "@/lib/demo-data";

export default function PayPage() {
  const params = useParams<{ intentId: string }>();
  const invoice = getInvoiceById(params.intentId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded bg-[#1e293b] font-serif text-xl font-bold text-white">
            N
          </div>
          <p className="mb-1 text-sm font-medium tracking-wider text-slate-500 uppercase">
            Invoice {invoice.id}
          </p>
          <h1 className="font-serif text-2xl text-slate-900">{business.name}</h1>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 p-6 text-center">
            <p className="mb-1 text-sm text-slate-500">Amount Due</p>
            <p className="font-serif text-4xl font-medium text-slate-900">
              {invoice.amount}
            </p>
            <p className="mt-2 text-sm text-slate-500">Due {invoice.dueLong}</p>
          </div>

          <CardContent className="flex flex-col gap-6 p-6">
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-900">Line Items</h2>
              <div className="flex flex-col gap-3 text-sm">
                {invoice.lineItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <span className="text-slate-600">{item.description}</span>
                    <span className="font-medium text-slate-900">
                      {formatUsdc(item.quantity * item.price)} USDC
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="flex flex-col gap-3">
              <Button className="h-12 w-full border-0 bg-[#14b8a6] text-base text-white hover:bg-[#0d9488]">
                Connect Wallet
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full border-slate-200 text-base text-slate-700 hover:bg-slate-50"
              >
                <QrCode className="size-4" /> Show QR Code
              </Button>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div className="text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-medium text-slate-700">
                  Private Settlement via Umbra
                </p>
                This payment is processed on Solana. The merchant uses Umbra
                Protocol. You pay to a stealth address, so their identity and balance
                are protected.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
            Powered by{" "}
            <span className="font-serif font-semibold text-slate-600">DueVault</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
