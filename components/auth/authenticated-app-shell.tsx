"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";

import { AppPrivyProvider } from "@/components/providers/privy-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import {
  buildHomeRedirectPath,
  buildSafeCurrentPath,
} from "@/features/auth/routing";

type AuthenticatedAppShellProps = {
  children: ReactNode;
};

function FullscreenStatus({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-8 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Loader2 className="size-5 animate-spin" />
        </div>
        <h1 className="mt-6 font-serif text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

function AuthenticatedRouteGate({
  children,
}: AuthenticatedAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, ready } = usePrivy();
  const currentPath = buildSafeCurrentPath(pathname, searchParams.toString());

  useEffect(() => {
    if (!ready || authenticated) {
      return;
    }

    router.replace(buildHomeRedirectPath(currentPath));
  }, [authenticated, currentPath, ready, router]);

  if (!ready) {
    return (
      <FullscreenStatus
        title="Loading workspace"
        body="Preparing your DueVault workspace."
      />
    );
  }

  if (!authenticated) {
    return (
      <FullscreenStatus
        title="Loading workspace"
        body="Returning to the homepage so you can sign in."
      />
    );
  }

  return children;
}

export function AuthenticatedAppShell({
  children,
}: AuthenticatedAppShellProps) {
  return (
    <AppPrivyProvider>
      <AppQueryProvider>
        <Suspense
          fallback={
            <FullscreenStatus
              title="Loading workspace"
              body="Preparing your DueVault workspace."
            />
          }
        >
          <AuthenticatedRouteGate>{children}</AuthenticatedRouteGate>
        </Suspense>
      </AppQueryProvider>
    </AppPrivyProvider>
  );
}
