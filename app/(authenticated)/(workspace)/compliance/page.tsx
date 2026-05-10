"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import {
  Check,
  Copy,
  CalendarDays,
  Loader2,
  Plus,
  Shield,
  ShieldOff,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reconstructSdkGrant } from "@/features/audit/client";
import {
  buildAuditorPortalUrl,
} from "@/features/audit/client";
import {
  useGrantsQuery,
  useIssueGrantMutation,
  useRevokeGrantMutation,
} from "@/features/audit/queries";
import {
  applyComplianceScopePreset,
  buildComplianceScopeSummary,
  getGrantableInvoicePayments,
  toggleInvoicePaymentScope,
} from "@/features/audit/scope-selection";
import type {
  GrantTokenPayload,
  SerializedComplianceGrant,
} from "@/features/audit/types";
import { useInvoicesQuery } from "@/features/invoices/queries";
import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { createMerchantWalletMasterSeedStorage } from "@/features/wallet/merchant-wallet-actions";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import type { DueVaultConfig } from "@/lib/umbra/sdk";
import { cn, truncateMiddle } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

type IssuedResult = {
  grant: SerializedComplianceGrant;
  token: GrantTokenPayload;
};

function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("bg-card", className)}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied.`);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}

function StatusPill({ status }: { status: SerializedComplianceGrant["status"] }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="border bg-[var(--status-claimed-bg)] text-[var(--status-claimed)] border-[var(--status-claimed)]"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border bg-[var(--status-overdue-bg)] text-[var(--status-overdue)] border-[var(--status-overdue)]"
    >
      Revoked
    </Badge>
  );
}

export default function CompliancePage() {
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const { wallet, signTransaction, signMessage } = usePrivyUmbraSigner(
    profile.walletAddress,
  );
  const grantsQuery = useGrantsQuery();
  const invoicesQuery = useInvoicesQuery();
  const issueMutation = useIssueGrantMutation();
  const revokeMutation = useRevokeGrantMutation();

  const masterSeedStorage = useMemo(
    () => createMerchantWalletMasterSeedStorage(),
    [],
  );

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [auditorAddress, setAuditorAddress] = useState("");
  const [label, setLabel] = useState("");
  const [selectedPaymentSignatures, setSelectedPaymentSignatures] = useState<
    string[]
  >([]);
  const [issueError, setIssueError] = useState("");
  const [issuedResult, setIssuedResult] = useState<IssuedResult | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const isUmbraReady =
    profile.umbraStatus === "ready" && Boolean(profile.umbraWalletAddress);
  const canSign =
    standardWallets.ready && Boolean(wallet) && isUmbraReady;

  const grants = grantsQuery.data ?? [];
  const grantablePayments = useMemo(
    () => getGrantableInvoicePayments(invoicesQuery.data ?? []),
    [invoicesQuery.data],
  );
  const scopeSummary = useMemo(
    () =>
      buildComplianceScopeSummary(
        grantablePayments,
        selectedPaymentSignatures,
      ),
    [grantablePayments, selectedPaymentSignatures],
  );
  const grantsError = grantsQuery.isError
    ? grantsQuery.error instanceof Error
      ? grantsQuery.error.message
      : "Unable to load compliance grants."
    : "";

  function buildConfig(): DueVaultConfig | null {
    if (!wallet) return null;
    const runtimeConfig = getUmbraRuntimeConfig();
    return {
      ...runtimeConfig,
      signer: createPrivyUmbraSigner({
        wallet,
        signTransaction,
        signMessage,
      }),
      deferMasterSeedSignature: true,
      preferPollingTransactionForwarder: true,
      masterSeedStorage,
    };
  }

  function resetIssueForm() {
    setShowIssueForm(false);
    setAuditorAddress("");
    setLabel("");
    setSelectedPaymentSignatures([]);
    setIssueError("");
    setIssuedResult(null);
  }

  async function handleIssue(event: React.FormEvent) {
    event.preventDefault();
    setIssueError("");

    if (!profile.umbraWalletAddress) {
      const msg = "Set up Umbra in Settings before issuing a grant.";
      setIssueError(msg);
      toast.error(msg);
      return;
    }

    const trimmedAuditor = auditorAddress.trim();
    if (!SOLANA_ADDRESS_REGEX.test(trimmedAuditor)) {
      const msg = "Enter a valid Solana wallet address.";
      setIssueError(msg);
      return;
    }

    if (selectedPaymentSignatures.length === 0) {
      const msg = "Select at least one confirmed Umbra payment to share.";
      setIssueError(msg);
      toast.error(msg);
      return;
    }

    const config = buildConfig();
    if (!config) {
      const msg = "Connect the Solana wallet attached to this merchant profile.";
      setIssueError(msg);
      toast.error(msg);
      return;
    }

    try {
      const result = await issueMutation.mutateAsync({
        config,
        input: {
          granterAddress: profile.umbraWalletAddress,
          auditorAddress: trimmedAuditor,
          label: label.trim() || null,
          paymentScopeSignatures: selectedPaymentSignatures,
        },
      });
      setIssuedResult(result);
      setAuditorAddress("");
      setLabel("");
      setSelectedPaymentSignatures([]);
      toast.success("Compliance grant issued.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to issue grant.";
      setIssueError(message);
      toast.error(message);
    }
  }

  async function handleRevoke(grant: SerializedComplianceGrant) {
    const config = buildConfig();
    if (!config) {
      toast.error("Connect the Solana wallet attached to this merchant profile.");
      return;
    }

    setRevokingId(grant.id);
    try {
      const sdkGrant = reconstructSdkGrant(grant);
      await revokeMutation.mutateAsync({
        config,
        grant: sdkGrant,
        grantId: grant.id,
      });
      toast.success("Compliance grant revoked.");
      setRevokeConfirmId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to revoke grant.";
      toast.error(message);
    } finally {
      setRevokingId(null);
    }
  }

  const portalOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const grantTokenJson = issuedResult
    ? JSON.stringify(issuedResult.token, null, 2)
    : "";
  const auditorPortalUrl = issuedResult
    ? buildAuditorPortalUrl(portalOrigin, issuedResult.token)
    : "";

  function applyPreset(preset: "last_30_days" | "last_month") {
    setSelectedPaymentSignatures(
      applyComplianceScopePreset(preset, grantablePayments),
    );
    setIssueError("");
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="size-5" />
          </div>
          <h1 className="font-serif text-3xl font-semibold">Compliance</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Share scoped, decryptable views of specific invoices with auditors and
          accountants. Each grant is an on-chain X25519 viewing key — revoke any
          time.
        </p>
      </header>

      {!isUmbraReady && (
        <Card className="border-[var(--status-pending)]/25 bg-[var(--status-pending-bg)]">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-foreground">
              Set up Umbra in your merchant settings before issuing compliance
              grants.
            </p>
            <Button asChild variant="outline" size="sm" className="w-fit bg-card">
              <a href="/settings">Open settings</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {!issuedResult && !showIssueForm && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={!canSign}
            onClick={() => setShowIssueForm(true)}
            className="w-fit"
          >
            <Plus className="size-4" />
            Issue grant
          </Button>
          {isUmbraReady && !wallet && standardWallets.ready && (
            <p className="text-xs text-muted-foreground">
              Connect the Solana wallet attached to this merchant profile to
              issue or revoke grants.
            </p>
          )}
        </div>
      )}

      {!issuedResult && showIssueForm && (
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Issue grant</CardTitle>
            <CardDescription>
              The auditor must already have an Umbra X25519 key registered. They
              can set one up at{" "}
              <Link
                href="/audit"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                duevault.xyz/audit
              </Link>{" "}
              with their wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleIssue}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="auditor-address">Auditor wallet address</Label>
                <Input
                  id="auditor-address"
                  placeholder="So11111111111111111111111111111111111111112"
                  value={auditorAddress}
                  onChange={(event) => {
                    setAuditorAddress(event.target.value);
                    setIssueError("");
                  }}
                  disabled={issueMutation.isPending}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="grant-label">Label (optional)</Label>
                <Input
                  id="grant-label"
                  placeholder="Q4 2025 — KPMG"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    setIssueError("");
                  }}
                  disabled={issueMutation.isPending}
                  maxLength={120}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label>Evidence scope</Label>
                  <p className="text-xs text-muted-foreground">
                    Select invoices to share. DueVault stores the exact confirmed
                    Umbra transaction signatures in the grant.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    disabled={issueMutation.isPending || grantablePayments.length === 0}
                    onClick={() => applyPreset("last_30_days")}
                  >
                    <CalendarDays className="size-4" />
                    Last 30 days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    disabled={issueMutation.isPending || grantablePayments.length === 0}
                    onClick={() => applyPreset("last_month")}
                  >
                    <CalendarDays className="size-4" />
                    Last month
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={
                      issueMutation.isPending ||
                      selectedPaymentSignatures.length === 0
                    }
                    onClick={() => setSelectedPaymentSignatures([])}
                  >
                    Clear
                  </Button>
                </div>

                {invoicesQuery.isPending && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading confirmed Umbra payments...
                  </div>
                )}

                {!invoicesQuery.isPending && grantablePayments.length === 0 && (
                  <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                    No confirmed Umbra payments are ready to grant yet.
                  </div>
                )}

                {grantablePayments.length > 0 && (
                  <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                    <ul className="divide-y divide-border">
                      {grantablePayments.map((payment) => {
                        const isSelected = selectedPaymentSignatures.includes(
                          payment.createUtxoSignature,
                        );

                        return (
                          <li key={payment.createUtxoSignature}>
                            <button
                              type="button"
                              disabled={issueMutation.isPending}
                              onClick={() => {
                                setSelectedPaymentSignatures((current) =>
                                  toggleInvoicePaymentScope(current, payment),
                                );
                                setIssueError("");
                              }}
                              className={cn(
                                "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30",
                                isSelected && "bg-primary/5",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card",
                                )}
                              >
                                {isSelected && <Check className="size-3" />}
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {payment.invoiceNumber}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {payment.client}
                                  </span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Confirmed{" "}
                                  {dateFormatter.format(
                                    new Date(payment.confirmedAt),
                                  )}{" "}
                                  · {amountFormatter.format(payment.amountNumber)}{" "}
                                  {payment.mint}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {truncateMiddle(payment.createUtxoSignature)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {scopeSummary.transactionCount > 0 && (
                  <div className="grid gap-3 rounded-md border border-border bg-muted/10 p-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Invoices
                      </p>
                      <p className="font-medium text-foreground">
                        {scopeSummary.invoiceCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Transactions
                      </p>
                      <p className="font-medium text-foreground">
                        {scopeSummary.transactionCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Total
                      </p>
                      <p className="font-medium text-foreground">
                        {amountFormatter.format(scopeSummary.totalAmountNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Dates
                      </p>
                      <p className="font-medium text-foreground">
                        {scopeSummary.startDate && scopeSummary.endDate
                          ? `${dateFormatter.format(
                              new Date(scopeSummary.startDate),
                            )} - ${dateFormatter.format(
                              new Date(scopeSummary.endDate),
                            )}`
                          : "None"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {issueError && (
                <p className="rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
                  {issueError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={issueMutation.isPending || !canSign}>
                  {issueMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Issue grant
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={issueMutation.isPending}
                  onClick={resetIssueForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {issuedResult && (
        <Card className="border-[var(--status-claimed)]/25 bg-[var(--status-claimed-bg)]/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="size-5 text-[var(--status-claimed)]" />
              <CardTitle className="font-serif text-xl">Grant issued</CardTitle>
            </div>
            <CardDescription>
              Send the auditor the portal URL below. They paste it into{" "}
              <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-xs">
                /audit
              </code>{" "}
              with a transaction signature to view the invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Auditor portal URL
              </Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  readOnly
                  value={auditorPortalUrl}
                  className="font-mono text-xs"
                  onClick={(event) => event.currentTarget.select()}
                />
                <CopyButton value={auditorPortalUrl} label="Copy URL" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Grant token (JSON)
              </Label>
              <Textarea
                readOnly
                value={grantTokenJson}
                rows={9}
                className="font-mono text-xs"
                onClick={(event) => event.currentTarget.select()}
              />
              <CopyButton
                value={grantTokenJson}
                label="Copy grant JSON"
                className="w-fit"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="bg-card"
                onClick={() => {
                  setIssuedResult(null);
                  setShowIssueForm(true);
                }}
              >
                <Plus className="size-4" />
                Issue another
              </Button>
              <Button type="button" variant="ghost" onClick={resetIssueForm}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Compliance grants</CardTitle>
          <CardDescription>
            Every grant issued from this merchant profile, including revoked ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grantsQuery.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading grants...
            </div>
          )}

          {grantsError && (
            <p className="rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
              {grantsError}
            </p>
          )}

          {!grantsQuery.isPending && !grantsError && grants.length === 0 && (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-8 text-sm text-muted-foreground">
              <ShieldOff className="size-5 text-muted-foreground" />
              <p>No compliance grants yet. Issue one to share scoped invoice access with an auditor.</p>
            </div>
          )}

          {grants.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {grants.map((grant) => {
                const isConfirming = revokeConfirmId === grant.id;
                const isRevokingThis = revokingId === grant.id;
                const grantedAt = dateFormatter.format(new Date(grant.grantedAt));

                return (
                  <li
                    key={grant.id}
                    className="relative flex flex-col gap-3 py-4 transition-colors hover:bg-muted/20 md:flex-row md:items-center md:justify-between"
                  >
                    <Link
                      href={`/compliance/grants/${grant.id}`}
                      aria-label={`View ${grant.label || "unlabeled"} grant`}
                      className="absolute inset-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    />
                    <div className="pointer-events-none flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {grant.label || "Unlabeled grant"}
                        </p>
                        <StatusPill status={grant.status} />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {truncateMiddle(grant.auditorAddress)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued {grantedAt}
                      </p>
                    </div>

                    {grant.status === "active" && !isConfirming && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="relative z-10 w-fit bg-card"
                        disabled={!canSign || isRevokingThis}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setRevokeConfirmId(grant.id);
                        }}
                      >
                        Revoke
                      </Button>
                    )}

                    {grant.status === "active" && isConfirming && (
                      <div className="relative z-10 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          Revoke this grant?
                        </p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isRevokingThis}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleRevoke(grant);
                          }}
                        >
                          {isRevokingThis ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Confirm
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isRevokingThis}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setRevokeConfirmId(null);
                          }}
                        >
                          <X className="size-4" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
