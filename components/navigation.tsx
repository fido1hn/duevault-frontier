import Link from "next/link";
import { WalletButton } from "@/components/wallet-button";
import { BRAND_NAME, BRAND_TAGLINES } from "@/lib/brand";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/get-paid",
    label: "Get Paid",
  },
  {
    href: "/activity",
    label: "Activity",
  },
];

export function Navigation() {
  return (
    <header className="site-header">
      <div className="brand">
        <Link href="/" className="brand-link">
          {BRAND_NAME}
        </Link>
        <span className="brand-tag">{BRAND_TAGLINES[0]}</span>
      </div>

      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="nav-link">
            {item.label}
          </Link>
        ))}
      </nav>

      <WalletButton />
    </header>
  );
}
