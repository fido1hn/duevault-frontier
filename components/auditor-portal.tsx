"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldOff,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
  getAuditorGateState,
  type AuditorRegistrationStatus,
} from "@/features/audit/auditor-gate";
import {
  runAuditorUmbraRegistration,
  type AuditorUmbraRegistrationStepId,
} from "@/features/audit/auditor-registration";
import { fetchEvidenceForToken } from "@/features/audit/client";
import type {
  AuditorEvidenceResponse,
  GrantTokenPayload,
} from "@/features/audit/types";
import {
  AuditValidationError,
  parseGrantTokenPayload,
  parseTxSignature,
} from "@/features/audit/validators";
import {
  getLinkedSolanaWallets,
  SOLANA_WALLET_LIST,
} from "@/features/auth/privy-wallets";
import { ApiClientError } from "@/features/auth/client";
import { atomicToNumber } from "@/features/invoices/validators";
import { getPaymentMintDisplayName } from "@/features/payments/mints";
import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  isAuditorX25519Registered,
  queryDueVaultUserRegistration,
} from "@/lib/umbra/sdk";
import { cn, truncateMiddle } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type AuditorPortalProps = {
  initialToken: GrantTokenPayload | null;
  initialTokenDecodeFailed?: boolean;
};

const STEP_LABEL: Record<AuditorUmbraRegistrationStepId, string> = {
  checking: "Checking on-chain account",
  account: "Initializing Umbra account",
  encryption: "Registering x25519 key",
  verifying: "Verifying registration",
  complete: "Registration complete",
  error: "Registration failed",
};

function explorerUrl(
  signature: string,
  network: AuditorEvidenceResponse["payment"]["network"],
) {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

function formatAmount(atomic: string, mint: AuditorEvidenceResponse["invoice"]["mint"]) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(atomicToNumber(atomic, mint));
}

function CopyChip({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-muted/40"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(`${label} copied.`);
      }}
    >
      {truncateMiddle(value, { prefix: 6, suffix: 6 })}
      <Copy className="size-3 opacity-60" />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

function GateShell({
  icon,
  title,
  body,
  action,
  secondaryAction,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <Card className="border-card-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex flex-col">
            <CardTitle className="font-serif text-lg">{title}</CardTitle>
            <CardDescription>{body}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {(action || secondaryAction) && (
        <CardContent className="flex flex-col gap-3">
          {action}
          {secondaryAction}
        </CardContent>
      )}
    </Card>
  );
}

function EvidenceView({ evidence }: { evidence: AuditorEvidenceResponse }) {
  const { grant, invoice, payment } = evidence;
  const totalDisplay = `${formatAmount(invoice.totalAmountAtomic, invoice.mint)} ${getPaymentMintDisplayName(invoice.mint)}`;

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-[var(--status-claimed)]/25 bg-[var(--status-claimed-bg)]/20">
        <CardContent className="flex items-start gap-3 py-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--status-claimed)]" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              Grant verified · {grant.label || "Unlabeled grant"}
            </p>
            <p className="text-xs text-muted-foreground">
              Granted by {truncateMiddle(grant.granterAddress)} to{" "}
              {truncateMiddle(grant.auditorAddress)} on{" "}
              {dateTimeFormatter.format(new Date(grant.grantedAt))}.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="font-serif text-2xl">
                Invoice {invoice.invoiceNumber}
              </CardTitle>
              <CardDescription className="mt-1">
                Issued by {invoice.merchantBusinessName}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="w-fit border bg-[var(--status-claimed-bg)] text-[var(--status-claimed)] border-[var(--status-claimed)]"
            >
              Confirmed on-chain
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <SectionLabel>Customer</SectionLabel>
              <p className="text-sm font-medium text-foreground">{invoice.client}</p>
              <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>
            </div>
            <div className="flex flex-col gap-1">
              <SectionLabel>Total</SectionLabel>
              <p className="font-serif text-2xl font-semibold text-foreground">
                {totalDisplay}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <SectionLabel>Issued</SectionLabel>
              <p className="text-sm text-foreground">
                {dateFormatter.format(new Date(invoice.issuedAt))}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <SectionLabel>Due</SectionLabel>
              <p className="text-sm text-foreground">
                {dateFormatter.format(new Date(invoice.dueAt))}
              </p>
            </div>
          </div>

          {invoice.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Line items</SectionLabel>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.lineItems.map((item, idx) => (
                      <tr key={`${idx}-${item.description}`}>
                        <td className="px-3 py-2 text-foreground">{item.description}</td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {formatAmount(item.unitAmountAtomic, invoice.mint)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {formatAmount(item.totalAtomic, invoice.mint)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {invoice.notes && (
            <div className="flex flex-col gap-1">
              <SectionLabel>Notes</SectionLabel>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="font-serif text-lg">On-chain payment</CardTitle>
          <CardDescription>
            Same transaction is opaque on a public explorer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <SectionLabel>Payer wallet</SectionLabel>
            <CopyChip value={payment.payerWalletAddress} label="Payer wallet" />
          </div>
          <div className="flex flex-col gap-1">
            <SectionLabel>Merchant Umbra wallet</SectionLabel>
            <CopyChip
              value={payment.merchantUmbraWalletAddress}
              label="Merchant Umbra wallet"
            />
          </div>
          <div className="flex flex-col gap-1">
            <SectionLabel>Network · mint</SectionLabel>
            <p className="text-sm text-foreground">
              {payment.network} · {truncateMiddle(payment.mint)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <SectionLabel>Confirmed</SectionLabel>
            <p className="text-sm text-foreground">
              {payment.confirmedAt
                ? dateTimeFormatter.format(new Date(payment.confirmedAt))
                : "Pending"}
            </p>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <SectionLabel>Create UTXO signature</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              <CopyChip value={payment.createUtxoSignature} label="UTXO signature" />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <Link
                  href={explorerUrl(payment.createUtxoSignature, payment.network)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Explorer <ExternalLink className="size-3" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditorPortal({
  initialToken,
  initialTokenDecodeFailed = false,
}: AuditorPortalProps) {
  const {
    authenticated,
    getAccessToken,
    linkWallet,
    login,
    ready: privyReady,
    user,
  } = usePrivy();
  const initialTokenJson = useMemo(
    () => (initialToken ? JSON.stringify(initialToken, null, 2) : ""),
    [initialToken],
  );
  const [grantJson, setGrantJson] = useState(initialTokenJson);
  const [txSignature, setTxSignature] = useState("");
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    () =>
      initialTokenDecodeFailed
        ? {
            message:
              "The grant link in your URL was malformed. Paste the grant token from the merchant manually.",
            code: "url_token_invalid",
          }
        : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [evidence, setEvidence] = useState<AuditorEvidenceResponse | null>(null);
  const parsedGateToken = useMemo(() => {
    try {
      return parseGrantTokenPayload(JSON.parse(grantJson));
    } catch {
      return initialToken;
    }
  }, [grantJson, initialToken]);
  const linkedSolanaWallets = useMemo(
    () => getLinkedSolanaWallets(user),
    [user],
  );
  const targetWalletAddress =
    parsedGateToken?.auditorAddress &&
    linkedSolanaWallets.some(
      (wallet) => wallet.address === parsedGateToken.auditorAddress,
    )
      ? parsedGateToken.auditorAddress
      : (linkedSolanaWallets[0]?.address ?? null);
  const { wallet, walletsReady, signTransaction, signMessage } =
    usePrivyUmbraSigner(targetWalletAddress);
  const [registrationStatus, setRegistrationStatus] =
    useState<AuditorRegistrationStatus>("unknown");
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [registrationStep, setRegistrationStep] =
    useState<AuditorUmbraRegistrationStepId | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const effectiveRegistrationStatus =
    registrationError && !isCheckingRegistration
      ? "unregistered"
      : isCheckingRegistration
        ? "unknown"
        : registrationStatus;
  const gateState = getAuditorGateState({
    activeWalletAddress: wallet?.address ?? null,
    authenticated,
    linkedWalletAddress: targetWalletAddress,
    privyReady,
    registrationStatus: effectiveRegistrationStatus,
    tokenAuditorAddress: parsedGateToken?.auditorAddress ?? null,
    walletsReady,
  });

  const refreshRegistrationStatus = useCallback(async () => {
    if (!wallet) return;
    setIsCheckingRegistration(true);
    setRegistrationError(null);

    try {
      const runtimeConfig = getUmbraRuntimeConfig();
      const signer = createPrivyUmbraSigner({
        wallet,
        signTransaction,
        signMessage,
        network: runtimeConfig.network,
      });
      const account = await queryDueVaultUserRegistration(
        {
          ...runtimeConfig,
          signer,
          deferMasterSeedSignature: true,
          preferPollingTransactionForwarder: true,
        },
        wallet.address,
      );
      setRegistrationStatus(
        isAuditorX25519Registered(account) ? "registered" : "unregistered",
      );
    } catch (err) {
      setRegistrationStatus("unknown");
      setRegistrationError(
        err instanceof Error
          ? err.message
          : "Unable to check Umbra registration status.",
      );
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [signMessage, signTransaction, wallet]);

  useEffect(() => {
    setRegistrationStatus("unknown");
    setRegistrationError(null);
    setRegistrationStep(null);

    if (!wallet || !walletsReady) {
      return;
    }

    void refreshRegistrationStatus();
  }, [refreshRegistrationStatus, wallet, walletsReady]);

  function reset() {
    setEvidence(null);
    setError(null);
  }

  function openLinkWallet() {
    linkWallet({
      walletChainType: "solana-only",
      walletList: SOLANA_WALLET_LIST,
    });
  }

  async function handleRegister() {
    if (!wallet) {
      toast.error("Connect your Solana wallet first.");
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);
    setRegistrationStep("checking");

    try {
      const result = await runAuditorUmbraRegistration({
        wallet,
        signTransaction,
        signMessage,
        onStep: setRegistrationStep,
      });
      setRegistrationStatus("registered");
      toast.success(
        result.alreadyRegistered
          ? "Your Umbra x25519 key was already registered."
          : "Umbra x25519 key registered.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to register your Umbra x25519 key.";
      setRegistrationError(message);
      setRegistrationStep("error");
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    setEvidence(null);

    try {
      let parsedToken: GrantTokenPayload;
      try {
        const tokenObj = JSON.parse(grantJson);
        parsedToken = parseGrantTokenPayload(tokenObj);
      } catch (parseError) {
        const message =
          parseError instanceof AuditValidationError
            ? parseError.message
            : "This grant token is malformed.";
        throw new Error(message);
      }

      const sig = parseTxSignature(txSignature.trim());
      const next = await fetchEvidenceForToken({
        token: parsedToken,
        txSignature: sig,
      }, getAccessToken);
      setEvidence(next);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : undefined;
      const message =
        err instanceof Error ? err.message : "Unable to load evidence.";
      setError({ message, code });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-card-border bg-card/30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-primary font-serif text-xl font-bold text-primary-foreground">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-base font-semibold leading-none text-foreground">
                DueVault
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                Auditor Portal
              </span>
            </div>
          </Link>
          <Badge variant="outline" className="hidden border bg-card md:inline-flex">
            <Lock className="size-3" />
            Selective Disclosure
          </Badge>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="size-5" />
            </div>
            <h1 className="font-serif text-3xl font-semibold">Auditor Portal</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Paste a compliance grant and a Solana transaction signature to view
            the underlying invoice. Only payments authorized by the merchant's
            grant are decryptable here — everything else stays private.
          </p>
        </section>

        {!gateState.canShowDecryptForm && (
          <>
            {gateState.kind === "loading" && (
              <GateShell
                icon={<Loader2 className="size-5 animate-spin" />}
                title="Loading auditor setup"
                body="Preparing your wallet session."
              />
            )}

            {gateState.kind === "sign_in" && (
              <GateShell
                icon={<KeyRound className="size-5" />}
                title="Sign in to use this audit grant"
                body="Auditors must sign in and use the Solana wallet the merchant issued the grant to."
                action={
                  <Button onClick={() => login()} className="w-full md:w-auto">
                    Sign in with Privy
                  </Button>
                }
              />
            )}

            {gateState.kind === "connect_wallet" && (
              <GateShell
                icon={<Wallet className="size-5" />}
                title="Connect your auditor wallet"
                body="Connect the Solana wallet the merchant will grant audit access to."
                action={
                  <Button onClick={openLinkWallet} className="w-full md:w-auto">
                    Connect Solana wallet
                  </Button>
                }
              />
            )}

            {gateState.kind === "wallet_mismatch" && (
              <GateShell
                icon={<ShieldOff className="size-5" />}
                title="Use the wallet this grant was issued to"
                body={`This grant is for ${truncateMiddle(
                  gateState.expectedAddress,
                )}, but you're signed in with ${truncateMiddle(
                  gateState.connectedAddress,
                )}. Switch to the grant recipient wallet to continue.`}
                action={
                  <Button onClick={openLinkWallet} className="w-full md:w-auto">
                    Use a different wallet
                  </Button>
                }
              />
            )}

            {gateState.kind === "connect_active_wallet" && (
              <GateShell
                icon={<Wallet className="size-5" />}
                title="Connect this Solana wallet"
                body={`Privy knows ${truncateMiddle(
                  gateState.walletAddress,
                )}, but it is not connected for signing yet. Reconnect or switch to this wallet to continue.`}
                action={
                  <Button onClick={openLinkWallet} className="w-full md:w-auto">
                    Connect wallet
                  </Button>
                }
              />
            )}

            {gateState.kind === "checking" && (
              <GateShell
                icon={<Loader2 className="size-5 animate-spin" />}
                title="Checking your Umbra registration"
                body={`Looking up the on-chain Umbra x25519 key for ${truncateMiddle(
                  gateState.walletAddress,
                )}.`}
              />
            )}

            {gateState.kind === "register" && (
              <Card className="border-card-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <KeyRound className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <CardTitle className="font-serif text-lg">
                        Register your Umbra x25519 key
                      </CardTitle>
                      <CardDescription>
                        Wallet {truncateMiddle(gateState.walletAddress)} needs a
                        one-time Umbra x25519 key before it can use audit grants.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {registrationStep && registrationStep !== "error" && (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {STEP_LABEL[registrationStep]}
                    </div>
                  )}

                  {registrationError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{registrationError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void handleRegister()}
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {isRegistering ? "Registering..." : "Register x25519 key"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openLinkWallet}
                    >
                      Use a different wallet
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      You'll be prompted to sign the Umbra consent message and
                      one on-chain transaction.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {gateState.canShowDecryptForm && (
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Decrypt invoice</CardTitle>
            <CardDescription>
              The merchant sent you a grant link or token. Paste the transaction
              signature you want to verify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="grant-json">Grant token (JSON)</Label>
                <Textarea
                  id="grant-json"
                  value={grantJson}
                  onChange={(event) => {
                    setGrantJson(event.target.value);
                    setError(null);
                  }}
                  rows={8}
                  placeholder='{"v":1,"grantId":"...","granterAddress":"...","auditorAddress":"..."}'
                  className="font-mono text-xs"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-signature">Transaction signature</Label>
                <Input
                  id="tx-signature"
                  value={txSignature}
                  onChange={(event) => {
                    setTxSignature(event.target.value);
                    setError(null);
                  }}
                  placeholder="Solana transaction signature (base58)"
                  className="font-mono text-xs"
                  disabled={isLoading}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {error && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                    error.code === "grant_revoked"
                      ? "border-[var(--status-overdue)]/30 bg-[var(--status-overdue-bg)] text-[var(--status-overdue)]"
                      : "border-destructive/20 bg-[var(--status-overdue-bg)] text-destructive",
                  )}
                >
                  {error.code === "grant_revoked" ? (
                    <ShieldOff className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{error.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    grantJson.trim().length === 0 ||
                    txSignature.trim().length === 0
                  }
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Decrypt invoice
                </Button>
                {evidence && (
                  <Button type="button" variant="ghost" onClick={reset}>
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        {evidence && <EvidenceView evidence={evidence} />}

        <footer className="mt-4 flex items-center justify-between border-t border-card-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3" />
            Records loaded from DueVault on demand. The merchant retains
            full custody.
          </span>
          <Link href="/" className="underline-offset-4 hover:underline">
            duevault.xyz
          </Link>
        </footer>
      </div>
    </main>
  );
}
