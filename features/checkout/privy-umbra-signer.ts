"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import {
  address,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";
import type { IUmbraSigner } from "@umbra-privacy/sdk/interfaces";

import type { UmbraRuntimeConfig } from "@/lib/umbra/config";

type PrivySignTransaction = UseSignTransaction["signTransaction"];
type PrivySignMessage = UseSignMessage["signMessage"];
type PrivySignTransactionInput = Parameters<PrivySignTransaction>[0];
type PrivySolanaChain = NonNullable<PrivySignTransactionInput["chain"]>;

export type PrivyUmbraSigningInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: PrivySignTransaction;
  signMessage: PrivySignMessage;
  network: UmbraRuntimeConfig["network"];
};

function getPrivySolanaChain(network: UmbraRuntimeConfig["network"]) {
  if (network === "mainnet") {
    return "solana:mainnet" as PrivySolanaChain;
  }

  return "solana:devnet" as PrivySolanaChain;
}

function getFirstResult<T>(value: T | T[]) {
  return Array.isArray(value) ? value[0] : value;
}

function assertWalletSignedTransaction(
  transaction: Awaited<ReturnType<IUmbraSigner["signTransaction"]>>,
  walletAddress: string,
) {
  const signatures = transaction.signatures as Record<string, Uint8Array | undefined>;
  const walletSignature =
    signatures[address(walletAddress)] ?? signatures[walletAddress];

  if (
    !(walletSignature instanceof Uint8Array) ||
    walletSignature.length !== 64 ||
    !walletSignature.some((byte) => byte !== 0)
  ) {
    throw new Error(
      "Privy returned a signed transaction, but the selected wallet did not sign as payer.",
    );
  }
}

export function createPrivyUmbraSigner({
  network,
  signMessage,
  signTransaction,
  wallet,
}: PrivyUmbraSigningInput): IUmbraSigner {
  const signerAddress = address(wallet.address);
  const chain = getPrivySolanaChain(network);
  const transactionEncoder = getTransactionEncoder();
  const transactionDecoder = getTransactionDecoder();
  const signUmbraTransaction: IUmbraSigner["signTransaction"] = async (
    transaction,
  ) => {
    const output = getFirstResult(
      await signTransaction({
        chain,
        transaction: new Uint8Array(transactionEncoder.encode(transaction)),
        wallet,
      }),
    );

    if (!output?.signedTransaction) {
      throw new Error("Privy did not return a signed transaction.");
    }

    const decodedTransaction = transactionDecoder.decode(output.signedTransaction);
    const signedTransaction =
      decodedTransaction as Awaited<ReturnType<IUmbraSigner["signTransaction"]>>;
    assertWalletSignedTransaction(signedTransaction, wallet.address);

    return signedTransaction;
  };

  return {
    address: signerAddress,
    signTransaction: signUmbraTransaction,
    async signTransactions(transactions) {
      if (transactions.length === 0) return [];

      const signedTransactions: Awaited<
        ReturnType<IUmbraSigner["signTransactions"]>
      > = [];

      for (const transaction of transactions) {
        signedTransactions.push(await signUmbraTransaction(transaction));
      }

      return signedTransactions;
    },
    async signMessage(message) {
      const output = getFirstResult(
        await signMessage({
          message,
          wallet,
        }),
      );

      if (!output?.signature) {
        throw new Error("Privy did not return a signed message.");
      }

      return {
        message,
        signature: output.signature,
        signer: signerAddress,
      } as Awaited<ReturnType<IUmbraSigner["signMessage"]>>;
    },
  };
}
