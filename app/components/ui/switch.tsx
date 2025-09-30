"use client";

import * as React from "react";
import { Switch as HeadlessSwitch } from "@headlessui/react";
import { cn } from "@/lib/utils";

interface HeadlessSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onChange,
  onCheckedChange,
  className,
  disabled = false,
}: HeadlessSwitchProps) {
  const handleChange = onChange ?? onCheckedChange ?? (() => {});
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        checked ? "bg-primary" : "bg-input",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-1",
        )}
      />
    </HeadlessSwitch>
  );
}
