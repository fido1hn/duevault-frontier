"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLinkedSolanaWallets,
  SOLANA_WALLET_LIST,
} from "@/features/auth/privy-wallets";
import {
  runAuditorUmbraRegistration,
  type AuditorUmbraRegistrationStepId,
} from "@/features/audit/auditor-registration";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import {
  isAuditorX25519Registered,
  queryDueVaultUserRegistration,
} from "@/lib/umbra/sdk";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { truncateMiddle } from "@/lib/utils";

type RegistrationStatus = "unknown" | "registered" | "unregistered";

const STEP_LABEL: Record<AuditorUmbraRegistrationStepId, string> = {
  checking: "Checking on-chain account",
  account: "Initializing Umbra account",
  encryption: "Registering x25519 key",
  verifying: "Verifying registration",
  complete: "Registration complete",
  error: "Registration failed",
};

export function AuditorSetupCard() {
  const { ready: privyReady, authenticated, user, login, linkWallet } = usePrivy();
  const linkedSolanaWallets = useMemo(
    () => getLinkedSolanaWallets(user),
    [user],
  );
  const walletAddress = linkedSolanaWallets[0]?.address ?? null;
  const { wallet, walletsReady, signTransaction, signMessage } =
    usePrivyUmbraSigner(walletAddress);

  const [status, setStatus] = useState<RegistrationStatus>("unknown");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [step, setStep] = useState<AuditorUmbraRegistrationStepId | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );

  const refreshStatus = useCallback(async () => {
    if (!wallet) return;
    setIsCheckingStatus(true);
    setStatusError(null);
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
      setStatus(
        isAuditorX25519Registered(account) ? "registered" : "unregistered",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to check Umbra registration status.";
      setStatusError(message);
      setStatus("unknown");
    } finally {
      setIsCheckingStatus(false);
    }
  }, [signMessage, signTransaction, wallet]);

  useEffect(() => {
    if (!walletAddress || !walletsReady || !wallet) {
      setStatus("unknown");
      return;
    }
    void refreshStatus();
  }, [walletAddress, walletsReady, wallet, refreshStatus]);

  async function handleRegister() {
    if (!wallet) {
      toast.error("Connect your Solana wallet first.");
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);
    setStep("checking");

    try {
      const result = await runAuditorUmbraRegistration({
        wallet,
        signTransaction,
        signMessage,
        onStep: setStep,
      });
      setStatus("registered");
      toast.success(
        result.alreadyRegistered
          ? "Your Umbra x25519 key was already registered."
          : "Umbra x25519 key registered.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to register your Umbra x25519 key.";
      setRegistrationError(message);
      setStep("error");
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  }

  async function copyAddress() {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    toast.success("Auditor address copied.");
  }

  if (!privyReady) {
    return (
      <SetupShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title="Loading auditor setup"
        body="Preparing your wallet session."
      />
    );
  }

  if (!authenticated) {
    return (
      <SetupShell
        icon={<KeyRound className="size-5" />}
        title="Sign in to set up your auditor key"
        body="Auditors register a one-time Umbra x25519 key on-chain. Sign in with Privy to connect your wallet and register."
        action={
          <Button onClick={() => login()} className="w-full md:w-auto">
            Sign in with Privy
          </Button>
        }
      />
    );
  }

  if (!walletAddress) {
    return (
      <SetupShell
        icon={<Wallet className="size-5" />}
        title="Connect a Solana wallet"
        body="Connect the Solana wallet you want merchants to grant audit access to. This wallet will hold your Umbra x25519 keypair on-chain."
        action={
          <Button
            onClick={() =>
              linkWallet({
                walletChainType: "solana-only",
                walletList: SOLANA_WALLET_LIST,
              })
            }
            className="w-full md:w-auto"
          >
            Connect Solana wallet
          </Button>
        }
      />
    );
  }

  if (!walletsReady || isCheckingStatus || status === "unknown") {
    return (
      <SetupShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title="Checking your Umbra registration"
        body={
          statusError ??
          `Looking up the on-chain Umbra account for ${truncateMiddle(walletAddress)}.`
        }
        action={
          statusError ? (
            <Button
              variant="outline"
              onClick={() => void refreshStatus()}
            >
              Try again
            </Button>
          ) : null
        }
      />
    );
  }

  if (status === "registered") {
    return (
      <Card className="border-[var(--status-claimed)]/25 bg-[var(--status-claimed-bg)]/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--status-claimed)]/15 text-[var(--status-claimed)]">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="font-serif text-lg">
                You're set up to receive audit grants
              </CardTitle>
              <CardDescription>
                Share this wallet address with the merchant. They can issue an
                audit grant to it on their compliance page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md border border-card-border bg-card px-3 py-2 font-mono text-xs text-foreground">
              {walletAddress}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyAddress()}
            >
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Once the merchant issues a grant, they'll send you a link that
            opens the audit form below pre-filled.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
              Wallet {truncateMiddle(walletAddress)} doesn't have an Umbra key
              registered yet. This is a one-time on-chain setup needed before a
              merchant can grant you audit access.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step && step !== "error" && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {STEP_LABEL[step]}
          </div>
        )}

        {registrationError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <span>{registrationError}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={() => void handleRegister()} disabled={isRegistering}>
            {isRegistering ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {isRegistering ? "Registering..." : "Register x25519 key"}
          </Button>
          <p className="text-xs text-muted-foreground">
            You'll be prompted to sign the Umbra consent message and one
            on-chain transaction.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SetupShell({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
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
      {action && (
        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {action}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
