// app/layout.tsx
import "./globals.css"; // Add if using Tailwind base styles
import { ReactNode } from "react";

export const metadata = {
  title: "CoreNZ",
  description: "HR platform for NZ businesses",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100">
        {children}
      </body>
    </html>
  );
}
