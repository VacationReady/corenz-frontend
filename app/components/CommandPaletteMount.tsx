"use client";
import React from "react";
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
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/employees";
                }}
              >
                Employees
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/documents";
                }}
              >
                Documents
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/reports";
                }}
              >
                Reports
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/news";
                }}
              >
                News
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/settings";
                }}
              >
                Settings
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/employees/new";
                }}
              >
                Add employee
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = "/documents/new";
                }}
              >
                Upload document
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
