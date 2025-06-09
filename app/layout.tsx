import "./globals.css";
import type { Metadata } from "next";
import SessionWrapper from "@/components/SessionWrapper";

export const metadata: Metadata = {
  title: "CoreNZ",
  description: "HR system for NZ businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
