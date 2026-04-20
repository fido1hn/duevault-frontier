import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { LinkedAccount, User as PrivyUser } from "@privy-io/node";
import type { Prisma, Wallet } from "@/generated/prisma/client";

import {
  describePrivyAccessToken,
  isDebugFlagEnabled,
} from "@/features/auth/token-debug";
import { db } from "@/server/db";
import { getPrivyClient, PrivyConfigurationError } from "@/server/privy";

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

type SyncedPrivyUser = Awaited<ReturnType<typeof syncPrivyUser>>;
type PrivyClientInstance = Awaited<ReturnType<typeof getPrivyClient>>;
type PrivyAccessTokenClaims = Awaited<
  ReturnType<
    ReturnType<
      ReturnType<PrivyClientInstance["utils"]>["auth"]
    >["verifyAccessToken"]
  >
>;

const AUTH_CACHE_TTL_MS = 15_000;
const MAX_AUTH_CACHE_ENTRIES = 100;

const privyUserCache = new Map<
  string,
  {
    privyUser: PrivyUser;
    expiresAt: number;
  }
>();
const syncedPrivyUserCache = new Map<
  string,
  {
    synced: SyncedPrivyUser;
    expiresAt: number;
  }
>();

function canUseAuthCache(request: NextRequest) {
  return request.method === "GET" || request.method === "HEAD";
}

function readCacheEntry<T>(cache: Map<string, { expiresAt: number } & T>, key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry;
}

function writeCacheEntry<T>(
  cache: Map<string, { expiresAt: number } & T>,
  key: string,
  value: T,
) {
  if (cache.size >= MAX_AUTH_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;

    if (firstKey) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    ...value,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
}

async function getPrivyUserForAuth(
  client: PrivyClientInstance,
  userId: string,
  useCache: boolean,
) {
  if (useCache) {
    const cachedUser = readCacheEntry(privyUserCache, userId);

    if (cachedUser) {
      return cachedUser.privyUser;
    }
  }

  const privyUser = await client.users()._get(userId);

  writeCacheEntry(privyUserCache, userId, { privyUser });

  return privyUser;
}

function getSyncedPrivyUserCacheKey(privyUser: PrivyUser) {
  const email = extractEmail(privyUser) ?? "";
  const name = getDisplayName(privyUser) ?? "";
  const wallets = extractSolanaWallets(privyUser)
    .map(
      (wallet) =>
        `${wallet.address}:${wallet.connectorType ?? ""}:${wallet.walletClientType ?? ""}`,
    )
    .sort()
    .join("|");

  return `${privyUser.id}:${email}:${name}:${wallets}`;
}

async function syncPrivyUserForAuth(privyUser: PrivyUser, useCache: boolean) {
  const cacheKey = getSyncedPrivyUserCacheKey(privyUser);

  if (useCache) {
    const cachedSync = readCacheEntry(syncedPrivyUserCache, cacheKey);

    if (cachedSync) {
      return cachedSync.synced;
    }
  }

  const synced = await syncPrivyUser(privyUser);

  writeCacheEntry(syncedPrivyUserCache, cacheKey, { synced });

  return synced;
}

export async function requireAuthContext(
  request: NextRequest,
): Promise<AuthContext> {
  const accessToken = extractBearerToken(request);
  const shouldLogDebug = shouldLogPrivyAuthDebug();
  const useAuthCache = canUseAuthCache(request);

  if (!accessToken) {
    if (shouldLogDebug) {
      console.warn("[Privy auth] Missing access token", {
        path: request.nextUrl.pathname,
        hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
      });
    }

    throw new AuthError("A Privy access token is required.", 401);
  }

  let privyUser: PrivyUser;
  const tokenDebugContext = getPrivyTokenDebugContext(accessToken);
  const client = await getPrivyClientForAuth(request);
  let claims: PrivyAccessTokenClaims;

  try {
    claims = await client.utils().auth().verifyAccessToken(accessToken);

    if (shouldLogDebug) {
      console.info("[Privy auth] Verified access token", {
        path: request.nextUrl.pathname,
        ...tokenDebugContext,
        userId: claims.user_id,
      });
    }
  } catch (error) {
    if (tokenDebugContext.audienceMatchesConfiguredAppId === false) {
      console.warn("[Privy auth] Access token audience mismatch", {
        path: request.nextUrl.pathname,
        ...tokenDebugContext,
      });
    }

    if (shouldLogDebug) {
      console.warn("[Privy auth] Access token verification failed", {
        path: request.nextUrl.pathname,
        ...tokenDebugContext,
        error: serializeAuthError(error),
      });
    }

    throw new AuthError("Invalid or expired Privy access token.", 401);
  }

  try {
    privyUser = await getPrivyUserForAuth(client, claims.user_id, useAuthCache);
  } catch (error) {
    console.error("[Privy auth] Privy user lookup failed", {
      path: request.nextUrl.pathname,
      userId: claims.user_id,
      error: serializeAuthError(error),
    });

    throw new AuthError("Unable to confirm Privy user with Privy.", 502);
  }

  const synced = await syncPrivyUserForAuth(privyUser, useAuthCache);
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

async function getPrivyClientForAuth(request: NextRequest) {
  try {
    return await getPrivyClient();
  } catch (error) {
    if (error instanceof PrivyConfigurationError) {
      console.error("[Privy auth] Configuration error", {
        path: request.nextUrl.pathname,
        error: serializeAuthError(error),
      });

      throw new AuthError("Privy authentication is not configured correctly.", 500);
    }

    throw error;
  }
}

function getPrivyTokenDebugContext(accessToken: string) {
  const token = describePrivyAccessToken(accessToken);
  const configuredAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? null;
  const audience = "audience" in token ? (token.audience ?? null) : null;

  return {
    token,
    configuredAppId,
    audienceMatchesConfiguredAppId: doesAudienceMatchAppId(
      audience,
      configuredAppId,
    ),
  };
}

function doesAudienceMatchAppId(
  audience: string | string[] | null,
  appId: string | null,
) {
  if (!audience || !appId) {
    return null;
  }

  return Array.isArray(audience) ? audience.includes(appId) : audience === appId;
}

function serializeAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    cause:
      error.cause instanceof Error
        ? {
            name: error.cause.name,
            message: error.cause.message,
          }
        : undefined,
  };
}

function shouldLogPrivyAuthDebug() {
  return (
    isDebugFlagEnabled(process.env.DEBUG_PRIVY_AUTH) ||
    isDebugFlagEnabled(process.env.NEXT_PUBLIC_DEBUG_PRIVY_AUTH)
  );
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
