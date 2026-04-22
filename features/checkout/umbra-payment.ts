"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import { address } from "@solana/kit";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import type { MasterSeed, U128 } from "@umbra-privacy/sdk/types";
import {
  findActiveStealthPoolPda,
  findProtocolConfigPda,
  findProtocolFeeVaultPda,
  findTokenPoolPda,
  findVerifyingKeyPda,
} from "@umbra-privacy/sdk/utils";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  createDueVaultClient,
  createPrivatePayment,
  type DueVaultConfig,
  isUmbraUserFullyRegistered,
  queryDueVaultUserRegistration,
  registerDueVaultUser,
} from "@/lib/umbra/sdk";

export type CustomerUmbraPaymentStepId =
  | "wallet"
  | "checking"
  | "preflight"
  | "customer_account"
  | "customer_encryption"
  | "customer_anonymous"
  | "customer_verifying"
  | "payment_preflight"
  | "master_seed"
  | "proof_generation"
  | "create_utxo"
  | "saving"
  | "complete"
  | "error";

export type CustomerUmbraPaymentResult = {
  payerWalletAddress: string;
  network: string;
  mint: string;
  amountAtomic: string;
  merchantUmbraWalletAddress: string;
  optionalData: string;
  closeProofAccountSignature?: string;
  createProofAccountSignature: string;
  createUtxoSignature: string;
};

type RunCustomerUmbraPaymentInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  merchantUmbraWalletAddress: string;
  mintAddress: string;
  mintDisplayName: string;
  mintDecimals: number;
  amountAtomic: string;
  optionalData: string;
  onStep?: (step: CustomerUmbraPaymentStepId) => void;
};

const PUBLIC_UTXO_PROOF_ACCOUNT_SIZE = 563;
const CUSTOMER_SOL_FEE_BUFFER_LAMPORTS = 50_000_000;
const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const TOKEN_2022_PROGRAM_ADDRESS =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
const CREATE_DEPOSIT_FROM_PUBLIC_BALANCE_INSTRUCTION_SEED_BYTES = [
  94, 35, 209, 185, 160, 81, 246, 69, 49, 174, 241, 12, 73, 248, 43, 89,
] as const;

function u128FromLittleEndian(bytes: readonly number[]) {
  return bytes.reduce(
    (value, byte, index) => value | (BigInt(byte) << BigInt(index * 8)),
    0n,
  ) as U128;
}

const CREATE_DEPOSIT_FROM_PUBLIC_BALANCE_INSTRUCTION_SEED =
  u128FromLittleEndian(
    CREATE_DEPOSIT_FROM_PUBLIC_BALANCE_INSTRUCTION_SEED_BYTES,
  );

function createClickScopedMasterSeedStorage(): NonNullable<
  DueVaultConfig["masterSeedStorage"]
> {
  let cachedSeed: MasterSeed | null = null;

  return {
    load: async () =>
      cachedSeed
        ? {
            exists: true as const,
            seed: cachedSeed,
          }
        : {
            exists: false as const,
          },
    store: async (seed) => {
      cachedSeed = seed;

      return {
        success: true as const,
      };
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
}

function getNestedCause(error: unknown) {
  if (!isRecord(error) || !("cause" in error)) {
    return null;
  }

  return error.cause;
}

function getUmbraErrorStage(
  error: unknown,
  visited = new Set<unknown>(),
): string | null {
  if (!isRecord(error) || visited.has(error)) {
    return null;
  }

  visited.add(error);
  const stage = error.stage;

  if (typeof stage === "string" && stage.length > 0) {
    return stage;
  }

  return getUmbraErrorStage(getNestedCause(error), visited);
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function collectSimulationLogs(
  error: unknown,
  visited = new Set<unknown>(),
): string[] {
  if (!isRecord(error) || visited.has(error)) {
    return [];
  }

  visited.add(error);

  return [
    ...readStringArray(error.simulationLogs),
    ...readStringArray(error.logs),
    ...collectSimulationLogs(getNestedCause(error), visited),
  ];
}

function collectCauseMessages(
  error: unknown,
  visited = new Set<unknown>(),
): string[] {
  if (!isRecord(error) || visited.has(error)) {
    return [];
  }

  visited.add(error);

  return [
    getErrorMessage(error),
    ...collectCauseMessages(getNestedCause(error), visited),
  ];
}

function describeUmbraFailure(action: string, error: unknown) {
  const message = getErrorMessage(error);
  const stage = getUmbraErrorStage(error);
  const causeDetails = collectCauseMessages(getNestedCause(error)).filter(
    (detail) => detail !== message,
  );
  const simulationLogs = collectSimulationLogs(error);
  const detailSuffix =
    causeDetails.length > 0
      ? ` Details: ${causeDetails.slice(0, 2).join(" | ")}`
      : "";
  const simulationSuffix =
    simulationLogs.length > 0
      ? ` Simulation logs: ${simulationLogs.slice(-8).join(" | ")}`
      : "";

  if (message === "Failed to fetch" || message === "fetch failed") {
    return `${action} failed because an Umbra network request could not be reached. Retry in a moment; if it persists, check the configured RPC and Umbra ZK asset proxy.`;
  }

  return `${action} failed${
    stage ? ` during ${stage}` : ""
  }: ${message}${detailSuffix}${simulationSuffix}`;
}

async function ensureCustomerUmbraRegistration({
  config,
  onStep,
  walletAddress,
}: {
  config: Parameters<typeof queryDueVaultUserRegistration>[0];
  onStep?: (step: CustomerUmbraPaymentStepId) => void;
  walletAddress: string;
}) {
  onStep?.("customer_account");

  try {
    const currentAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (isUmbraUserFullyRegistered(currentAccount)) {
      onStep?.("customer_verifying");
      return;
    }
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer Umbra setup check", error));
  }

  try {
    await registerDueVaultUser(config, {
      callbacks: {
        userAccountInitialisation: {
          pre: async () => {
            onStep?.("customer_account");
          },
          post: async () => {
            onStep?.("customer_encryption");
          },
        },
        registerX25519PublicKey: {
          pre: async () => {
            onStep?.("customer_encryption");
          },
          post: async () => {
            onStep?.("customer_anonymous");
          },
        },
        registerUserForAnonymousUsage: {
          pre: async () => {
            onStep?.("customer_anonymous");
          },
          post: async () => {
            onStep?.("customer_verifying");
          },
        },
      },
    });
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer Umbra setup", error));
  }

  onStep?.("customer_verifying");

  try {
    const verifiedAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (!isUmbraUserFullyRegistered(verifiedAccount)) {
      throw new Error("Customer Umbra setup did not reach a ready state.");
    }
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Customer Umbra setup verification", error),
    );
  }
}

function optionalDataFromHex(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error("Umbra invoice reference must be a 32-byte hex string.");
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function formatSol(lamports: number) {
  return (lamports / LAMPORTS_PER_SOL).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatAtomicToken(value: bigint, decimals: number) {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fractional = value % divisor;

  if (fractional === 0n) {
    return whole.toString();
  }

  return `${whole}.${fractional
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "")}`;
}

function deriveAssociatedTokenAddress({
  mint,
  owner,
  tokenProgram,
}: {
  mint: PublicKey;
  owner: PublicKey;
  tokenProgram: PublicKey;
}) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

async function getAssociatedTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  mintDisplayName: string,
  network: string,
) {
  const mintInfo = await connection.getAccountInfo(mint, "confirmed");

  if (!mintInfo) {
    throw new Error(
      `Checkout mint account ${mint.toBase58()} does not exist on ${network}.`,
    );
  }

  if (
    !mintInfo.owner.equals(SPL_TOKEN_PROGRAM_ID) &&
    mintInfo.owner.toBase58() !== TOKEN_2022_PROGRAM_ADDRESS
  ) {
    throw new Error(
      `Checkout mint ${mint.toBase58()} is not owned by a supported SPL token program.`,
    );
  }

  const associatedTokenAddress = deriveAssociatedTokenAddress({
    mint,
    owner,
    tokenProgram: mintInfo.owner,
  });
  const account = await connection.getParsedAccountInfo(
    associatedTokenAddress,
    "confirmed",
  );

  if (!account.value) {
    throw new Error(
      `Customer wallet does not have the associated token account Umbra spends from (${associatedTokenAddress.toBase58()}). Fund that account with ${mintDisplayName} and retry.`,
    );
  }

  const data = account.value.data;

  if (!isRecord(data) || !isRecord(data.parsed)) {
    throw new Error(
      `Customer associated token account ${associatedTokenAddress.toBase58()} could not be parsed.`,
    );
  }

  const info = data.parsed.info;

  if (!isRecord(info) || !isRecord(info.tokenAmount)) {
    throw new Error(
      `Customer associated token account ${associatedTokenAddress.toBase58()} is not an initialized token account.`,
    );
  }

  const amount = info.tokenAmount.amount;

  if (typeof amount !== "string") {
    throw new Error(
      `Customer associated token account ${associatedTokenAddress.toBase58()} has an unreadable token balance.`,
    );
  }

  return {
    amount: BigInt(amount),
    associatedTokenAddress: associatedTokenAddress.toBase58(),
    tokenProgram: mintInfo.owner,
  };
}

async function assertUmbraPoolReadiness({
  config,
  connection,
  mint,
  tokenProgram,
}: {
  config: DueVaultConfig;
  connection: Connection;
  mint: PublicKey;
  tokenProgram: PublicKey;
}) {
  const client = await createDueVaultClient(config);
  const programId = client.networkConfig.programId;
  const mintAddress = address(mint.toBase58());
  const [feeVault, protocolConfig, stealthPool, tokenPool, verifyingKey] =
    await Promise.all([
      findProtocolFeeVaultPda(
        CREATE_DEPOSIT_FROM_PUBLIC_BALANCE_INSTRUCTION_SEED,
        mintAddress,
        0n as U128,
        programId,
      ).then(([pda]) => pda),
      findProtocolConfigPda(programId),
      findActiveStealthPoolPda(programId),
      findTokenPoolPda(mintAddress, programId),
      findVerifyingKeyPda(
        CREATE_DEPOSIT_FROM_PUBLIC_BALANCE_INSTRUCTION_SEED,
        programId,
      ),
    ]);
  const tokenPoolSplAta = deriveAssociatedTokenAddress({
    mint,
    owner: new PublicKey(tokenPool),
    tokenProgram,
  }).toBase58();
  const requiredAccounts = [
    { label: "fee vault", address: feeVault },
    { label: "protocol config", address: protocolConfig },
    { label: "stealth pool", address: stealthPool },
    { label: "token pool", address: tokenPool },
    { label: "token pool ATA", address: tokenPoolSplAta },
    { label: "ZK verifying key", address: verifyingKey },
  ];
  const accountInfos = await connection.getMultipleAccountsInfo(
    requiredAccounts.map((account) => new PublicKey(account.address)),
    "confirmed",
  );
  const missingAccounts = requiredAccounts.filter(
    (_account, index) => accountInfos[index] === null,
  );

  if (missingAccounts.length > 0) {
    throw new Error(
      `Umbra ${config.network} is not initialized for mint ${mint.toBase58()}; missing ${missingAccounts
        .map((account) => `${account.label} ${account.address}`)
        .join(", ")}.`,
    );
  }
}

async function assertCustomerPaymentReadiness({
  amountAtomic,
  config,
  mintAddress,
  mintDecimals,
  mintDisplayName,
  payerWalletAddress,
  rpcUrl,
}: {
  amountAtomic: string;
  config: DueVaultConfig;
  mintAddress: string;
  mintDecimals: number;
  mintDisplayName: string;
  payerWalletAddress: string;
  rpcUrl: string;
}) {
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = new PublicKey(payerWalletAddress);
  const mint = new PublicKey(mintAddress);
  const [payerLamports, proofAccountRentLamports, tokenBalance] =
    await Promise.all([
      connection.getBalance(payer, "confirmed"),
      connection.getMinimumBalanceForRentExemption(
        PUBLIC_UTXO_PROOF_ACCOUNT_SIZE,
      ),
      getAssociatedTokenBalance(
        connection,
        payer,
        mint,
        mintDisplayName,
        config.network,
      ),
    ]);
  const requiredLamports =
    proofAccountRentLamports + CUSTOMER_SOL_FEE_BUFFER_LAMPORTS;
  const requiredAmount = BigInt(amountAtomic);

  if (payerLamports < requiredLamports) {
    throw new Error(
      `Customer wallet needs at least ${formatSol(
        requiredLamports,
      )} ${config.network} SOL for Umbra setup, proof account rent, and transaction fees. Current balance is ${formatSol(
        payerLamports,
      )} SOL.`,
    );
  }

  if (tokenBalance.amount < requiredAmount) {
    throw new Error(
      `Customer wallet needs ${formatAtomicToken(
        requiredAmount,
        mintDecimals,
      )} ${mintDisplayName} in the associated token account Umbra spends from (${
        tokenBalance.associatedTokenAddress
      }). Current balance there is ${formatAtomicToken(
        tokenBalance.amount,
        mintDecimals,
      )} ${mintDisplayName}.`,
    );
  }

  await assertUmbraPoolReadiness({
    config,
    connection,
    mint,
    tokenProgram: tokenBalance.tokenProgram,
  });
}

export async function runCustomerUmbraPayment({
  amountAtomic,
  merchantUmbraWalletAddress,
  mintAddress,
  mintDecimals,
  mintDisplayName,
  optionalData,
  onStep,
  signMessage,
  signTransaction,
  wallet,
}: RunCustomerUmbraPaymentInput): Promise<CustomerUmbraPaymentResult> {
  onStep?.("wallet");
  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createPrivyUmbraSigner({
    network: runtimeConfig.network,
    signMessage,
    signTransaction,
    wallet,
  });
  const config = {
    ...runtimeConfig,
    signer,
    masterSeedStorage: createClickScopedMasterSeedStorage(),
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
  };

  onStep?.("checking");

  try {
    const merchantAccount = await queryDueVaultUserRegistration(
      config,
      merchantUmbraWalletAddress,
    );

    if (!isUmbraUserFullyRegistered(merchantAccount)) {
      throw new Error("Merchant Umbra account is not fully registered.");
    }
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Merchant Umbra readiness check", error),
    );
  }

  onStep?.("preflight");

  try {
    await assertCustomerPaymentReadiness({
      amountAtomic,
      config,
      mintAddress,
      mintDecimals,
      mintDisplayName,
      payerWalletAddress: wallet.address,
      rpcUrl: runtimeConfig.rpcUrl,
    });
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer balance check", error));
  }

  await ensureCustomerUmbraRegistration({
    config,
    onStep,
    walletAddress: wallet.address,
  });

  onStep?.("payment_preflight");

  try {
    await assertCustomerPaymentReadiness({
      amountAtomic,
      config,
      mintAddress,
      mintDecimals,
      mintDisplayName,
      payerWalletAddress: wallet.address,
      rpcUrl: runtimeConfig.rpcUrl,
    });
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Customer payment balance check", error),
    );
  }

  onStep?.("master_seed");
  const invoiceReference = optionalDataFromHex(optionalData);

  try {
    onStep?.("proof_generation");
    const signatures = await createPrivatePayment(config, {
      destinationAddress: merchantUmbraWalletAddress,
      mint: mintAddress,
      amount: BigInt(amountAtomic),
      optionalData: invoiceReference,
      callbacks: {
        createUtxo: {
          pre: async () => {
            onStep?.("create_utxo");
          },
          post: async () => {
            onStep?.("saving");
          },
        },
      },
    });

    return {
      payerWalletAddress: wallet.address,
      network: runtimeConfig.network,
      mint: mintAddress,
      amountAtomic,
      merchantUmbraWalletAddress,
      optionalData,
      closeProofAccountSignature: signatures.closeProofAccountSignature
        ? String(signatures.closeProofAccountSignature)
        : undefined,
      createProofAccountSignature: String(
        signatures.createProofAccountSignature,
      ),
      createUtxoSignature: String(signatures.createUtxoSignature),
    };
  } catch (error) {
    const simulationLogs = collectSimulationLogs(error);
    console.error("[Umbra customer payment] failed", {
      error,
      simulationLogs,
    });
    throw new Error(describeUmbraFailure("Umbra private payment", error));
  }
}
