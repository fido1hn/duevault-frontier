import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type WaitlistSignupRecord = Prisma.WaitlistSignupGetPayload<object>;

export type UpsertWaitlistSignupRecordInput = {
  email: string;
  name: string | null;
  company: string | null;
  useCase: string | null;
  source: string;
  status: "joined";
};

export async function findWaitlistSignupByEmail(email: string) {
  return db.waitlistSignup.findUnique({
    where: {
      email,
    },
  });
}

export async function upsertWaitlistSignupRecord(
  input: UpsertWaitlistSignupRecordInput,
) {
  return db.waitlistSignup.upsert({
    where: {
      email: input.email,
    },
    update: {
      name: input.name,
      company: input.company,
      useCase: input.useCase,
      source: input.source,
      status: input.status,
    },
    create: input,
  });
}
