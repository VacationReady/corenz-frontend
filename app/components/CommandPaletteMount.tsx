"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getNavItemsForRole } from "@/lib/nav-config";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPaletteMount() {
  const [open, setOpen] = React.useState(false);
  const [recent, setRecent] = React.useState<Array<{ label: string; href: string }>>([]);
  const { data: session } = useSession();
  const role = (session?.user?.role as any) ?? undefined;
  const router = useRouter();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const handleToggle = () => setOpen((v) => !v);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("command-palette:open", handleOpen);
    window.addEventListener("command-palette:close", handleClose);
    window.addEventListener("command-palette:toggle", handleToggle);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("command-palette:open", handleOpen);
      window.removeEventListener("command-palette:close", handleClose);
      window.removeEventListener("command-palette:toggle", handleToggle);
    };
  }, []);

  // Track recent pages in localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("recent-pages");
      if (stored) setRecent(JSON.parse(stored));
    } catch {}
  }, []);

  const pushAndRemember = React.useCallback((href: string, label?: string) => {
    setOpen(false);
    router.push(href);
    try {
      const next = [{ label: label ?? href, href }, ...recent.filter((r) => r.href !== href)].slice(0, 5);
      setRecent(next);
      localStorage.setItem("recent-pages", JSON.stringify(next));
    } catch {}
  }, [recent, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative mt-20 w-full max-w-xl rounded-xl border bg-popover text-popover-foreground shadow-glass">
        <Command>
          <CommandInput placeholder="Search or jump to…" autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {getNavItemsForRole(role)?.map((item) => (
                <CommandItem key={item.href} onSelect={() => pushAndRemember(item.href, item.label)}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => pushAndRemember("/employees/new", "Add employee")}>Add employee</CommandItem>
              <CommandItem onSelect={() => pushAndRemember("/documents/new", "Upload document")}>
                Upload document
              </CommandItem>
            </CommandGroup>
            {recent.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent">
                  {recent.map((r) => (
                    <CommandItem key={r.href} onSelect={() => pushAndRemember(r.href, r.label)}>
                      {r.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
