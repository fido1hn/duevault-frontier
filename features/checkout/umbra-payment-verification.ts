import {
  PublicKey,
  type Connection,
  type MessageCompiledInstruction,
  type TokenBalance,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import {
  UMBRA_PROGRAM_ADDRESS,
  getCreatePublicStealthPoolDepositInputBufferDiscriminatorBytes,
  getCreatePublicStealthPoolDepositInputBufferInstructionDataDecoder,
  getDepositIntoStealthPoolFromPublicBalanceDiscriminatorBytes,
  getDepositIntoStealthPoolFromPublicBalanceEventV1Decoder,
  getDepositIntoStealthPoolFromPublicBalanceInstructionDataDecoder,
} from "@umbra-privacy/umbra-codama";

import { withTransientRetry } from "@/lib/umbra/retry";

export type ExpectedUmbraPaymentEvidence = {
  payerWalletAddress: string;
  mint: string;
  amountAtomic: string;
  optionalData: string;
};

export type VerifyUmbraPaymentEvidenceInput = {
  connection: Connection;
  createProofAccountSignature: string;
  createUtxoSignature: string;
  expected: ExpectedUmbraPaymentEvidence;
};

export type VerifiedUmbraPaymentEvidence = {
  payerWalletAddress: string;
  mint: string;
  amountAtomic: string;
  optionalData: string;
  proofAccountOffset: string;
  depositorAta: string;
  tokenPoolSplAta: string;
};

export type DecodedUmbraDepositEvent = {
  depositor: string;
  mint: string;
  transferAmountAtomic: string;
  optionalData: string;
  h1Hash?: string;
  h2Hash?: string;
  insertionIndexInTree?: string;
  treeIndex?: string;
};

type AccountKeyLookup = {
  get(index: number): PublicKey | undefined;
};

type DepositVerificationDeps = {
  decodeDepositEventsFromLogs?: (
    logMessages: readonly string[] | null | undefined,
  ) => DecodedUmbraDepositEvent[];
};

const DEPOSIT_ACCOUNT_INDEXES = {
  depositor: 1,
  depositorAta: 3,
  tokenPoolSplAta: 8,
  mint: 10,
} as const;

const PROOF_ACCOUNT_INDEXES = {
  depositor: 0,
} as const;

const UMBRA_EVENT_LOG_PREFIX = "Program data: ";

export class UmbraPaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UmbraPaymentVerificationError";
  }
}

function fail(message: string): never {
  throw new UmbraPaymentVerificationError(message);
}

function bytesEqual(left: ArrayLike<number>, right: ArrayLike<number>) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function bytesToHex(bytes: ArrayLike<number>) {
  return Buffer.from(Uint8Array.from(bytes)).toString("hex");
}

function parsePositiveBigInt(value: string, label: string) {
  try {
    const parsed = BigInt(value);

    if (parsed <= 0n) {
      throw new Error();
    }

    return parsed;
  } catch {
    fail(`${label} must be a positive integer string.`);
  }
}

function normalizePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    fail(`${label} must be a valid Solana address.`);
  }
}

function normalizeExpected(expected: ExpectedUmbraPaymentEvidence) {
  return {
    payerWalletAddress: normalizePublicKey(
      expected.payerWalletAddress,
      "Payer wallet address",
    ),
    mint: normalizePublicKey(expected.mint, "Payment mint"),
    amountAtomic: parsePositiveBigInt(expected.amountAtomic, "Payment amount"),
    optionalData: expected.optionalData.trim().toLowerCase(),
  };
}

function getAccountKeys(transaction: VersionedTransactionResponse): AccountKeyLookup {
  const message = transaction.transaction.message;

  if (message.version === 0) {
    return message.getAccountKeys({
      accountKeysFromLookups: transaction.meta?.loadedAddresses ?? null,
    });
  }

  return message.getAccountKeys();
}

function getAccountAddress(
  accountKeys: AccountKeyLookup,
  accountIndex: number,
  label: string,
) {
  const key = accountKeys.get(accountIndex);

  if (!key) {
    fail(`Umbra transaction is missing ${label}.`);
  }

  return key.toBase58();
}

function getInstructionAccounts(
  accountKeys: AccountKeyLookup,
  instruction: MessageCompiledInstruction,
) {
  return instruction.accountKeyIndexes.map((accountIndex, index) =>
    getAccountAddress(accountKeys, accountIndex, `instruction account ${index}`),
  );
}

function findSingleUmbraInstruction(
  transaction: VersionedTransactionResponse,
  discriminator: ArrayLike<number>,
  label: string,
) {
  const accountKeys = getAccountKeys(transaction);
  const matches = transaction.transaction.message.compiledInstructions.filter(
    (instruction) => {
      const programId = accountKeys.get(instruction.programIdIndex)?.toBase58();

      return (
        programId === UMBRA_PROGRAM_ADDRESS &&
        instruction.data.length >= discriminator.length &&
        bytesEqual(instruction.data.slice(0, discriminator.length), discriminator)
      );
    },
  );

  if (matches.length !== 1) {
    fail(`Expected exactly one ${label} Umbra instruction.`);
  }

  return {
    accounts: getInstructionAccounts(accountKeys, matches[0]),
    instruction: matches[0],
  };
}

function readTokenAmount(
  balances: readonly TokenBalance[] | null | undefined,
  accountIndex: number,
  mint: string,
) {
  const balance = balances?.find(
    (item) => item.accountIndex === accountIndex && item.mint === mint,
  );

  return balance ? BigInt(balance.uiTokenAmount.amount) : 0n;
}

function verifyTokenBalanceDeltas({
  amountAtomic,
  depositorAtaIndex,
  mint,
  tokenPoolSplAtaIndex,
  transaction,
}: {
  amountAtomic: bigint;
  depositorAtaIndex: number;
  mint: string;
  tokenPoolSplAtaIndex: number;
  transaction: VersionedTransactionResponse;
}) {
  const meta = transaction.meta;

  if (!meta?.preTokenBalances || !meta.postTokenBalances) {
    fail("Umbra transaction is missing token balance evidence.");
  }

  const depositorPre = readTokenAmount(
    meta.preTokenBalances,
    depositorAtaIndex,
    mint,
  );
  const depositorPost = readTokenAmount(
    meta.postTokenBalances,
    depositorAtaIndex,
    mint,
  );
  const poolPre = readTokenAmount(meta.preTokenBalances, tokenPoolSplAtaIndex, mint);
  const poolPost = readTokenAmount(meta.postTokenBalances, tokenPoolSplAtaIndex, mint);

  if (depositorPre - depositorPost < amountAtomic) {
    fail("Umbra depositor token balance did not decrease by the invoice amount.");
  }

  if (poolPost - poolPre < amountAtomic) {
    fail("Umbra token pool did not receive the invoice amount.");
  }
}

function assertSuccessfulTransaction(
  transaction: VersionedTransactionResponse | null,
  label: string,
): asserts transaction is VersionedTransactionResponse {
  if (!transaction) {
    fail(`${label} transaction was not found on-chain.`);
  }

  if (!transaction.meta || transaction.meta.err !== null) {
    fail(`${label} transaction did not succeed on-chain.`);
  }
}

export function decodeUmbraDepositEventsFromLogs(
  logMessages: readonly string[] | null | undefined,
) {
  if (!logMessages) {
    return [];
  }

  const decoder = getDepositIntoStealthPoolFromPublicBalanceEventV1Decoder();
  const decodedEvents: DecodedUmbraDepositEvent[] = [];

  for (const log of logMessages) {
    if (!log.startsWith(UMBRA_EVENT_LOG_PREFIX)) {
      continue;
    }

    const encoded = log.slice(UMBRA_EVENT_LOG_PREFIX.length).trim();

    if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      continue;
    }

    const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
    const candidates =
      bytes.length > 8 ? [bytes, bytes.slice(8)] : [bytes];

    for (const candidate of candidates) {
      try {
        const event = decoder.decode(candidate);

        decodedEvents.push({
          depositor: new PublicKey(event.depositor).toBase58(),
          mint: new PublicKey(event.mint).toBase58(),
          transferAmountAtomic: event.transferAmount.first.toString(),
          optionalData: bytesToHex(event.optionalData.first),
          h1Hash: bytesToHex(event.h1Hash.first),
          h2Hash: bytesToHex(event.h2Hash.first),
          insertionIndexInTree: event.insertionIndexInTree.first.toString(),
          treeIndex: event.programInformationTreeIndex.first.toString(),
        });
      } catch {
        // Non-Umbra program data logs are ignored; a valid payment must still
        // produce a matching Umbra deposit event below.
      }
    }
  }

  return decodedEvents;
}

export function verifyUmbraDepositTransactionResponse(
  transaction: VersionedTransactionResponse | null,
  {
    expected,
    signature,
  }: {
    expected: ExpectedUmbraPaymentEvidence;
    signature: string;
  },
  deps: DepositVerificationDeps = {},
): VerifiedUmbraPaymentEvidence {
  assertSuccessfulTransaction(transaction, "Create UTXO");

  if (!transaction.transaction.signatures.includes(signature)) {
    fail("Create UTXO signature does not belong to the fetched transaction.");
  }

  const normalized = normalizeExpected(expected);
  const { accounts, instruction } = findSingleUmbraInstruction(
    transaction,
    getDepositIntoStealthPoolFromPublicBalanceDiscriminatorBytes(),
    "deposit-from-public-balance",
  );
  const data =
    getDepositIntoStealthPoolFromPublicBalanceInstructionDataDecoder().decode(
      instruction.data,
    );
  const transferAmount = data.transferAmount.first;
  const depositorAtaIndex =
    instruction.accountKeyIndexes[DEPOSIT_ACCOUNT_INDEXES.depositorAta];
  const tokenPoolSplAtaIndex =
    instruction.accountKeyIndexes[DEPOSIT_ACCOUNT_INDEXES.tokenPoolSplAta];

  if (!bytesEqual(data.discriminator, getDepositIntoStealthPoolFromPublicBalanceDiscriminatorBytes())) {
    fail("Create UTXO instruction discriminator does not match Umbra deposit.");
  }

  if (accounts[DEPOSIT_ACCOUNT_INDEXES.depositor] !== normalized.payerWalletAddress) {
    fail("Umbra deposit payer does not match this checkout.");
  }

  if (accounts[DEPOSIT_ACCOUNT_INDEXES.mint] !== normalized.mint) {
    fail("Umbra deposit mint does not match this checkout.");
  }

  if (transferAmount !== normalized.amountAtomic) {
    fail("Umbra deposit amount does not match this invoice.");
  }

  if (
    depositorAtaIndex === undefined ||
    tokenPoolSplAtaIndex === undefined
  ) {
    fail("Umbra deposit token accounts are missing.");
  }

  verifyTokenBalanceDeltas({
    amountAtomic: normalized.amountAtomic,
    depositorAtaIndex,
    mint: normalized.mint,
    tokenPoolSplAtaIndex,
    transaction,
  });

  const decodeEvents =
    deps.decodeDepositEventsFromLogs ?? decodeUmbraDepositEventsFromLogs;
  const matchingEvent = decodeEvents(transaction.meta?.logMessages).some(
    (event) =>
      event.depositor === normalized.payerWalletAddress &&
      event.mint === normalized.mint &&
      event.transferAmountAtomic === normalized.amountAtomic.toString() &&
      event.optionalData === normalized.optionalData,
  );

  if (!matchingEvent) {
    fail("Umbra deposit event does not match this invoice reference.");
  }

  return {
    payerWalletAddress: normalized.payerWalletAddress,
    mint: normalized.mint,
    amountAtomic: normalized.amountAtomic.toString(),
    optionalData: normalized.optionalData,
    proofAccountOffset:
      data.publicStealthPoolDepositInputBufferOffset.first.toString(),
    depositorAta: accounts[DEPOSIT_ACCOUNT_INDEXES.depositorAta],
    tokenPoolSplAta: accounts[DEPOSIT_ACCOUNT_INDEXES.tokenPoolSplAta],
  };
}

export function verifyUmbraProofAccountTransactionResponse(
  transaction: VersionedTransactionResponse | null,
  {
    expected,
    proofAccountOffset,
    signature,
  }: {
    expected: ExpectedUmbraPaymentEvidence;
    proofAccountOffset: string;
    signature: string;
  },
) {
  assertSuccessfulTransaction(transaction, "Create proof account");

  if (!transaction.transaction.signatures.includes(signature)) {
    fail("Create proof account signature does not belong to the fetched transaction.");
  }

  const normalized = normalizeExpected(expected);
  const { accounts, instruction } = findSingleUmbraInstruction(
    transaction,
    getCreatePublicStealthPoolDepositInputBufferDiscriminatorBytes(),
    "create-public-proof-account",
  );
  const data =
    getCreatePublicStealthPoolDepositInputBufferInstructionDataDecoder().decode(
      instruction.data,
    );

  if (
    !bytesEqual(
      data.discriminator,
      getCreatePublicStealthPoolDepositInputBufferDiscriminatorBytes(),
    )
  ) {
    fail("Create proof account discriminator does not match Umbra proof creation.");
  }

  if (accounts[PROOF_ACCOUNT_INDEXES.depositor] !== normalized.payerWalletAddress) {
    fail("Umbra proof account payer does not match this checkout.");
  }

  if (data.offset.first.toString() !== proofAccountOffset) {
    fail("Umbra proof account offset does not match the deposit transaction.");
  }

  if (bytesToHex(data.optionalData.first) !== normalized.optionalData) {
    fail("Umbra proof account invoice reference does not match this checkout.");
  }
}

async function fetchTransactionWithRetry(
  connection: Connection,
  signature: string,
  label: string,
) {
  return withTransientRetry(async () => {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) {
      throw new Error(
        `RPC null result for ${label} ${signature.slice(0, 8)}: not yet indexed`,
      );
    }
    return tx;
  });
}

export async function verifyUmbraPaymentEvidence({
  connection,
  createProofAccountSignature,
  createUtxoSignature,
  expected,
}: VerifyUmbraPaymentEvidenceInput) {
  const [depositTransaction, proofAccountTransaction] = await Promise.all([
    fetchTransactionWithRetry(connection, createUtxoSignature, "Create UTXO"),
    fetchTransactionWithRetry(
      connection,
      createProofAccountSignature,
      "Create proof account",
    ),
  ]);

  const verified = verifyUmbraDepositTransactionResponse(depositTransaction, {
    expected,
    signature: createUtxoSignature,
  });

  verifyUmbraProofAccountTransactionResponse(proofAccountTransaction, {
    expected,
    proofAccountOffset: verified.proofAccountOffset,
    signature: createProofAccountSignature,
  });

  return verified;
}
