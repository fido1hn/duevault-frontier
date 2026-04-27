import { describe, expect, mock, test } from "bun:test";

const WALLET_ADDRESS = "DueVaultWallet111111111111111111111111111111";
const decodedTransactions = new Map();

mock.module("@solana/kit", () => ({
  address: (value) => value,
  getTransactionEncoder: () => ({
    encode: (transaction) => transaction.encoded,
  }),
  getTransactionDecoder: () => ({
    decode: (signedTransaction) => {
      const id = signedTransaction[0];
      const transaction = decodedTransactions.get(id);

      if (!transaction) {
        throw new Error(`Missing decoded transaction for ${id}`);
      }

      return transaction;
    },
  }),
}));

const { createPrivyUmbraSigner } = await import(
  "../features/checkout/privy-umbra-signer.ts"
);

function makeSignature(byte) {
  return new Uint8Array(64).fill(byte);
}

function makeSigner(signTransaction) {
  return createPrivyUmbraSigner({
    network: "mainnet",
    signMessage: async ({ message }) => ({
      signature: makeSignature(message[0] ?? 1),
    }),
    signTransaction,
    wallet: {
      address: WALLET_ADDRESS,
    },
  });
}

describe("createPrivyUmbraSigner", () => {
  test("returns an empty array without calling Privy for no transactions", async () => {
    const calls = [];
    const signer = makeSigner(async (...args) => {
      calls.push(args);
      throw new Error("signTransaction should not be called");
    });

    await expect(signer.signTransactions([])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });

  test("signs multiple transactions sequentially with single Privy calls", async () => {
    decodedTransactions.clear();
    const calls = [];
    const transactionInputs = [
      { encoded: new Uint8Array([1]) },
      { encoded: new Uint8Array([2]) },
      { encoded: new Uint8Array([3]) },
    ];
    const signedOutputs = [
      {
        id: "first",
        signatures: {
          [WALLET_ADDRESS]: makeSignature(1),
        },
      },
      {
        id: "second",
        signatures: {
          [WALLET_ADDRESS]: makeSignature(2),
        },
      },
      {
        id: "third",
        signatures: {
          [WALLET_ADDRESS]: makeSignature(3),
        },
      },
    ];

    for (let index = 0; index < signedOutputs.length; index += 1) {
      decodedTransactions.set(index + 11, signedOutputs[index]);
    }

    const signer = makeSigner(async (...args) => {
      calls.push(args);
      expect(args).toHaveLength(1);

      const [{ transaction }] = args;

      return {
        signedTransaction: new Uint8Array([transaction[0] + 10]),
      };
    });

    await expect(signer.signTransactions(transactionInputs)).resolves.toEqual(
      signedOutputs,
    );
    expect(calls).toHaveLength(3);
    expect(calls.map(([input]) => input.transaction[0])).toEqual([1, 2, 3]);
  });

  test("keeps selected-wallet signature validation on sequential signing", async () => {
    decodedTransactions.clear();
    decodedTransactions.set(15, {
      signatures: {
        [WALLET_ADDRESS]: new Uint8Array(64),
      },
    });

    const signer = makeSigner(async () => ({
      signedTransaction: new Uint8Array([15]),
    }));

    await expect(
      signer.signTransactions([{ encoded: new Uint8Array([5]) }]),
    ).rejects.toThrow(/selected wallet did not sign as payer/);
  });
});
