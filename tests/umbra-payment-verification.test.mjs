import { describe, expect, test } from "bun:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  UMBRA_PROGRAM_ADDRESS,
  getDepositIntoStealthPoolFromPublicBalanceInstructionDataEncoder,
} from "@umbra-privacy/umbra-codama";

import {
  UmbraPaymentVerificationError,
  verifyUmbraDepositTransactionResponse,
} from "../features/checkout/umbra-payment-verification.ts";

const SIGNATURE =
  "5N4eBfdd7tm9axp5Dz5GU9h1tmM1CpMjzLvG2h76kKtozQZHVqJPD5nT1MS1w6jDx8mvUzzTcJ1q8m7aA6dYkQgb";
const UMBRA_DEVNET_MINT = "GvUQDFLWYH4QHKYot787616f61m1m5eZofhYKyaBkPn9";
const OPTIONAL_DATA = "a".repeat(64);
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const CLOCK_SYSVAR = "SysvarC1ock11111111111111111111111111111111";

function key() {
  return Keypair.generate().publicKey.toBase58();
}

function tokenAmount(amount) {
  return {
    amount: amount.toString(),
    decimals: 9,
    uiAmount: Number(amount) / 1_000_000_000,
    uiAmountString: (Number(amount) / 1_000_000_000).toString(),
  };
}

function zeroHash() {
  return { first: new Uint8Array(32) };
}

function buildDepositInstructionData(amount, proofOffset = 7n) {
  return getDepositIntoStealthPoolFromPublicBalanceInstructionDataEncoder().encode(
    {
      feeVaultOffset: { first: 0n },
      publicStealthPoolDepositInputBufferOffset: { first: proofOffset },
      feesAmountLowerBound: { first: 0n },
      feesAmountUpperBound: { first: amount },
      feesBaseFeesInSpl: { first: 0n },
      feesCommissionFeeInSpl: { first: 0 },
      feesMerklePath: [zeroHash(), zeroHash(), zeroHash(), zeroHash()],
      feesLeafIndex: { first: 0 },
      transferAmount: { first: amount },
    },
  );
}

function buildFixture({
  amount = 250_000n,
  eventOptionalData = OPTIONAL_DATA,
    mint = UMBRA_DEVNET_MINT,
  payer = key(),
  programAddress = UMBRA_PROGRAM_ADDRESS,
  transactionAmount = amount,
  transactionErr = null,
  duplicateDepositInstruction = false,
} = {}) {
  const feePayer = payer;
  const depositor = payer;
  const depositorAta = key();
  const tokenPoolSplAta = key();
  const accountKeys = [
    programAddress,
    feePayer,
    depositor,
    key(),
    depositorAta,
    key(),
    key(),
    key(),
    key(),
    tokenPoolSplAta,
    key(),
    mint,
    key(),
    key(),
    TOKEN_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    SYSTEM_PROGRAM,
    CLOCK_SYSVAR,
  ];
  const depositInstruction = {
    programIdIndex: 0,
    accountKeyIndexes: Array.from({ length: 17 }, (_, index) => index + 1),
    data: buildDepositInstructionData(transactionAmount),
  };
  const instructions = duplicateDepositInstruction
    ? [depositInstruction, depositInstruction]
    : [depositInstruction];
  const transaction = {
    slot: 1,
    version: 0,
    blockTime: null,
    transaction: {
      signatures: [SIGNATURE],
      message: {
        version: 0,
        compiledInstructions: instructions,
        getAccountKeys: () => ({
          get: (index) =>
            accountKeys[index] ? new PublicKey(accountKeys[index]) : undefined,
        }),
      },
    },
    meta: {
      err: transactionErr,
      loadedAddresses: {
        writable: [],
        readonly: [],
      },
      logMessages: [],
      preTokenBalances: [
        {
          accountIndex: 4,
          mint,
          owner: depositor,
          programId: TOKEN_PROGRAM,
          uiTokenAmount: tokenAmount(1_000_000n),
        },
        {
          accountIndex: 9,
          mint,
          owner: key(),
          programId: TOKEN_PROGRAM,
          uiTokenAmount: tokenAmount(0n),
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 4,
          mint,
          owner: depositor,
          programId: TOKEN_PROGRAM,
          uiTokenAmount: tokenAmount(1_000_000n - amount),
        },
        {
          accountIndex: 9,
          mint,
          owner: key(),
          programId: TOKEN_PROGRAM,
          uiTokenAmount: tokenAmount(amount),
        },
      ],
    },
  };
  const expected = {
    payerWalletAddress: payer,
    mint,
    amountAtomic: amount.toString(),
    optionalData: OPTIONAL_DATA,
  };
  const event = {
    depositor,
    mint,
    transferAmountAtomic: transactionAmount.toString(),
    optionalData: eventOptionalData,
  };

  return {
    event,
    expected,
    transaction,
  };
}

function verify(fixture, expected = fixture.expected) {
  return verifyUmbraDepositTransactionResponse(
    fixture.transaction,
    {
      expected,
      signature: SIGNATURE,
    },
    {
      decodeDepositEventsFromLogs: () => [fixture.event],
    },
  );
}

function expectVerificationError(callback, pattern) {
  expect(callback).toThrow(UmbraPaymentVerificationError);
  expect(callback).toThrow(pattern);
}

describe("verifyUmbraDepositTransactionResponse", () => {
  test("accepts a matching Umbra deposit fixture", () => {
    const fixture = buildFixture();

    expect(verify(fixture)).toMatchObject({
      amountAtomic: fixture.expected.amountAtomic,
      mint: fixture.expected.mint,
      optionalData: fixture.expected.optionalData,
      payerWalletAddress: fixture.expected.payerWalletAddress,
    });
  });

  test("rejects missing and failed transactions", () => {
    const fixture = buildFixture();

    expectVerificationError(
      () =>
        verifyUmbraDepositTransactionResponse(null, {
          expected: fixture.expected,
          signature: SIGNATURE,
        }),
      /not found/,
    );

    expectVerificationError(
      () => verify(buildFixture({ transactionErr: { InstructionError: [0, 1] } })),
      /did not succeed/,
    );
  });

  test("rejects non-Umbra or ambiguous deposit instructions", () => {
    expectVerificationError(
      () => verify(buildFixture({ programAddress: key() })),
      /exactly one/,
    );

    expectVerificationError(
      () => verify(buildFixture({ duplicateDepositInstruction: true })),
      /exactly one/,
    );
  });

  test("rejects payer, mint, amount, and optionalData mismatches", () => {
    const fixture = buildFixture();

    expectVerificationError(
      () =>
        verify(fixture, {
          ...fixture.expected,
          payerWalletAddress: key(),
        }),
      /payer/,
    );

    expectVerificationError(
      () =>
        verify(fixture, {
          ...fixture.expected,
          mint: key(),
        }),
      /mint/,
    );

    expectVerificationError(
      () => verify(buildFixture({ transactionAmount: 125_000n })),
      /amount/,
    );

    expectVerificationError(
      () => verify(buildFixture({ eventOptionalData: "b".repeat(64) })),
      /invoice reference/,
    );
  });

  test("rejects deposits without sufficient token balance deltas", () => {
    const fixture = buildFixture();
    fixture.transaction.meta.postTokenBalances[1].uiTokenAmount =
      tokenAmount(1n);

    expectVerificationError(() => verify(fixture), /token pool/);
  });
});
