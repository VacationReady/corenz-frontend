"use client";

import "./globals.css";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-app-background min-h-screen font-sans text-foreground antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>

        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: 'shadow-enterprise border-enhanced',
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            }
          }}
        />
      </body>
    </html>
  );
}
