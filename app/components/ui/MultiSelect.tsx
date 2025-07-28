"use client";

import { Fragment, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const isAllLabel = placeholder.includes("Department")
    ? "All Departments"
    : "All Job Roles";

  const toggleValue = (value: string) => {
  const isAll = value === isAllLabel;

  if (isAll) {
    // If "All Departments" is clicked, reset to just that
    onChange([isAllLabel]);
  } else {
    // Start by removing "All Departments" if present
    let updated = selected.filter((v) => v !== isAllLabel);

    if (updated.includes(value)) {
      // Deselect value
      updated = updated.filter((v) => v !== value);
    } else {
      // Add value
      updated = [...updated, value];
    }

    // If no specific values left, default back to "All Departments"
    if (updated.length === 0) {
      updated = [isAllLabel];
    }

    onChange(updated);
  }
};

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <Menu as="div" className="relative w-full">
      <Menu.Button ref={menuButtonRef} as={Button} variant="ghost" className="w-full justify-between border rounded-md">
        <div className="flex flex-wrap gap-1">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label) => (
              <Badge key={label} className="text-xs">
                {label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          static // ✅ Keeps dropdown open
          className="absolute mt-2 w-full rounded-md bg-white border shadow-lg z-[9999] max-h-60 overflow-auto"
        >
          {options.map((option) => (
            <div key={option.value} className="w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleValue(option.value);
                  // ✅ Refocus button so dropdown stays open
                  menuButtonRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm text-left",
                  selected.includes(option.value) ? "bg-gray-50" : "hover:bg-gray-100"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </button>
            </div>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
