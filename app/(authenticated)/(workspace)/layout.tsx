import { Suspense, type ReactNode } from "react";

import { MerchantProfileProvider } from "@/components/merchant-profile-gate";
import { AppLayout } from "@/components/layout/app-layout";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

function WorkspaceFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading workspace...
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <MerchantProfileProvider>
        <AppLayout>{children}</AppLayout>
      </MerchantProfileProvider>
    </Suspense>
  );
}
