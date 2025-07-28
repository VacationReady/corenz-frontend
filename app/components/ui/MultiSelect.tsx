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

  // ✅ Match your backend's "all" value
  const isAllOption =
    placeholder.toLowerCase().includes("department")
      ? { label: "All Departments", value: "all" }
      : { label: "All Job Roles", value: "all" };

  console.log("Options:", options);
  console.log("Selected (values):", selected);

  const toggleValue = (value: string) => {
    console.log("Clicked:", value);
    console.log("Selected before:", selected);

    if (value === isAllOption.value) {
      // ✅ Reset to just "all"
      onChange([isAllOption.value]);
      console.log("Reset to ALL:", [isAllOption.value]);
    } else {
      // ✅ Remove "all" if selecting a specific
      let updated = selected.filter((v) => v !== isAllOption.value);

      if (updated.includes(value)) {
        updated = updated.filter((v) => v !== value);
        console.log("Deselected:", value, "→", updated);
      } else {
        updated = [...updated, value];
        console.log("Added:", value, "→", updated);
      }

      // ✅ If none left, revert to "all"
      if (updated.length === 0) {
        updated = [isAllOption.value];
        console.log("Fallback to ALL:", updated);
      }

      onChange(updated);
      console.log("Selected after:", updated);
    }
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <Menu as="div" className="relative w-full">
      <Menu.Button
        ref={menuButtonRef}
        as={Button}
        variant="ghost"
        className="w-full justify-between border rounded-md"
      >
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
          static
          className="absolute mt-2 w-full rounded-md bg-white border shadow-lg z-[9999] max-h-60 overflow-auto"
        >
          {/* ✅ Render "All" option */}
          <div key={isAllOption.value} className="w-full">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleValue(isAllOption.value);
                menuButtonRef.current?.focus();
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-sm text-left",
                selected.includes(isAllOption.value)
                  ? "bg-gray-50"
                  : "hover:bg-gray-100"
              )}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selected.includes(isAllOption.value) ? "opacity-100" : "opacity-0"
                )}
              />
              {isAllOption.label}
            </button>
          </div>

          {/* ✅ Render department/job role options */}
          {options
            .filter((opt) => opt.value !== isAllOption.value)
            .map((option) => (
              <div key={option.value} className="w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleValue(option.value);
                    menuButtonRef.current?.focus();
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm text-left",
                    selected.includes(option.value)
                      ? "bg-gray-50"
                      : "hover:bg-gray-100"
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