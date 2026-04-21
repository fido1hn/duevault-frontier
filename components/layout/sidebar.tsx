"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "New Invoice", href: "/invoices/new", icon: PlusCircle },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Proofs", href: "/proofs", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/invoices")
    return pathname === href || pathname.startsWith("/invoices/");
  return pathname === href;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = usePrivy();
  const { profile } = useMerchantProfile();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initials = profile.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  async function handleLogout() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await logout();
      queryClient.clear();
      router.replace("/");
    } catch {
      setIsSigningOut(false);
      toast.error("Unable to sign out. Please try again.");
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar px-4 py-4 md:h-screen md:w-64 md:border-r md:border-b-0 md:py-6">
      <div className="mb-4 flex items-center justify-between gap-3 px-2 md:mb-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary font-serif text-xl font-bold text-primary-foreground">
            D
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="font-serif text-lg font-semibold leading-none text-sidebar-foreground">
              DueVault
            </span>
            <span className="mt-1 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              Private Receivables
            </span>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Sign out"
          disabled={isSigningOut}
          onClick={() => void handleLogout()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:pointer-events-none disabled:opacity-60 md:hidden">
          {isSigningOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
        {navigation.map((item) => {
          const isActive = isRouteActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary/10 font-semibold text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}>
              <Icon
                className={cn(
                  "size-4",
                  isActive ? "text-secondary" : "text-sidebar-foreground/50",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-sidebar-border pt-4 md:block">
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleLogout()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:pointer-events-none disabled:opacity-60">
          {isSigningOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
