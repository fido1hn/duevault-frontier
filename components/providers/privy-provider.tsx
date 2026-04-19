"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

import { SOLANA_WALLET_LIST } from "@/features/auth/privy-wallets";

type AppPrivyProviderProps = {
  children: React.ReactNode;
};

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function AppPrivyProvider({ children }: AppPrivyProviderProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-card-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold">
            Privy app ID missing
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add NEXT_PUBLIC_PRIVY_APP_ID to your environment to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          accentColor: "#113537",
          landingHeader: "Sign in to DueVault",
          showWalletLoginFirst: true,
          theme: "light",
          walletChainType: "solana-only",
          walletList: SOLANA_WALLET_LIST,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
