// File: app/layout.tsx
export const metadata = {
  title: 'CoreNZ',
  description: 'HR platform for New Zealand businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
