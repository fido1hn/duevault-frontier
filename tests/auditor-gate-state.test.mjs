import { describe, expect, test } from "bun:test";

import { getAuditorGateState } from "../features/audit/auditor-gate.ts";

const AUDITOR = "AuditorAddr111111111111111111111111111111111";
const OTHER = "OtherWallet111111111111111111111111111111111";

function state(overrides = {}) {
  return getAuditorGateState({
    privyReady: true,
    authenticated: true,
    linkedWalletAddress: AUDITOR,
    activeWalletAddress: AUDITOR,
    walletsReady: true,
    registrationStatus: "registered",
    tokenAuditorAddress: AUDITOR,
    ...overrides,
  });
}

describe("getAuditorGateState", () => {
  test("requires sign-in before wallet or registration checks", () => {
    expect(state({ authenticated: false })).toMatchObject({
      kind: "sign_in",
      canShowDecryptForm: false,
    });
  });

  test("requires a connected Solana wallet", () => {
    expect(
      state({
        linkedWalletAddress: null,
        activeWalletAddress: null,
      }),
    ).toMatchObject({
      kind: "connect_wallet",
      canShowDecryptForm: false,
    });
  });

  test("blocks decrypt when the connected wallet does not match the grant auditor", () => {
    expect(
      state({
        linkedWalletAddress: OTHER,
        activeWalletAddress: OTHER,
      }),
    ).toMatchObject({
      kind: "wallet_mismatch",
      canShowDecryptForm: false,
      expectedAddress: AUDITOR,
      connectedAddress: OTHER,
    });
  });

  test("requires registration when the auditor x25519 key is missing", () => {
    expect(state({ registrationStatus: "unregistered" })).toMatchObject({
      kind: "register",
      canShowDecryptForm: false,
      walletAddress: AUDITOR,
    });
  });

  test("allows decrypt when the grant recipient wallet is registered", () => {
    expect(state()).toMatchObject({
      kind: "ready",
      canShowDecryptForm: true,
      walletAddress: AUDITOR,
    });
  });

  test("does not freeze when a linked wallet has no active wallet object", () => {
    expect(
      state({
        activeWalletAddress: null,
      }),
    ).toMatchObject({
      kind: "connect_active_wallet",
      canShowDecryptForm: false,
      walletAddress: AUDITOR,
    });
  });
});
