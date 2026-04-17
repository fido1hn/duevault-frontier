import { db } from "@/lib/db";
import type {
  SerializedWaitlistSignup,
  WaitlistSignupInput,
  WaitlistSignupResult,
} from "@/lib/waitlist-types";

type WaitlistSignupRecord = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  useCase: string | null;
  source: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_OPTIONAL_LENGTH = 240;
const MAX_USE_CASE_LENGTH = 600;

function sanitizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Email is required.");
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  return normalized;
}

function sanitizeOptional(
  value: string | undefined,
  maxLength = MAX_OPTIONAL_LENGTH,
) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function sanitizeSource(value: string | undefined) {
  const normalized = value?.trim() || "homepage";

  return normalized.slice(0, 80);
}

function serializeWaitlistSignup(
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

export async function joinWaitlist(
  input: WaitlistSignupInput,
): Promise<WaitlistSignupResult> {
  const email = sanitizeEmail(input.email);
  const existing = await db.waitlistSignup.findUnique({
    where: {
      email,
    },
  });
  const updateData = {
    name: sanitizeOptional(input.name) ?? existing?.name ?? null,
    company: sanitizeOptional(input.company) ?? existing?.company ?? null,
    useCase:
      sanitizeOptional(input.useCase, MAX_USE_CASE_LENGTH) ??
      existing?.useCase ??
      null,
    source: sanitizeSource(input.source ?? existing?.source),
    status: "joined",
  };

  const signup = await db.waitlistSignup.upsert({
    where: {
      email,
    },
    update: updateData,
    create: {
      email,
      ...updateData,
    },
  });

  return {
    signup: serializeWaitlistSignup(signup),
    alreadyJoined: Boolean(existing),
  };
}
