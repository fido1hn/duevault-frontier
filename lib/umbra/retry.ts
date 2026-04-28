const TRANSIENT_ERROR_PATTERNS = [
  /failed to fetch/i,
  /fetch failed/i,
  /network ?error/i,
  /econnreset/i,
  /etimedout/i,
  /socket hang up/i,
  /request timed out/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
  /not yet indexed/i,
  /rpc null result/i,
];

const FATAL_ERROR_PATTERNS = [
  /user rejected/i,
  /user denied/i,
  /already claimed/i,
  /already confirmed/i,
  /already exists/i,
  /already attached/i,
  /invalid signature/i,
  /not found on-chain/i,
];

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function isTransientError(error: unknown): boolean {
  const message = getMessage(error);
  if (!message) return false;

  if (FATAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return false;
  }

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export type RetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1_500;
  const backoffFactor = options.backoffFactor ?? 2;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isTransientError(error)) {
        throw error;
      }

      options.onRetry?.(attempt, error);
      const delay = initialDelayMs * backoffFactor ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
