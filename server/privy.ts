import "server-only";

import { PrivyClient } from "@privy-io/node";
import { importSPKI } from "jose";

let privyClient: PrivyClient | null = null;
let privyClientInit: Promise<PrivyClient> | null = null;

export class PrivyConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PrivyConfigurationError";
  }
}

export async function getPrivyClient() {
  if (privyClient) {
    return privyClient;
  }

  privyClientInit ??= createPrivyClient().catch((error: unknown) => {
    privyClientInit = null;
    throw error;
  });

  privyClient = await privyClientInit;

  return privyClient;
}

async function createPrivyClient() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const jwtVerificationKey = normalizeJwtVerificationKey(
    process.env.PRIVY_JWT_VERIFICATION_KEY,
  );

  if (!appId) {
    throw new PrivyConfigurationError(
      "NEXT_PUBLIC_PRIVY_APP_ID is required to initialize Privy.",
    );
  }

  if (!appSecret) {
    throw new PrivyConfigurationError(
      "PRIVY_APP_SECRET is required to initialize Privy.",
    );
  }

  if (jwtVerificationKey) {
    await validateJwtVerificationKey(jwtVerificationKey);
  }

  return new PrivyClient({
    appId,
    appSecret,
    ...(jwtVerificationKey ? { jwtVerificationKey } : {}),
  });
}

function normalizeJwtVerificationKey(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/\\n/g, "\n");
}

async function validateJwtVerificationKey(jwtVerificationKey: string) {
  try {
    await importSPKI(jwtVerificationKey, "ES256");
  } catch (error) {
    throw new PrivyConfigurationError(
      "PRIVY_JWT_VERIFICATION_KEY must be a PEM/SPKI public key for ES256. Remove it to let Privy fetch verification keys automatically, or paste the exact dashboard verification key.",
      {
        cause: error,
      },
    );
  }
}
