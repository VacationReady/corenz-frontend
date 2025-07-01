// app/employees/[id]/settings/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";

export default function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const subnav: { href: string; label: string }[] = [];
    // add more settings sections here...
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Settings</h1>
      <nav className="flex space-x-4 mb-6">
        {subnav.map((item) => (
          <Link key={item.href} href={item.href} className="underline">
            {item.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
