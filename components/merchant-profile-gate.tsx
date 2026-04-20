"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Building2, Loader2, LogIn, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getLinkedSolanaWallets,
  SOLANA_WALLET_LIST,
} from "@/features/auth/privy-wallets";
import { buildOnboardingPath } from "@/features/auth/routing";
import { useMerchantProfileQuery } from "@/features/merchant-profiles/queries";
import type { SerializedMerchantProfile } from "@/features/merchant-profiles/types";

type MerchantProfileContextValue = {
  profile: SerializedMerchantProfile;
  refreshProfile: () => void;
};

const MerchantProfileContext =
  createContext<MerchantProfileContextValue | null>(null);

function buildSafeCurrentPath(pathname: string, queryString: string) {
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function GateShell({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-8 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h1 className="mt-6 font-serif text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

export function MerchantProfileProvider({ children }: { children: ReactNode }) {
  const { authenticated, linkWallet, login, ready, user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const profileQuery = useMerchantProfileQuery({
    enabled: ready && authenticated,
  });
  const profile = profileQuery.data ?? null;
  const solanaWallets = useMemo(() => getLinkedSolanaWallets(user), [user]);
  const isProfileWalletLinked = profile
    ? solanaWallets.some((wallet) => wallet.address === profile.walletAddress)
    : false;

  useEffect(() => {
    if (!ready || !authenticated || !profileQuery.isSuccess || profile) {
      return;
    }

    router.replace(
      buildOnboardingPath(buildSafeCurrentPath(pathname, queryString)),
    );
  }, [
    authenticated,
    pathname,
    profile,
    profileQuery.isSuccess,
    queryString,
    ready,
    router,
  ]);

  const refreshProfile = useCallback(() => {
    void profileQuery.refetch();
  }, [profileQuery.refetch]);

  const contextValue = useMemo(() => {
    if (!profile) return null;

    return {
      profile,
      refreshProfile,
    };
  }, [profile, refreshProfile]);

  if (!ready) {
    return (
      <GateShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title="Loading sign-in"
        body="Preparing your DueVault workspace."
      />
    );
  }

  if (!authenticated) {
    return (
      <GateShell
        icon={<LogIn className="size-5" />}
        title="Sign in to continue"
        body="Use email or a Solana wallet to open your merchant workspace."
        action={
          <Button
            onClick={() =>
              login({
                loginMethods: ["wallet", "email"],
                walletChainType: "solana-only",
              })
            }
          >
            Sign in
          </Button>
        }
      />
    );
  }

  if (profileQuery.isPending || (profileQuery.isSuccess && !profile)) {
    return (
      <GateShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title={
          profileQuery.isSuccess && !profile
            ? "Opening onboarding"
            : "Loading workspace"
        }
        body={
          profileQuery.isSuccess && !profile
            ? "We could not find a company profile, so we are taking you to setup."
            : "Checking your Privy account for an existing merchant profile."
        }
      />
    );
  }

  if (profileQuery.isError) {
    return (
      <GateShell
        icon={<Building2 className="size-5" />}
        title="Workspace unavailable"
        body={
          profileQuery.error instanceof Error
            ? profileQuery.error.message
            : "Unable to load merchant profile."
        }
        action={
          <Button variant="outline" onClick={() => void profileQuery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!profile || !contextValue) {
    return null;
  }

  if (!isProfileWalletLinked) {
    return (
      <GateShell
        icon={<Wallet className="size-5" />}
        title="Connect your profile wallet"
        body="Connect the Solana wallet already linked to this workspace before opening the dashboard."
        action={
          <Button
            onClick={() =>
              linkWallet({
                walletChainType: "solana-only",
                walletList: SOLANA_WALLET_LIST,
              })
            }
          >
            Connect Solana Wallet
          </Button>
        }
      />
    );
  }

  return (
    <MerchantProfileContext.Provider value={contextValue}>
      {children}
    </MerchantProfileContext.Provider>
  );
}

export function useMerchantProfile() {
  const value = useContext(MerchantProfileContext);

  if (!value) {
    throw new Error(
      "useMerchantProfile must be used inside MerchantProfileProvider.",
    );
  }

  return value;
}
