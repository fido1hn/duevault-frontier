import "server-only";

import { PrivyClient } from "@privy-io/node";

let privyClient: PrivyClient | null = null;

export function getPrivyClient() {
  if (privyClient) {
    return privyClient;
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const jwtVerificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;

  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required to initialize Privy.");
  }

  if (!appSecret) {
    throw new Error("PRIVY_APP_SECRET is required to initialize Privy.");
  }

  privyClient = new PrivyClient({
    appId,
    appSecret,
    ...(jwtVerificationKey ? { jwtVerificationKey } : {}),
  });

  return privyClient;
}
