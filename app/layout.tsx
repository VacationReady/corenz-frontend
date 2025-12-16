import "./globals.css";
import { ReactNode } from "react";
import Providers from "./components/Providers";
import { Inter } from "next/font/google";
import { AppBody } from "./components/AppBody";
import { getTenantPalette } from "./lib/tenant-theme-config";
// Validate environment variables at startup - will throw if invalid
import "@/lib/env.server";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const DEFAULT_TENANT_ID = "default";
const DEFAULT_PALETTE = getTenantPalette(DEFAULT_TENANT_ID);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <Providers initialTenantId={DEFAULT_TENANT_ID} initialPalette={DEFAULT_PALETTE}>
        <AppBody fontClassName={inter.className}>{children}</AppBody>
      </Providers>
    </html>
  );
}
