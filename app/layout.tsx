import "./globals.css";
import { ReactNode } from "react";
import Providers from "./components/Providers";
import React from "react";
import { CommandPaletteMount } from "./components/CommandPaletteMount";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen font-sans text-foreground antialiased relative`}>
        {/* Gradient Background Layer */}
        <div className="fixed inset-0 bg-gradient-landscape pointer-events-none z-0" />

        {/* Content Layer */}
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
