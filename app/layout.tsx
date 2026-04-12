import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "@/app/globals.css";
import { Navigation } from "@/components/navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION,
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="font-sans">
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
