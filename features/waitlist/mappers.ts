import type { WaitlistSignupRecord } from "@/features/waitlist/repository";
import type { SerializedWaitlistSignup } from "@/features/waitlist/types";

export function serializeWaitlistSignup(
  signup: WaitlistSignupRecord,
): SerializedWaitlistSignup {
  return {
    id: signup.id,
    email: signup.email,
    name: signup.name,
    company: signup.company,
    useCase: signup.useCase,
    source: signup.source,
    status: signup.status,
    createdAt: signup.createdAt.toISOString(),
    updatedAt: signup.updatedAt.toISOString(),
  };
}
