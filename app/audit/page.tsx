import type { Metadata } from "next";

import { AuditorPortal } from "@/components/auditor-portal";
import { decodeGrantTokenFromUrl } from "@/features/audit/mappers";
import type { GrantTokenPayload } from "@/features/audit/types";

export const metadata: Metadata = {
  title: "Auditor Portal · DueVault",
  description:
    "Decrypt scoped DueVault invoices using a merchant-issued compliance grant.",
  robots: { index: false, follow: false },
};

type AuditPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

type ParseResult =
  | { token: GrantTokenPayload; tokenWasInUrl: true; decodeFailed: false }
  | { token: null; tokenWasInUrl: true; decodeFailed: true }
  | { token: null; tokenWasInUrl: false; decodeFailed: false };

function parseInitialToken(value: string | string[] | undefined): ParseResult {
  if (typeof value !== "string" || value.length === 0) {
    return { token: null, tokenWasInUrl: false, decodeFailed: false };
  }
  try {
    return {
      token: decodeGrantTokenFromUrl(value) as GrantTokenPayload,
      tokenWasInUrl: true,
      decodeFailed: false,
    };
  } catch {
    return { token: null, tokenWasInUrl: true, decodeFailed: true };
  }
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const { token } = await searchParams;
  const parsed = parseInitialToken(token);

  return (
    <AuditorPortal
      initialToken={parsed.token}
      initialTokenDecodeFailed={parsed.decodeFailed}
    />
  );
}
