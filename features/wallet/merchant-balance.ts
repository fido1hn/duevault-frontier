type UmbraBalanceResult =
  | { readonly state: "non_existent" }
  | { readonly state: "uninitialized" }
  | { readonly state: "mxe" }
  | { readonly state: "shared"; readonly balance: bigint };

export type MerchantBalanceView = {
  state: "available" | "empty" | "unavailable";
  atomicAmount: bigint;
  displayAmount: string;
  canWithdraw: boolean;
  label: string;
  description: string;
};

export type WithdrawAmountValidation =
  | { ok: true; atomicAmount: bigint }
  | { ok: false; error: string };

export function formatAtomicTokenAmount(
  atomicAmount: bigint,
  decimals: number,
  symbol: string,
) {
  const base = 10n ** BigInt(decimals);
  const whole = atomicAmount / base;
  const fraction = atomicAmount % base;

  if (fraction === 0n) {
    return `${whole.toString()} ${symbol}`;
  }

  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");

  return `${whole.toString()}.${fractionText} ${symbol}`;
}

export function getMerchantBalanceView(
  balance: UmbraBalanceResult,
  decimals: number,
  symbol: string,
): MerchantBalanceView {
  if (balance.state === "shared") {
    const atomicAmount = BigInt(balance.balance);

    return {
      state: atomicAmount > 0n ? "available" : "empty",
      atomicAmount,
      displayAmount: formatAtomicTokenAmount(atomicAmount, decimals, symbol),
      canWithdraw: atomicAmount > 0n,
      label: atomicAmount > 0n ? "Available" : "Empty",
      description:
        atomicAmount > 0n
          ? "Private merchant balance ready to withdraw."
          : "No private merchant balance for this mint yet.",
    };
  }

  if (balance.state === "mxe") {
    return {
      state: "unavailable",
      atomicAmount: 0n,
      displayAmount: "Unavailable",
      canWithdraw: false,
      label: "Unavailable",
      description:
        "This encrypted balance cannot be decrypted from the merchant wallet yet.",
    };
  }

  return {
    state: "empty",
    atomicAmount: 0n,
    displayAmount: formatAtomicTokenAmount(0n, decimals, symbol),
    canWithdraw: false,
    label: "Empty",
    description: "No private merchant balance for this mint yet.",
  };
}

export function parseMerchantWithdrawAmount(value: string, decimals: number) {
  const input = value.trim();

  if (!input) {
    throw new Error("Enter an amount to withdraw.");
  }

  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new Error("Enter a valid amount.");
  }

  const [whole, fraction = ""] = input.split(".");

  if (fraction.length > decimals) {
    throw new Error(`Amount can have at most ${decimals} decimal places.`);
  }

  const atomicAmount =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");

  if (atomicAmount <= 0n) {
    throw new Error("Withdrawal amount must be greater than zero.");
  }

  return atomicAmount;
}

export function validateMerchantWithdrawAmount(
  value: string,
  availableAmount: bigint,
  decimals: number,
): WithdrawAmountValidation {
  try {
    const atomicAmount = parseMerchantWithdrawAmount(value, decimals);

    if (atomicAmount > availableAmount) {
      return {
        ok: false,
        error: "Withdrawal amount exceeds the private balance.",
      };
    }

    return {
      ok: true,
      atomicAmount,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to validate amount.",
    };
  }
}
