"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
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
import { CheckoutUmbraPayment } from "@/components/checkout-umbra-payment";
import { Separator } from "@/components/ui/separator";
import {
  getCheckoutPaymentDisplayStatus,
  mapCheckoutPaymentStatus,
  type CheckoutPaymentStatus,
} from "@/features/checkout/status";
import type { CheckoutPaymentViewModel } from "@/features/checkout/service";
import type {
  InvoiceStatus,
  PublicUmbraPaymentStatus,
} from "@/features/invoices/types";

const CheckoutQrCode = dynamic(() => import("@/components/checkout-qr-code"), {
  ssr: false,
  loading: () => <QrCode className="size-16 animate-pulse text-slate-300" />,
});

type CheckoutQrPaymentProps = {
  checkout: CheckoutPaymentViewModel;
};

type InvoiceStatusResponse = {
  invoice?: {
    publicId: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    latestUmbraPayment: PublicUmbraPaymentStatus | null;
  };
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
  presentationMode,
  statusEndpoint,
}: {
  isRefreshing: boolean;
  lastChecked: Date | null;
  onRefresh: () => void;
  paymentStatus: CheckoutPaymentStatus;
  presentationMode: CheckoutPaymentViewModel["presentationMode"];
  statusEndpoint: string | null;
}) {
  const displayPaymentStatus = getCheckoutPaymentDisplayStatus(
    paymentStatus,
    presentationMode,
  );

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusToneStyles[displayPaymentStatus.statusTone]}`}
          >
            {displayPaymentStatus.statusLabel}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {displayPaymentStatus.statusDescription}
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
          const isComplete = displayPaymentStatus.statusStep > stepNumber;
          const isCurrent = displayPaymentStatus.statusStep === stepNumber;

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
        {presentationMode === "demo"
          ? "Static preview"
          : `Last checked: ${formatLastChecked(lastChecked)}`}
      </p>
    </div>
  );
}

export function CheckoutQrPayment({ checkout }: CheckoutQrPaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState(checkout.paymentStatus);
  const [latestUmbraPayment, setLatestUmbraPayment] =
    useState<PublicUmbraPaymentStatus | null>(
      checkout.umbra?.latestPayment ?? null,
    );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const isDemoPresentation = checkout.presentationMode === "demo";

  useEffect(() => {
    setPaymentStatus(checkout.paymentStatus);
    setLatestUmbraPayment(checkout.umbra?.latestPayment ?? null);
  }, [checkout.paymentStatus, checkout.umbra?.latestPayment]);

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

      setPaymentStatus(
        mapCheckoutPaymentStatus(
          payload.invoice.status,
          payload.invoice.latestUmbraPayment ?? null,
        ),
      );
      setLatestUmbraPayment(payload.invoice.latestUmbraPayment ?? null);
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
            {checkout.source === "payment_intent"
              ? "Payment Request"
              : `Invoice ${checkout.invoiceNumber}`}
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
              presentationMode={checkout.presentationMode}
              statusEndpoint={checkout.statusEndpoint}
            />

            {isDemoPresentation && checkout.demoNotice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">
                  Demo checkout
                </p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-950">
                  {checkout.demoNotice}
                </p>
              </div>
            )}

            {!checkout.configurationError && checkout.mintNotice && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{checkout.mintNotice}</p>
                </div>
              </div>
            )}

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
            ) : checkout.paymentMode === "umbra" && checkout.umbra ? (
              <CheckoutUmbraPayment
                amountDisplay={checkout.amountDisplay}
                mint={checkout.mintDisplayName}
                mode={checkout.presentationMode}
                umbra={{
                  ...checkout.umbra,
                  latestPayment: latestUmbraPayment,
                }}
                onPaymentSaved={(payment, status) => {
                  setLatestUmbraPayment(payment);
                  setPaymentStatus(mapCheckoutPaymentStatus(status, payment));
                  setLastChecked(new Date());
                }}
                onStatusRefresh={() => void refreshPaymentStatus({ quiet: true })}
              />
            ) : isDemoPresentation ? null : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                  <QrCode className="size-3.5" />
                  Scan to pay
                </div>
                <div className="mx-auto flex size-[17rem] max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:size-[18.5rem]">
                  <CheckoutQrCode
                    invoiceNumber={checkout.invoiceNumber}
                    solanaPayUrl={checkout.solanaPayUrl}
                  />
                </div>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                  Scan with a Solana Pay wallet or copy the details below.
                </p>
              </div>
            )}

            {!isDemoPresentation && (
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
                      onClick={() =>
                        copyValue("Receiver address", checkout.receiverAddress)
                      }
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
                        {checkout.amountNumber} {checkout.mintDisplayName}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyValue(
                            "Amount",
                            `${checkout.amountNumber} ${checkout.mintDisplayName}`,
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
                      {checkout.source === "payment_intent"
                        ? "Payment memo"
                        : "Invoice memo"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="font-mono text-sm text-slate-900">
                        {checkout.memo}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyValue(
                            checkout.source === "payment_intent"
                              ? "Payment memo"
                              : "Invoice memo",
                            checkout.memo,
                          )
                        }
                      >
                        <Copy className="size-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div className="text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-medium text-slate-700">
                  {isDemoPresentation
                    ? "Umbra mainnet demo preview"
                    : checkout.paymentMode === "umbra"
                    ? "Private settlement via Umbra"
                    : "Direct Solana Pay"}
                </p>
                {isDemoPresentation
                  ? "This read-only preview shows what an Umbra checkout looks like on mainnet. No wallet connection or payment is required."
                  : checkout.paymentMode === "umbra"
                  ? "This payment uses the merchant's Umbra receiver for private settlement."
                  : "This QR points to the merchant payment receiver for this checkout."}
              </div>
            </div>

            {!checkout.configurationError && checkout.paymentMode === "solana_pay" && (
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
