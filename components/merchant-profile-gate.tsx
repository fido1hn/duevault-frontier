"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { getMerchantProfileClient } from "@/features/merchant-profiles/client";
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
  const { authenticated, getAccessToken, linkWallet, login, ready, user } =
    usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [profile, setProfile] = useState<SerializedMerchantProfile | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "missing" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const solanaWallets = useMemo(() => getLinkedSolanaWallets(user), [user]);
  const isProfileWalletLinked = profile
    ? solanaWallets.some((wallet) => wallet.address === profile.walletAddress)
    : false;

  useEffect(() => {
    if (!ready || !authenticated) {
      setProfile(null);
      setStatus("idle");
      setError("");
      return;
    }

    let isCancelled = false;

    async function loadProfile() {
      setStatus("loading");
      setError("");

      try {
        const loadedProfile = await getMerchantProfileClient(getAccessToken);

        if (isCancelled) return;

        if (loadedProfile) {
          setProfile(loadedProfile);
          setStatus("ready");
          return;
        }

        setProfile(null);
        setStatus("missing");
        router.replace(
          buildOnboardingPath(buildSafeCurrentPath(pathname, queryString)),
        );
      } catch (loadError) {
        if (!isCancelled) {
          setProfile(null);
          setStatus("error");
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load merchant profile.",
          );
        }
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [
    authenticated,
    getAccessToken,
    pathname,
    queryString,
    ready,
    reloadKey,
    router,
  ]);

  const contextValue = useMemo(() => {
    if (!profile) return null;

    return {
      profile,
      refreshProfile: () => setReloadKey((key) => key + 1),
    };
  }, [profile]);

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

  if (status === "idle" || status === "loading" || status === "missing") {
    return (
      <GateShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title={status === "missing" ? "Opening onboarding" : "Loading workspace"}
        body={
          status === "missing"
            ? "We could not find a company profile, so we are taking you to setup."
            : "Checking your Privy account for an existing merchant profile."
        }
      />
    );
  }

  if (status === "error") {
    return (
      <GateShell
        icon={<Building2 className="size-5" />}
        title="Workspace unavailable"
        body={error}
        action={
          <Button
            variant="outline"
            onClick={() => setReloadKey((key) => key + 1)}
          >
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
