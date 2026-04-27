import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export const UMBRA_COST_ESTIMATE_LAMPORTS = {
  registeredPayment: 6_000_000n,
  firstTimeCustomerPayment: 21_000_000n,
  merchantRegistration: 15_000_000n,
} as const;

export type UmbraBalanceReadiness = {
  solBalanceLamports: bigint;
  tokenBalanceAtomic: bigint;
  requiredSolLamports: bigint;
  requiredTokenAtomic: bigint;
  hasEnoughSol: boolean;
  hasEnoughToken: boolean;
};

export function formatSolLamports(lamports: bigint) {
  const sign = lamports < 0n ? "-" : "";
  const absolute = lamports < 0n ? -lamports : lamports;
  const whole = absolute / BigInt(LAMPORTS_PER_SOL);
  const fraction = absolute % BigInt(LAMPORTS_PER_SOL);
  const fractionText = fraction.toString().padStart(9, "0").replace(/0+$/, "");

  return `${sign}${whole.toString()}${fractionText ? `.${fractionText}` : ""} SOL`;
}

export function formatAtomicTokenAmount(
  atomicAmount: bigint,
  decimals: number,
  symbol: string,
) {
  const sign = atomicAmount < 0n ? "-" : "";
  const absolute = atomicAmount < 0n ? -atomicAmount : atomicAmount;
  const factor = 10n ** BigInt(decimals);
  const whole = absolute / factor;
  const fraction = absolute % factor;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${sign}${whole.toString()}${fractionText ? `.${fractionText}` : ""} ${symbol}`;
}

export function getUmbraBalanceReadiness({
  requiredSolLamports,
  requiredTokenAtomic,
  solBalanceLamports,
  tokenBalanceAtomic,
}: {
  requiredSolLamports: bigint;
  requiredTokenAtomic: bigint;
  solBalanceLamports: bigint;
  tokenBalanceAtomic: bigint;
}): UmbraBalanceReadiness {
  return {
    solBalanceLamports,
    tokenBalanceAtomic,
    requiredSolLamports,
    requiredTokenAtomic,
    hasEnoughSol: solBalanceLamports >= requiredSolLamports,
    hasEnoughToken: tokenBalanceAtomic >= requiredTokenAtomic,
  };
}

export async function fetchWalletUmbraBalances({
  amountAtomic,
  mintAddress,
  requiredSolLamports,
  rpcUrl,
  walletAddress,
}: {
  amountAtomic: string;
  mintAddress: string;
  requiredSolLamports: bigint;
  rpcUrl: string;
  walletAddress: string;
}) {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const [solBalanceLamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner, "confirmed"),
    connection.getParsedTokenAccountsByOwner(owner, { mint }, "confirmed"),
  ]);
  const tokenBalanceAtomic = tokenAccounts.value.reduce((sum, account) => {
    const amount =
      account.account.data.parsed.info.tokenAmount.amount;

    return sum + BigInt(String(amount));
  }, 0n);

  return getUmbraBalanceReadiness({
    solBalanceLamports: BigInt(solBalanceLamports),
    tokenBalanceAtomic,
    requiredSolLamports,
    requiredTokenAtomic: BigInt(amountAtomic),
  });
}

export async function fetchWalletSolBalance({
  rpcUrl,
  walletAddress,
}: {
  rpcUrl: string;
  walletAddress: string;
}) {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(walletAddress);

  return BigInt(await connection.getBalance(owner, "confirmed"));
}
