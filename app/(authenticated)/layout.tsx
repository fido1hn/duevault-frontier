import type { ReactNode } from "react";

import { AuthenticatedAppShell } from "@/components/auth/authenticated-app-shell";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
