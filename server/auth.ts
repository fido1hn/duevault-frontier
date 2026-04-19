import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { LinkedAccount, User as PrivyUser } from "@privy-io/node";
import type { Prisma, Wallet } from "@/generated/prisma/client";

import { db } from "@/server/db";
import { getPrivyClient } from "@/server/privy";

const authMerchantProfileInclude = {
  primaryWallet: true,
} satisfies Prisma.MerchantProfileInclude;

export type AuthMerchantProfile = Prisma.MerchantProfileGetPayload<{
  include: typeof authMerchantProfileInclude;
}>;

export type LinkedSolanaWallet = {
  address: string;
  connectorType: string | null;
  walletClientType: string | null;
};

export type AuthContext = {
  privyUser: PrivyUser;
  user: Prisma.UserGetPayload<object>;
  wallets: Wallet[];
  solanaWallets: LinkedSolanaWallet[];
  primarySolanaWallet: LinkedSolanaWallet | null;
  merchantProfile: AuthMerchantProfile | null;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function extractBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function isEmailAccount(account: LinkedAccount): account is Extract<
  LinkedAccount,
  { type: "email" }
> {
  return account.type === "email";
}

function isSolanaWalletAccount(account: LinkedAccount): account is Extract<
  LinkedAccount,
  { type: "wallet"; chain_type: "solana" }
> {
  return (
    account.type === "wallet" &&
    "chain_type" in account &&
    account.chain_type === "solana"
  );
}

function getDisplayName(privyUser: PrivyUser) {
  const metadata = privyUser.custom_metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const name = metadata.name;

  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function extractEmail(privyUser: PrivyUser) {
  return (
    privyUser.linked_accounts.find(isEmailAccount)?.address.toLowerCase() ??
    null
  );
}

function extractSolanaWallets(privyUser: PrivyUser): LinkedSolanaWallet[] {
  return privyUser.linked_accounts
    .filter(isSolanaWalletAccount)
    .map((account) => ({
      address: account.address.trim(),
      connectorType: account.connector_type ?? null,
      walletClientType: account.wallet_client_type ?? null,
    }))
    .filter((wallet) => wallet.address.length > 0);
}

async function syncPrivyUser(privyUser: PrivyUser) {
  const email = extractEmail(privyUser);
  const name = getDisplayName(privyUser);
  const solanaWallets = extractSolanaWallets(privyUser);

  return db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        privyDid: privyUser.id,
      },
      update: {
        email,
        name,
      },
      create: {
        privyDid: privyUser.id,
        email,
        name,
      },
    });

    const wallets: Wallet[] = [];

    for (const wallet of solanaWallets) {
      const existingWallet = await tx.wallet.findUnique({
        where: {
          chain_address: {
            chain: "solana",
            address: wallet.address,
          },
        },
      });

      if (existingWallet && existingWallet.userId !== user.id) {
        throw new AuthError(
          "This Solana wallet is already linked to another DueVault user.",
          409,
        );
      }

      const syncedWallet = existingWallet
        ? await tx.wallet.update({
            where: {
              id: existingWallet.id,
            },
            data: {
              connectorType: wallet.connectorType,
              walletClientType: wallet.walletClientType,
            },
          })
        : await tx.wallet.create({
            data: {
              userId: user.id,
              chain: "solana",
              address: wallet.address,
              connectorType: wallet.connectorType,
              walletClientType: wallet.walletClientType,
            },
          });

      wallets.push(syncedWallet);
    }

    return {
      user,
      wallets,
      solanaWallets,
    };
  });
}

export async function requireAuthContext(
  request: NextRequest,
): Promise<AuthContext> {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    throw new AuthError("A Privy access token is required.", 401);
  }

  let privyUser: PrivyUser;

  try {
    const client = getPrivyClient();
    const claims = await client.utils().auth().verifyAccessToken(accessToken);

    privyUser = await client.users()._get(claims.user_id);
  } catch {
    throw new AuthError("Invalid or expired Privy access token.", 401);
  }

  const synced = await syncPrivyUser(privyUser);
  const merchantProfile = await db.merchantProfile.findUnique({
    where: {
      userId: synced.user.id,
    },
    include: authMerchantProfileInclude,
  });

  return {
    privyUser,
    user: synced.user,
    wallets: synced.wallets,
    solanaWallets: synced.solanaWallets,
    primarySolanaWallet: synced.solanaWallets[0] ?? null,
    merchantProfile,
  };
}

export async function requireMerchantProfile(request: NextRequest) {
  const authContext = await requireAuthContext(request);
  const merchantProfile = authContext.merchantProfile;

  if (!merchantProfile) {
    throw new AuthError("Merchant profile setup is required.", 403);
  }

  return {
    ...authContext,
    merchantProfile,
  };
}

export function authErrorResponse(
  error: unknown,
  fallbackMessage = "Authentication failed.",
) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
