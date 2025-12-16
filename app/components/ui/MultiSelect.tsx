"use client";

import { Fragment, useRef, useMemo, useState, useEffect } from "react";
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
  selected?: string[];
  value?: string[];
  onChange?: (values: string[]) => void;
  onValueChange?: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  autoOpen?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
  className?: string;
}

export type { MultiSelectProps };

export function MultiSelect({
  options,
  selected,
  value,
  onChange,
  onValueChange,
  placeholder = "Select options...",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search...",
  autoOpen = false,
  includeAllOption = true,
  allOptionLabel,
  allOptionValue = "all",
  className,
}: MultiSelectProps) {
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");

  const resolvedSelected = selected ?? value ?? [];
  const handleChange = onChange ?? onValueChange;

  if (!handleChange) {
    throw new Error("MultiSelect requires an onChange or onValueChange handler");
  }

  useEffect(() => {
    if (!autoOpen) return;
    const button = menuButtonRef.current;
    if (!button) return;
    const isOpen = button.getAttribute("data-headlessui-state")?.includes("open");
    if (isOpen) return;

    const raf = requestAnimationFrame(() => {
      if (!button.isConnected) return;
      button.click();
    });

    return () => cancelAnimationFrame(raf);
  }, [autoOpen]);

  const allOption = useMemo<Option | null>(() => {
    if (!includeAllOption) return null;
    const normalizedPlaceholder = placeholder.toLowerCase();
    const isDepartment = normalizedPlaceholder.includes("department");
    const isJobRole = normalizedPlaceholder.includes("job role") || normalizedPlaceholder.includes("job roles");

    return {
      label: allOptionLabel ?? (isDepartment ? "All Departments" : isJobRole ? "All Job Roles" : "All"),
      value: allOptionValue,
    };
  }, [allOptionLabel, allOptionValue, includeAllOption, placeholder]);

  const fullOptions = useMemo(() => {
    if (!allOption) return options;
    const hasAll = options.some((opt) => opt.value === allOption.value);
    return hasAll ? options : [allOption, ...options];
  }, [options, allOption]);

  const displayedOptions = useMemo(() => {
    if (!searchable) return fullOptions;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return fullOptions;
    return fullOptions.filter((option) => {
      if (allOption && option.value === allOption.value) return true;
      return option.label.toLowerCase().includes(normalizedQuery);
    });
  }, [allOption, fullOptions, query, searchable]);

  const toggleValue = (value: string) => {
    if (disabled) return;

    if (allOption && value === allOption.value) {
      handleChange([allOption.value]);
      return;
    }

    let updated = allOption
      ? resolvedSelected.filter((v) => v !== allOption.value)
      : [...resolvedSelected];

    if (updated.includes(value)) {
      updated = updated.filter((v) => v !== value);
    } else {
      updated = [...updated, value];
    }

    if (allOption && updated.length === 0) {
      updated = [allOption.value];
    }

    handleChange(updated);
  };

  // ✅ Map selected values to display labels
  const selectedLabels = fullOptions
    .filter((opt) => resolvedSelected.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <Menu as="div" className={cn("relative w-full", className)}>
      <Menu.Button
        ref={menuButtonRef}
        as={Button}
        type="button"
        variant="ghost"
        disabled={disabled}
        className={cn(
          "w-full justify-between border rounded-md",
          disabled && "opacity-50 cursor-not-allowed"
        )}
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
        afterLeave={() => setQuery("")}
      >
        <Menu.Items
          static
          className="absolute mt-2 w-full rounded-md bg-white border shadow-lg z-[9999]"
        >
          {searchable && (
            <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
          <div className="max-h-60 overflow-auto">
            {displayedOptions.length > 0 ? (
              displayedOptions.map((option) => (
                <div key={option.value} className="w-full">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleValue(option.value);
                      menuButtonRef.current?.focus(); // ✅ Keep dropdown open
                    }}
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-sm text-left",
                      disabled && "opacity-50 cursor-not-allowed",
                      resolvedSelected.includes(option.value)
                        ? "bg-gray-50"
                        : "hover:bg-gray-100",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        resolvedSelected.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.label}
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
