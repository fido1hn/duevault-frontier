import "server-only";

export type LogContext = Record<string, unknown>;

export const logger = {
  error(message: string, context?: LogContext) {
    console.error(message, context ?? {});
  },
  info(message: string, context?: LogContext) {
    console.info(message, context ?? {});
  },
  warn(message: string, context?: LogContext) {
    console.warn(message, context ?? {});
  },
};
