"use client";

import { useMemo } from "react";
import {
  WalletAdapterNetwork,
  type Adapter,
  type WalletError,
} from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { toast } from "sonner";

type WalletProviderProps = {
  children: React.ReactNode;
};

function getCluster() {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK;

  if (network === "mainnet-beta") {
    return WalletAdapterNetwork.Mainnet;
  }

  if (network === "testnet") {
    return WalletAdapterNetwork.Testnet;
  }

  return WalletAdapterNetwork.Devnet;
}

function handleWalletError(error: WalletError, adapter?: Adapter) {
  console.error("Wallet connection failed", error, adapter);

  const walletName = adapter?.name ?? "wallet";
  const description =
    error.name === "WalletNotReadyError"
      ? `${walletName} is not available in this browser. Install or unlock it, then try again.`
      : `Please approve the request in ${walletName} and try again.`;

  toast.error("Wallet connection failed", {
    description,
  });
}

export function AppWalletProvider({ children }: WalletProviderProps) {
  const cluster = getCluster();
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(cluster);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        autoConnect={false}
        onError={handleWalletError}
        wallets={wallets}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
