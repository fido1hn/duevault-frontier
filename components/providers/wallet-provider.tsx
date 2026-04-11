"use client";

import { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
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
      <WalletProvider autoConnect={false} wallets={wallets}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
