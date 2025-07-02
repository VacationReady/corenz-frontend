"use client";

import { Switch as HeadlessSwitch } from "@headlessui/react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full",
        checked ? "bg-blue-600" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </HeadlessSwitch>
  );
}
