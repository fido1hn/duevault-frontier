export type UmbraErrorCategory =
  | "network"
  | "user_rejected"
  | "insufficient_sol"
  | "missing_registration"
  | "already_registered"
  | "rate_limited"
  | "simulation_failed"
  | "transaction_expired"
  | "unknown";

export type NormalizedUmbraError = {
  category: UmbraErrorCategory;
  userMessage: string;
  debugMessage: string;
};

export class UmbraUserFacingError extends Error {
  category: UmbraErrorCategory;
  debugMessage: string;
  userMessage: string;

  constructor(normalized: NormalizedUmbraError, options?: ErrorOptions) {
    super(normalized.userMessage, options);
    this.name = "UmbraUserFacingError";
    this.category = normalized.category;
    this.debugMessage = normalized.debugMessage;
    this.userMessage = normalized.userMessage;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringField(value: unknown, field: string) {
  if (!isRecord(value)) {
    return null;
  }

  const next = value[field];

  return typeof next === "string" && next.length > 0 ? next : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const message = getStringField(error, "message");

  return message ?? String(error);
}

function getCause(error: unknown): unknown {
  if (error instanceof Error) {
    return error.cause;
  }

  if (!isRecord(error)) {
    return null;
  }

  return error.cause ?? error.error ?? null;
}

function collectMessages(error: unknown, messages: string[] = []): string[] {
  const message = getErrorMessage(error);

  if (message && message !== "[object Object]") {
    messages.push(message);
  }

  const cause = getCause(error);

  if (cause && cause !== error) {
    collectMessages(cause, messages);
  }

  return messages;
}

function collectLogs(error: unknown, visited = new Set<unknown>()): string[] {
  if (!isRecord(error)) {
    return [];
  }

  if (visited.has(error)) {
    return [];
  }

  visited.add(error);

  const possibleLogs = [
    error.logs,
    error.simulationLogs,
    error.transactionLogs,
  ];
  const cause = getCause(error);

  return [
    ...possibleLogs.flatMap((logs) => {
      if (!Array.isArray(logs)) {
        return [];
      }

      return logs.filter((log): log is string => typeof log === "string");
    }),
    ...(cause ? collectLogs(cause, visited) : []),
  ];
}

function getUmbraErrorStage(error: unknown) {
  return getStringField(error, "stage");
}

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function userMessageForCategory(action: string, category: UmbraErrorCategory) {
  switch (category) {
    case "network":
      return `${action} could not reach Umbra or Solana services. Retry in a moment.`;
    case "user_rejected":
      return "You cancelled the wallet approval.";
    case "insufficient_sol":
      return "Add SOL for Umbra setup and transaction fees.";
    case "missing_registration":
      return "Register your Umbra x25519 key to continue.";
    case "already_registered":
      return "This Umbra key is already registered.";
    case "rate_limited":
      return "Umbra or Solana services are busy. Please wait a moment and retry.";
    case "simulation_failed":
      return `${action} could not be completed on-chain. Check your wallet balance and try again.`;
    case "transaction_expired":
      return "The transaction expired before it could be confirmed. Please try again.";
    case "unknown":
      return `${action} could not be completed. Please try again.`;
  }
}

export function normalizeUmbraError(
  action: string,
  error: unknown,
): NormalizedUmbraError {
  if (error instanceof UmbraUserFacingError) {
    return {
      category: error.category,
      userMessage: error.userMessage,
      debugMessage: error.debugMessage,
    };
  }

  const messages = collectMessages(error);
  const logs = collectLogs(error);
  const details = [...messages, ...logs].join(" | ");
  const searchable = details.toLowerCase();
  const stage = getUmbraErrorStage(error);

  let category: UmbraErrorCategory = "unknown";

  if (
    includesAny(searchable, [
      /failed to fetch/,
      /fetch failed/,
      /aborterror/,
      /timeout/,
      /timed out/,
      /not yet indexed/,
      /rpc null result/,
      /unable to reach umbra indexer/,
      /indexer.*unavailable/,
    ])
  ) {
    category = "network";
  } else if (
    includesAny(searchable, [
      /\b429\b/,
      /too many requests/,
      /rate limit/,
      /rate-limited/,
    ])
  ) {
    category = "rate_limited";
  } else if (
    includesAny(searchable, [
      /user rejected/,
      /user denied/,
      /request rejected/,
      /wallet approval.*cancel/,
      /cancelled/,
      /canceled/,
    ])
  ) {
    category = "user_rejected";
  } else if (
    includesAny(searchable, [
      /insufficient funds/,
      /insufficient lamports/,
      /insufficient.*rent/,
      /found no record of a prior credit/,
    ])
  ) {
    category = "insufficient_sol";
  } else if (
    includesAny(searchable, [
      /missing.*x25519/,
      /x25519.*missing/,
      /register.*x25519/,
      /non-existent account/,
      /account does not exist/,
      /no.*umbra.*account/,
    ])
  ) {
    category = "missing_registration";
  } else if (includesAny(searchable, [/already.*registered/])) {
    category = "already_registered";
  } else if (
    includesAny(searchable, [
      /transactionexpired/,
      /blockhash.*expired/,
      /block height exceeded/,
      /last valid block height/,
    ])
  ) {
    category = "transaction_expired";
  } else if (
    includesAny(searchable, [
      /transaction simulation failed/,
      /simulation failed/,
      /failed to simulate/,
    ])
  ) {
    category = "simulation_failed";
  }

  const debugMessage = `${action}${stage ? ` during ${stage}` : ""}: ${
    details || "No raw error details"
  }`;

  return {
    category,
    userMessage: userMessageForCategory(action, category),
    debugMessage,
  };
}

export function toUmbraUserFacingError(action: string, error: unknown) {
  return new UmbraUserFacingError(normalizeUmbraError(action, error), {
    cause: error,
  });
}
