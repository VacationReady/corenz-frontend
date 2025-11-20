"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
    href: string;
    label: string;
}

export default function EmployeeNavClient({ menu }: { menu: MenuItem[] }) {
    const pathname = usePathname();

    return (
        <nav className="space-y-1">
            {menu.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-glass ${isActive
                                ? "glass-strong text-primary shadow-depth-1"
                                : "text-foreground hover:glass-subtle"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
