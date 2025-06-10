// File: app/documents/layout.tsx
import ClientSidebarWrapper from "@/components/ClientSidebarWrapper";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <ClientSidebarWrapper />
      <main className="flex-1 bg-gray-50 min-h-screen p-6">{children}</main>
    </div>
  );
}
