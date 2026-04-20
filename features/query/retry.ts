import { ApiClientError } from "@/features/auth/client";

export function shouldRetryQuery(failureCount: number, error: Error) {
  if (failureCount >= 1) {
    return false;
  }

  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return false;
    }

    return error.status >= 500;
  }

  return true;
}
