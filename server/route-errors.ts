import "server-only";

import { NextResponse } from "next/server";

import { logger } from "@/server/logger";

type RouteErrorContext = {
  route: string;
  action: string;
  [key: string]: unknown;
};

type AppRouteErrorInput = {
  status?: number;
  code?: string;
  userMessage: string;
  expose?: boolean;
};

type SerializedError = {
  name?: string;
  message?: string;
  code?: unknown;
  status?: unknown;
  cause?: SerializedError;
  logs?: string[];
  simulationLogs?: string[];
};

const DEFAULT_ERROR_STATUS = 400;
const PENDING_UMBRA_VERIFICATION_MESSAGE =
  "We could not verify the Umbra transaction yet. Please wait a moment and try again.";
const UMBRA_PAYMENT_MISMATCH_MESSAGE =
  "This Umbra payment does not match the invoice.";

const EXPOSED_ERROR_NAMES = new Set([
  "AuthError",
  "AuditBodyError",
  "AuditServiceError",
  "AuditValidationError",
  "UmbraClaimSettlementError",
  "UmbraPaymentConflictError",
  "UmbraPaymentSaveValidationError",
]);

export class AppRouteError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly userMessage: string;
  readonly expose: boolean;

  constructor(input: AppRouteErrorInput, options?: ErrorOptions) {
    super(input.userMessage, options);
    this.name = "AppRouteError";
    this.status = input.status ?? DEFAULT_ERROR_STATUS;
    this.code = input.code;
    this.userMessage = input.userMessage;
    this.expose = input.expose ?? true;
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

function getNumberField(value: unknown, field: string) {
  if (!isRecord(value)) {
    return null;
  }

  const next = value[field];

  return typeof next === "number" && Number.isInteger(next) ? next : null;
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function serializeError(error: unknown, seen = new Set<unknown>()): SerializedError {
  if (!isRecord(error) && !(error instanceof Error)) {
    return {
      message: String(error),
    };
  }

  if (seen.has(error)) {
    return {
      message: "[Circular error]",
    };
  }

  seen.add(error);

  const cause = getCause(error);

  return {
    name: error instanceof Error ? error.name : getStringField(error, "name") ?? undefined,
    message:
      error instanceof Error ? error.message : getStringField(error, "message") ?? undefined,
    code: isRecord(error) ? error.code : undefined,
    status: isRecord(error) ? error.status : undefined,
    logs: isRecord(error) ? readStringArray(error.logs) : undefined,
    simulationLogs: isRecord(error)
      ? readStringArray(error.simulationLogs)
      : undefined,
    cause: cause ? serializeError(cause, seen) : undefined,
  };
}

function collectSearchableText(error: unknown): string {
  const serialized = serializeError(error);

  return JSON.stringify(serialized).toLowerCase();
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : getStringField(error, "name");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : getStringField(error, "message") ?? String(error);
}

function getStatus(error: unknown) {
  if (error instanceof AppRouteError) {
    return error.status;
  }

  return getNumberField(error, "status") ?? DEFAULT_ERROR_STATUS;
}

function getCode(error: unknown) {
  if (error instanceof AppRouteError) {
    return error.code;
  }

  const code = getStringField(error, "code");

  return code ?? undefined;
}

function isPendingUmbraVerification(error: unknown) {
  const searchable = collectSearchableText(error);

  return /not yet indexed|not confirmed yet|transaction was not found|rpc null result|timeout|abort/.test(
    searchable,
  );
}

function resolveRouteError(error: unknown, fallback: string) {
  if (error instanceof AppRouteError) {
    return {
      code: error.code,
      message: error.expose ? error.userMessage : fallback,
      status: error.status,
    };
  }

  const name = getErrorName(error);

  if (name === "UmbraPaymentVerificationError") {
    return {
      code: getCode(error),
      message: isPendingUmbraVerification(error)
        ? PENDING_UMBRA_VERIFICATION_MESSAGE
        : UMBRA_PAYMENT_MISMATCH_MESSAGE,
      status: getStatus(error),
    };
  }

  if (name && EXPOSED_ERROR_NAMES.has(name)) {
    return {
      code: getCode(error),
      message: getErrorMessage(error),
      status: getStatus(error),
    };
  }

  if (/umbra payment transactions are not confirmed yet/i.test(getErrorMessage(error))) {
    return {
      code: getCode(error),
      message: PENDING_UMBRA_VERIFICATION_MESSAGE,
      status: getStatus(error),
    };
  }

  return {
    code: undefined,
    message: fallback,
    status: getStatus(error),
  };
}

export function logRouteError(context: RouteErrorContext, error: unknown) {
  const resolved = resolveRouteError(error, "Internal route error.");

  logger.error("[route error]", {
    ...context,
    code: resolved.code,
    error: serializeError(error),
    status: resolved.status,
  });
}

export function routeErrorResponse(
  error: unknown,
  fallback: string,
  context: RouteErrorContext,
) {
  const resolved = resolveRouteError(error, fallback);
  const payload: { error: string; code?: string } = {
    error: resolved.message,
  };

  if (resolved.code) {
    payload.code = resolved.code;
  }

  logRouteError(context, error);

  return NextResponse.json(payload, { status: resolved.status });
}
