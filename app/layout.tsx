import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "@/app/globals.css";
import { Navigation } from "@/components/navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION,
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <AppProviders>
          <div className="app-shell">
            <Navigation />
            <main className="page-wrap">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
