"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Wallet,
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
import {
  createMerchantWalletMasterSeedStorage,
  loadMerchantPrivateBalance,
  withdrawMerchantPrivateBalance,
} from "@/features/wallet/merchant-wallet-actions";
import {
  getMerchantBalanceView,
  validateMerchantWithdrawAmount,
  type MerchantBalanceView,
} from "@/features/wallet/merchant-balance";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import { getUmbraCheckoutMint } from "@/lib/umbra/config";
import { cn } from "@/lib/utils";

type WithdrawResult = Awaited<ReturnType<typeof withdrawMerchantPrivateBalance>>;

function truncateSignature(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function getBalanceToneClass(state: MerchantBalanceView["state"]) {
  if (state === "available") {
    return "border-[var(--status-claimed)]/25 bg-[var(--status-claimed-bg)] text-[var(--status-claimed)]";
  }

  if (state === "unavailable") {
    return "border-destructive/25 bg-[var(--status-overdue-bg)] text-destructive";
  }

  return "border-[var(--status-draft)]/25 bg-[var(--status-draft-bg)] text-muted-foreground";
}

function SignatureRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs text-foreground">
          {truncateSignature(value)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={`Copy ${label} signature`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success("Signature copied.");
        }}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

export function MerchantWalletCard() {
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const { wallet: merchantWallet, signTransaction, signMessage } =
    usePrivyUmbraSigner(profile.walletAddress);
  const mint = useMemo(() => getUmbraCheckoutMint(), []);
  const masterSeedStorage = useMemo(
    () => createMerchantWalletMasterSeedStorage(),
    [],
  );
  const [balanceView, setBalanceView] = useState<MerchantBalanceView | null>(
    null,
  );
  const [balanceError, setBalanceError] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult | null>(
    null,
  );
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const hasReadyUmbraProfile = profile.umbraStatus === "ready";
  const canUseWalletActions =
    standardWallets.ready && Boolean(merchantWallet) && hasReadyUmbraProfile;
  const canWithdraw =
    canUseWalletActions &&
    Boolean(balanceView?.canWithdraw) &&
    !isLoadingBalance &&
    !isWithdrawing;

  async function refreshBalance({ silent = false }: { silent?: boolean } = {}) {
    setBalanceError("");
    setIsLoadingBalance(true);

    if (!merchantWallet) {
      const message = "Connect the Solana wallet attached to this merchant profile.";
      setBalanceError(message);
      setIsLoadingBalance(false);
      if (!silent) toast.error(message);
      return;
    }

    try {
      const balance = await loadMerchantPrivateBalance({
        wallet: merchantWallet,
        signTransaction,
        signMessage,
        mint,
        masterSeedStorage,
      });
      setBalanceView(getMerchantBalanceView(balance, mint.decimals, mint.symbol));
      if (!silent) toast.success("Merchant balance refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load merchant balance.";
      setBalanceError(message);
      if (!silent) toast.error(message);
    } finally {
      setIsLoadingBalance(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawError("");

    if (!merchantWallet) {
      const message = "Connect the Solana wallet attached to this merchant profile.";
      setWithdrawError(message);
      toast.error(message);
      return;
    }

    if (!balanceView) {
      const message = "Load the merchant balance before withdrawing.";
      setWithdrawError(message);
      toast.error(message);
      return;
    }

    const validation = validateMerchantWithdrawAmount(
      withdrawAmount,
      balanceView.atomicAmount,
      mint.decimals,
    );

    if (!validation.ok) {
      setWithdrawError(validation.error);
      toast.error(validation.error);
      return;
    }

    setIsWithdrawing(true);

    try {
      const result = await withdrawMerchantPrivateBalance({
        wallet: merchantWallet,
        signTransaction,
        signMessage,
        mint,
        masterSeedStorage,
        atomicAmount: validation.atomicAmount,
      });

      setWithdrawResult(result);
      setWithdrawAmount("");
      toast.success("Withdrawal queued to public wallet balance.");
      await refreshBalance({ silent: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to withdraw balance.";
      setWithdrawError(message);
      toast.error(message);
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <Card className="border-card-border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-serif text-xl">Wallet</CardTitle>
            {balanceView && (
              <Badge
                variant="outline"
                className={cn("border", getBalanceToneClass(balanceView.state))}
              >
                {balanceView.label}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-2">
            Private merchant balance and withdrawals for {mint.symbol}.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit bg-card"
          disabled={!canUseWalletActions || isLoadingBalance || isWithdrawing}
          onClick={() => void refreshBalance()}
        >
          {isLoadingBalance ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {balanceView ? "Refresh balance" : "Load balance"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Merchant balance</p>
                <p className="mt-2 font-serif text-3xl font-medium text-foreground">
                  {balanceView?.displayAmount ?? `-- ${mint.symbol}`}
                </p>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wallet className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {balanceView?.description ??
                "Load balance to read the merchant encrypted balance from Umbra."}
            </p>
          </div>

          {!hasReadyUmbraProfile && (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--status-pending)]/25 bg-[var(--status-pending-bg)] p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-foreground">
                Complete Umbra setup before loading balance or withdrawing funds.
              </p>
              <Button asChild size="sm" variant="outline" className="w-fit bg-card">
                <Link href="/settings">
                  Open settings <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}

          {balanceError && (
            <p className="rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
              {balanceError}
            </p>
          )}

          {withdrawResult && (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--status-claimed)]/25 bg-[var(--status-claimed-bg)]/50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--status-claimed)]" />
                <div>
                  <p className="font-medium text-foreground">
                    Withdrawal submitted
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Funds are moving from the private merchant balance to the
                    public wallet balance.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <SignatureRow
                  label="Queue"
                  value={String(withdrawResult.queueSignature)}
                />
                <SignatureRow
                  label="Callback"
                  value={
                    withdrawResult.callbackSignature
                      ? String(withdrawResult.callbackSignature)
                      : undefined
                  }
                />
                <SignatureRow
                  label="Rent claim"
                  value={
                    withdrawResult.rentClaimSignature
                      ? String(withdrawResult.rentClaimSignature)
                      : undefined
                  }
                />
              </div>
              {withdrawResult.rentClaimError && (
                <p className="text-xs text-muted-foreground">
                  Rent claim note: {withdrawResult.rentClaimError}
                </p>
              )}
            </div>
          )}
        </div>

        <form
          className="flex flex-col gap-4 rounded-lg border border-border bg-background/40 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleWithdraw();
          }}
        >
          <div>
            <h3 className="font-serif text-lg font-medium">Withdraw</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send private {mint.symbol} into the merchant public wallet balance.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="merchant-wallet-withdraw-amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="merchant-wallet-withdraw-amount"
                inputMode="decimal"
                placeholder={`0.00 ${mint.symbol}`}
                value={withdrawAmount}
                onChange={(event) => {
                  setWithdrawAmount(event.target.value);
                  setWithdrawError("");
                }}
                disabled={!canWithdraw}
              />
              <Button
                type="button"
                variant="outline"
                className="bg-card"
                disabled={!canWithdraw || !balanceView}
                onClick={() => {
                  if (!balanceView) return;
                  setWithdrawAmount(
                    balanceView.displayAmount.replace(` ${mint.symbol}`, ""),
                  );
                  setWithdrawError("");
                }}
              >
                Max
              </Button>
            </div>
          </div>

          {withdrawError && (
            <p className="rounded-md border border-destructive/20 bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-destructive">
              {withdrawError}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canWithdraw || withdrawAmount.trim().length === 0}
          >
            {isWithdrawing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
            Withdraw to public balance
          </Button>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Withdrawals use the merchant profile wallet as the public destination.
            The wallet may ask for approval before the Umbra transaction is queued.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
