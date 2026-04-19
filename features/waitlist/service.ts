import "server-only";

import { serializeWaitlistSignup } from "@/features/waitlist/mappers";
import {
  findWaitlistSignupByEmail,
  upsertWaitlistSignupRecord,
} from "@/features/waitlist/repository";
import type {
  WaitlistSignupInput,
  WaitlistSignupResult,
} from "@/features/waitlist/types";
import {
  sanitizeEmail,
  sanitizeOptional,
  sanitizeSource,
  sanitizeUseCase,
} from "@/features/waitlist/validators";

export async function joinWaitlist(
  input: WaitlistSignupInput,
): Promise<WaitlistSignupResult> {
  const email = sanitizeEmail(input.email);
  const existing = await findWaitlistSignupByEmail(email);
  const updateData = {
    name: sanitizeOptional(input.name) ?? existing?.name ?? null,
    company: sanitizeOptional(input.company) ?? existing?.company ?? null,
    useCase: sanitizeUseCase(input.useCase) ?? existing?.useCase ?? null,
    source: sanitizeSource(input.source ?? existing?.source),
    status: "joined" as const,
  };

  const signup = await upsertWaitlistSignupRecord({
    email,
    ...updateData,
  });

  return {
    signup: serializeWaitlistSignup(signup),
    alreadyJoined: Boolean(existing),
  };
}
