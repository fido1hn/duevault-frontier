import type { Metadata } from "next";
import "@/app/globals.css";
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
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
