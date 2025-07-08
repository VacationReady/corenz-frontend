"use client";

import * as React from "react";
import { Switch as HeadlessSwitch } from "@headlessui/react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean; // ✅ added
}

export function Switch({ checked, onChange, className, disabled = false }: SwitchProps) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled} // ✅ passed to HeadlessSwitch
      className={cn(
        "relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        checked ? "bg-blue-600" : "bg-gray-300",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </HeadlessSwitch>
  );
}
