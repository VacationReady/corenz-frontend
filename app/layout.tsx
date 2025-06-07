// File: app/layout.tsx
import '../globals.css';

export const metadata = {
  title: 'CoreNZ',
  description: 'HR platform for New Zealand businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
