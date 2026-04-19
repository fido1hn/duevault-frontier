import type {
  LinkedAccountWithMetadata,
  User,
  WalletListEntry,
} from "@privy-io/react-auth";

export const SOLANA_WALLET_LIST = [
  "phantom",
  "solflare",
  "backpack",
  "detected_solana_wallets",
] satisfies WalletListEntry[];

export type ClientSolanaWallet = {
  address: string;
  connectorType?: string;
  walletClientType?: string;
};

type SolanaWalletAccount = LinkedAccountWithMetadata & {
  type: "wallet";
  address: string;
  chainType: "solana";
  connectorType?: string;
  walletClientType?: string;
};

function isSolanaWallet(
  account: LinkedAccountWithMetadata,
): account is SolanaWalletAccount {
  return (
    account.type === "wallet" &&
    "chainType" in account &&
    account.chainType === "solana"
  );
}

export function getLinkedSolanaWallets(
  user: User | null | undefined,
): ClientSolanaWallet[] {
  return (
    user?.linkedAccounts
      .filter(isSolanaWallet)
      .map((wallet) => ({
        address: wallet.address,
        connectorType: wallet.connectorType,
        walletClientType: wallet.walletClientType,
      })) ?? []
  );
}
