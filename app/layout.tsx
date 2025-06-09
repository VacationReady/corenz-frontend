import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata = {
  title: "CoreNZ",
  description: "HR system for NZ businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
