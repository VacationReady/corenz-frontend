"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface MenuItem {
    href: string;
    label: string;
}

export default function EmployeeNavClient({ menu }: { menu: MenuItem[] }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (pathname?.endsWith("/performance")) {
            setCollapsed(true);
        }
    }, [pathname]);

    return (
        <div className={collapsed ? "w-10" : "w-60"}>
            <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className="mb-3 flex h-8 w-full items-center justify-between rounded-lg bg-glass-subtle px-2 text-xs font-medium text-foreground hover:bg-glass-strong"
            >
                <span>{collapsed ? "Open profile navigation" : "Hide profile navigation"}</span>
                <span className="text-lg leading-none">{collapsed ? ">" : "<"}</span>
            </button>
            {!collapsed && (
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
            )}
        </div>
    );
}
