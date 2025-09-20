import "./globals.css";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "./components/ErrorBoundary";
import ChunkErrorHandler from "./components/ChunkErrorHandler";
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
          <ErrorBoundary>
            <ChunkErrorHandler />
            <SessionProvider>{children}</SessionProvider>
          </ErrorBoundary>
        </div>

        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: "shadow-glass border-glass rounded-2xl",
            style: {
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(16px)",
              color: "hsl(var(--card-foreground))",
              border: "1px solid rgba(255, 255, 255, 0.4)",
            },
          }}
        />

        {/* Command Palette (Cmd/Ctrl+K) */}
        <CommandPaletteMount />
      </body>
    </html>
  );
}
