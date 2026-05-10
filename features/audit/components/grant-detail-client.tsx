"use client";

import Link from "next/link";
import { useState } from "react";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Shield,
  ShieldOff,
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
import {
  buildAuditorPortalUrl,
  reconstructSdkGrant,
} from "@/features/audit/client";
import { grantTokenPayloadFromSerialized } from "@/features/audit/mappers";
import {
  useGrantQuery,
  useRevokeGrantMutation,
} from "@/features/audit/queries";
import type { SerializedComplianceGrant } from "@/features/audit/types";
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

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type GrantDetailClientProps = {
  grantId: string;
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

function FieldRow({
  label,
  value,
  mono = false,
  copyLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground md:w-44 md:shrink-0 md:pt-1">
        {label}
      </Label>
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <p
          className={cn(
            "min-w-0 break-all text-sm text-foreground",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </p>
        {copyLabel && (
          <CopyButton value={value} label={copyLabel} className="shrink-0" />
        )}
      </div>
    </div>
  );
}

export function GrantDetailClient({ grantId }: GrantDetailClientProps) {
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const { wallet, signTransaction, signMessage } = usePrivyUmbraSigner(
    profile.walletAddress,
  );
  const grantQuery = useGrantQuery(grantId);
  const revokeMutation = useRevokeGrantMutation();
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const grant = grantQuery.data ?? null;
  const isLoading = grantQuery.isPending;
  const error = grantQuery.isError
    ? grantQuery.error instanceof Error
      ? grantQuery.error.message
      : "Unable to load compliance grant."
    : "";

  const isUmbraReady =
    profile.umbraStatus === "ready" && Boolean(profile.umbraWalletAddress);
  const canSign = standardWallets.ready && Boolean(wallet) && isUmbraReady;

  const portalOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const grantToken = grant ? grantTokenPayloadFromSerialized(grant) : null;
  const auditorPortalUrl =
    grant && grantToken ? buildAuditorPortalUrl(portalOrigin, grantToken) : "";
  const grantTokenJson = grantToken
    ? JSON.stringify(grantToken, null, 2)
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
      masterSeedStorage: createMerchantWalletMasterSeedStorage(),
    };
  }

  async function handleRevoke() {
    if (!grant) return;
    const config = buildConfig();
    if (!config) {
      toast.error("Connect the Solana wallet attached to this merchant profile.");
      return;
    }

    setIsRevoking(true);
    try {
      const sdkGrant = reconstructSdkGrant(grant);
      await revokeMutation.mutateAsync({
        config,
        grant: sdkGrant,
        grantId: grant.id,
      });
      toast.success("Compliance grant revoked.");
      setRevokeConfirm(false);
    } catch (revokeError) {
      const message =
        revokeError instanceof Error
          ? revokeError.message
          : "Unable to revoke grant.";
      toast.error(message);
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit pl-0 text-muted-foreground"
      >
        <Link href="/compliance">
          <ArrowLeft className="size-4" /> Back to Compliance
        </Link>
      </Button>

      {isLoading && (
        <Card className="border-card-border">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading grant...
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Card className="border-card-border">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <div className="flex items-center gap-2">
              <ShieldOff className="size-5 text-muted-foreground" />
              <h1 className="font-serif text-xl font-semibold">
                Grant unavailable
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild variant="outline" size="sm" className="bg-card">
              <Link href="/compliance">Back to Compliance</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grant && (
        <>
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="size-5" />
                </div>
                <h1 className="truncate font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  {grant.label || "Unlabeled grant"}
                </h1>
                <StatusPill status={grant.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Issued{" "}
                {dateTimeFormatter.format(new Date(grant.grantedAt))}
                {grant.revokedAt && (
                  <>
                    {" "}
                    · Revoked{" "}
                    {dateTimeFormatter.format(new Date(grant.revokedAt))}
                  </>
                )}
              </p>
            </div>

            {grant.status === "active" && (
              <div className="flex flex-wrap items-center gap-2">
                {!revokeConfirm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    disabled={!canSign || isRevoking}
                    onClick={() => setRevokeConfirm(true)}
                  >
                    Revoke grant
                  </Button>
                )}

                {revokeConfirm && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Revoke this grant?
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isRevoking}
                      onClick={() => void handleRevoke()}
                    >
                      {isRevoking ? (
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
                      disabled={isRevoking}
                      onClick={() => setRevokeConfirm(false)}
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </header>

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Summary</CardTitle>
              <CardDescription>
                Who issued this grant, who can decrypt with it, and when.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldRow
                label="Auditor address"
                value={grant.auditorAddress}
                mono
                copyLabel="Copy"
              />
              <FieldRow
                label="Granter address"
                value={grant.granterAddress}
                mono
                copyLabel="Copy"
              />
              <FieldRow
                label="Issued at"
                value={dateTimeFormatter.format(new Date(grant.grantedAt))}
              />
              {grant.revokedAt && (
                <FieldRow
                  label="Revoked at"
                  value={dateTimeFormatter.format(new Date(grant.revokedAt))}
                />
              )}
              <FieldRow label="Grant ID" value={grant.id} mono copyLabel="Copy" />
            </CardContent>
          </Card>

          {grant.status === "active" && (
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  Auditor portal
                </CardTitle>
                <CardDescription>
                  Send the auditor this URL or paste the JSON token into{" "}
                  <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-xs">
                    /audit
                  </code>
                  . Anyone with the token can view the scoped evidence until you
                  revoke the grant.
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
              </CardContent>
            </Card>
          )}

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                Cryptographic material
              </CardTitle>
              <CardDescription>
                The on-chain primitives that bind this grant to the auditor's
                X25519 key.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldRow
                label="Grant nonce"
                value={grant.grantNonce}
                mono
                copyLabel="Copy"
              />
              <FieldRow
                label="Issuance signature"
                value={grant.issuanceSignature}
                mono
                copyLabel="Copy"
              />
              {grant.revocationSignature && (
                <FieldRow
                  label="Revocation signature"
                  value={grant.revocationSignature}
                  mono
                  copyLabel="Copy"
                />
              )}
              <FieldRow
                label="Granter X25519"
                value={grant.granterX25519Base58}
                mono
                copyLabel="Copy"
              />
              <FieldRow
                label="Auditor X25519"
                value={grant.auditorX25519Base58}
                mono
                copyLabel="Copy"
              />
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Scope</CardTitle>
              <CardDescription>
                The exact invoices and Umbra payment signatures this grant
                unlocks. Anything outside this list stays encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Payment signatures
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {grant.paymentScopeSignatures.length}
                  </span>
                </div>
                {grant.paymentScopeSignatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payment-level scope set on this grant.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                    {grant.paymentScopeSignatures.map((signature) => (
                      <li
                        key={signature}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {truncateMiddle(signature)}
                        </span>
                        <CopyButton value={signature} label="Copy" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Invoice IDs
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {grant.invoiceScopeIds.length}
                  </span>
                </div>
                {grant.invoiceScopeIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No invoice-level scope set on this grant.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                    {grant.invoiceScopeIds.map((invoiceId) => (
                      <li
                        key={invoiceId}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <Link
                          href={`/invoices/${invoiceId}`}
                          className="truncate font-mono text-xs text-foreground underline-offset-4 hover:underline"
                        >
                          {invoiceId}
                        </Link>
                        <CopyButton value={invoiceId} label="Copy" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Issued{" "}
                {dateFormatter.format(new Date(grant.grantedAt))} · Last updated{" "}
                {dateFormatter.format(new Date(grant.updatedAt))}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
