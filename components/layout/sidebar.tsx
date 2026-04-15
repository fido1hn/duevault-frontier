"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FileText,
  LayoutDashboard,
  PlusCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";

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
  if (href === "/invoices") return pathname === href || pathname.startsWith("/invoices/");
  return pathname === href;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar px-4 py-4 md:h-screen md:w-64 md:border-r md:border-b-0 md:py-6">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2 md:mb-8">
        <div className="flex size-8 items-center justify-center rounded bg-primary font-serif text-xl font-bold text-primary-foreground">
          D
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-lg font-semibold leading-none text-sidebar-foreground">
            DueVault
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            Private Receivables
          </span>
        </div>
      </Link>

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
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  isActive ? "text-secondary" : "text-sidebar-foreground/50"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-sidebar-border pt-4 md:block">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
            NP
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">
              North Pier Studio
            </span>
            <span className="text-xs text-muted-foreground">Pro Tier</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
