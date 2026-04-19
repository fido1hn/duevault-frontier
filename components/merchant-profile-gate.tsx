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
import { useWallet } from "@solana/wallet-adapter-react";
import { Building2, Loader2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMerchantProfileByWalletClient } from "@/features/merchant-profiles/client";
import { useWalletConnectionRequest } from "@/hooks/use-wallet-connection-request";
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

function buildOnboardingPath(nextPath: string) {
  return `/onboarding?next=${encodeURIComponent(nextPath)}`;
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
  const { publicKey } = useWallet();
  const { isConnectingWallet, requestWalletConnection } =
    useWalletConnectionRequest();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [profile, setProfile] = useState<SerializedMerchantProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const walletAddress = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!publicKey) {
      setProfile(null);
      setStatus("idle");
      setError("");
      return;
    }

    let isCancelled = false;
    const walletAddress = publicKey.toBase58();

    async function loadProfile() {
      setStatus("loading");
      setError("");

      try {
        const loadedProfile =
          await getMerchantProfileByWalletClient(walletAddress);

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
  }, [pathname, publicKey, queryString, reloadKey, router]);

  const contextValue = useMemo(() => {
    if (!profile) return null;

    return {
      profile,
      refreshProfile: () => setReloadKey((key) => key + 1),
    };
  }, [profile]);

  if (!publicKey) {
    return (
      <GateShell
        icon={<Wallet className="size-5" />}
        title="Connect wallet to continue"
        body="DueVault uses your connected Solana wallet as your local merchant identity for this prototype."
        action={
          <Button
            disabled={isConnectingWallet}
            onClick={requestWalletConnection}
          >
            {isConnectingWallet && <Loader2 className="size-4 animate-spin" />}
            Connect Wallet
          </Button>
        }
      />
    );
  }

  if (
    status === "idle" ||
    status === "loading" ||
    status === "missing" ||
    profile?.walletAddress !== walletAddress
  ) {
    return (
      <GateShell
        icon={<Loader2 className="size-5 animate-spin" />}
        title={status === "missing" ? "Opening onboarding" : "Loading workspace"}
        body={
          status === "missing"
            ? "We could not find a company profile for this wallet, so we are taking you to setup."
            : "Checking this wallet for an existing DueVault merchant profile."
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
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!contextValue) {
    return null;
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
    throw new Error("useMerchantProfile must be used inside MerchantProfileProvider.");
  }

  return value;
}
