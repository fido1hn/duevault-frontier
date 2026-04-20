import {
  describePrivyAccessToken,
  isDebugFlagEnabled,
} from "@/features/auth/token-debug";

export type GetAuthToken = () => Promise<string | null>;

const INVALID_PRIVY_ACCESS_TOKEN_MESSAGE =
  "Invalid or expired Privy access token.";

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

export function createApiClientError(
  response: Response,
  fallbackMessage: string,
  message?: string,
) {
  return new ApiClientError(message ?? fallbackMessage, response.status);
}

export function isAuthApiClientError(error: unknown) {
  return error instanceof ApiClientError && error.status === 401;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  getAuthToken: GetAuthToken,
) {
  const accessToken = await getAuthToken();
  const response = await authenticatedFetchWithToken(input, init, accessToken);

  if (!(await shouldRetryExpiredPrivyToken(response))) {
    return response;
  }

  const refreshedAccessToken = await getAuthToken();

  if (!refreshedAccessToken) {
    return response;
  }

  return authenticatedFetchWithToken(input, init, refreshedAccessToken);
}

export function authenticatedFetchWithToken(
  input: RequestInfo | URL,
  init: RequestInit = {},
  accessToken: string | null,
) {
  if (!accessToken) {
    throw new Error("Please sign in to continue.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (isDebugFlagEnabled(process.env.NEXT_PUBLIC_DEBUG_PRIVY_AUTH)) {
    console.debug("[Privy auth] Sending access token", {
      request: getRequestTarget(input),
      token: describePrivyAccessToken(accessToken),
    });
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

async function shouldRetryExpiredPrivyToken(response: Response) {
  if (response.status !== 401) {
    return false;
  }

  try {
    const payload = (await response.clone().json()) as { error?: unknown };

    return payload.error === INVALID_PRIVY_ACCESS_TOKEN_MESSAGE;
  } catch {
    return false;
  }
}

function getRequestTarget(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}
