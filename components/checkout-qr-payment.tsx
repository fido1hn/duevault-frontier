"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  mapCheckoutPaymentStatus,
  type CheckoutPaymentStatus,
  type CheckoutPaymentViewModel,
} from "@/lib/checkout-payment";
import type { SerializedInvoice } from "@/lib/invoice-types";

type CheckoutQrPaymentProps = {
  checkout: CheckoutPaymentViewModel;
};

type InvoiceStatusResponse = {
  invoice?: SerializedInvoice;
  error?: string;
};

const statusToneStyles = {
  waiting: "border-[var(--status-pending)]/30 bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
  pending: "border-[var(--status-pending)]/30 bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
  complete: "border-[var(--status-paid)]/30 bg-[var(--status-paid-bg)] text-[var(--status-paid)]",
  settled:
    "border-[var(--status-claimed)]/30 bg-[var(--status-claimed-bg)] text-[var(--status-claimed)]",
};

const statusSteps = ["Awaiting payment", "Payment pending", "Completed"];

function truncateAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatLastChecked(value: Date | null) {
  if (!value) {
    return "Not checked yet";
  }

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PaymentStatusPanel({
  isRefreshing,
  lastChecked,
  onRefresh,
  paymentStatus,
  statusEndpoint,
}: {
  isRefreshing: boolean;
  lastChecked: Date | null;
  onRefresh: () => void;
  paymentStatus: CheckoutPaymentStatus;
  statusEndpoint: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusToneStyles[paymentStatus.statusTone]}`}
          >
            {paymentStatus.statusLabel}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {paymentStatus.statusDescription}
          </p>
        </div>
        {statusEndpoint && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {statusSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = paymentStatus.statusStep > stepNumber;
          const isCurrent = paymentStatus.statusStep === stepNumber;

          return (
            <div key={step} className="flex flex-col gap-2">
              <div
                className={`h-1 rounded-full ${
                  isComplete || isCurrent
                    ? "bg-[var(--status-paid)]"
                    : "bg-slate-200"
                }`}
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                {isComplete ? (
                  <CheckCircle2 className="size-3 text-[var(--status-paid)]" />
                ) : (
                  <Circle
                    className={`size-3 ${
                      isCurrent ? "text-[var(--status-paid)]" : "text-slate-300"
                    }`}
                  />
                )}
                <span className={isCurrent ? "font-medium text-slate-900" : ""}>
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Last checked: {formatLastChecked(lastChecked)}
      </p>
    </div>
  );
}

export function CheckoutQrPayment({ checkout }: CheckoutQrPaymentProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(checkout.paymentStatus);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (!checkout.solanaPayUrl) {
      setQrDataUrl("");
      return;
    }

    void QRCode.toDataURL(checkout.solanaPayUrl, {
      color: {
        dark: "#113537",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 384,
    }).then((url) => {
      if (!isCancelled) {
        setQrDataUrl(url);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [checkout.solanaPayUrl]);

  useEffect(() => {
    setPaymentStatus(checkout.paymentStatus);
  }, [checkout.paymentStatus]);

  async function refreshPaymentStatus({ quiet = false } = {}) {
    if (!checkout.statusEndpoint) return;

    if (!quiet) {
      setIsRefreshingStatus(true);
    }

    try {
      const response = await fetch(checkout.statusEndpoint, {
        cache: "no-store",
      });
      const payload = (await response.json()) as InvoiceStatusResponse;

      if (!response.ok || !payload.invoice) {
        throw new Error(payload.error ?? "Unable to refresh payment status.");
      }

      setPaymentStatus(mapCheckoutPaymentStatus(payload.invoice.status));
      setLastChecked(new Date());
    } catch (error) {
      if (!quiet) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to refresh payment status.",
        );
      }
    } finally {
      if (!quiet) {
        setIsRefreshingStatus(false);
      }
    }
  }

  useEffect(() => {
    if (!checkout.statusEndpoint) return;

    void refreshPaymentStatus({ quiet: true });
    const intervalId = window.setInterval(() => {
      void refreshPaymentStatus({ quiet: true });
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [checkout.statusEndpoint]);

  async function copyValue(label: string, value: string | null) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded bg-[#1e293b] font-serif text-xl font-bold text-white">
            D
          </div>
          <p className="mb-1 text-sm font-medium tracking-wider text-slate-500 uppercase">
            Invoice {checkout.invoiceNumber}
          </p>
          <h1 className="font-serif text-2xl text-slate-900">
            {checkout.merchantName}
          </h1>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 p-6 text-center">
            <p className="mb-1 text-sm text-slate-500">Amount Due</p>
            <p className="font-serif text-4xl font-medium text-slate-900">
              {checkout.amountDisplay}
            </p>
            <p className="mt-2 text-sm text-slate-500">Due {checkout.dueLong}</p>
          </div>

          <CardContent className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-900">
                Line Items
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                {checkout.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="text-slate-600">{item.description}</span>
                    <span className="font-medium text-slate-900">
                      {item.amountDisplay}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <PaymentStatusPanel
              isRefreshing={isRefreshingStatus}
              lastChecked={lastChecked}
              onRefresh={() => void refreshPaymentStatus()}
              paymentStatus={paymentStatus}
              statusEndpoint={checkout.statusEndpoint}
            />

            {checkout.configurationError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-medium">Payment address not configured</p>
                    <p className="mt-2 leading-relaxed">
                      {checkout.configurationError}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                  <QrCode className="size-3.5" />
                  Scan to pay
                </div>
                <div className="mx-auto flex size-[17rem] max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:size-[18.5rem]">
                  {qrDataUrl ? (
                    <Image
                      src={qrDataUrl}
                      alt={`Solana Pay QR code for invoice ${checkout.invoiceNumber}`}
                      width={384}
                      height={384}
                      unoptimized
                      className="size-full object-contain"
                    />
                  ) : (
                    <QrCode className="size-16 animate-pulse text-slate-300" />
                  )}
                </div>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                  Scan with a Solana Pay wallet or copy the details below.
                </p>
              </div>
            )}

            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-100 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Receiver</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-sm text-slate-900">
                    {checkout.receiverAddress
                      ? truncateAddress(checkout.receiverAddress)
                      : "Not configured"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!checkout.receiverAddress}
                    onClick={() => copyValue("Receiver address", checkout.receiverAddress)}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Amount</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-sm text-slate-900">
                      {checkout.amountNumber} {checkout.mint}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyValue(
                          "Amount",
                          `${checkout.amountNumber} ${checkout.mint}`,
                        )
                      }
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Invoice memo
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-sm text-slate-900">
                      {checkout.memo}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyValue("Invoice memo", checkout.memo)}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div className="text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-medium text-slate-700">
                  Private settlement via Umbra
                </p>
                This QR currently points to the configured checkout receiver for
                this invoice. The next Umbra integration slice will replace it
                with a per-invoice private payment destination while preserving
                invoice-specific proof.
              </div>
            </div>

            {!checkout.configurationError && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="size-4 text-emerald-600" />
                No DueVault wallet connection required for the payer.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
            Powered by{" "}
            <span className="font-serif font-semibold text-slate-600">
              DueVault
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
