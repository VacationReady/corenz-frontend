import "./globals.css";
import { ReactNode } from "react";
import Providers from "./components/Providers";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AppBody } from "./components/AppBody";
import { getTenantPalette } from "./lib/tenant-theme-config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const tenantId = headerList.get("x-company-id") ?? "default";
  const palette = getTenantPalette(tenantId);

  return (
    <html lang="en">
      <Providers initialTenantId={tenantId} initialPalette={palette}>
        <AppBody fontClassName={inter.className}>{children}</AppBody>
      </Providers>
    </html>
  );
}
