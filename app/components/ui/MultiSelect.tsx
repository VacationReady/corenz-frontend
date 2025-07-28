"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Button from "@/components/ui/Button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

type Option = { label: string; value: string };

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allLabel?: string; // e.g., "All Departments" or "All Job Roles"
}

export function MultiSelect({ options, selected, onChange, placeholder, allLabel }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const allValue = "ALL";
  const isAllSelected = selected.includes(allValue);

  const toggleOption = (value: string) => {
    if (value === allValue) {
      // Selecting "All" clears others and sets "ALL"
      onChange(isAllSelected ? [] : [allValue]);
    } else {
      // If "All" is currently selected, clear it first
      const updated = isAllSelected
        ? [value]
        : selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      onChange(updated);
    }
  };

  const displayedText = isAllSelected
    ? allLabel || "All Selected"
    : selected.length > 0
    ? `${selected.length} selected`
    : placeholder || "Select options";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} className="w-full justify-between border rounded-md">
          {displayedText}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[9999] bg-white border shadow-md rounded-md">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            {/* ✅ "All" Option */}
            <CommandItem
              key={allValue}
              value={allValue}
              onSelect={() => toggleOption(allValue)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{allLabel || "All"}</span>
              {isAllSelected && <Check className="h-4 w-4 text-primary" />}
            </CommandItem>

            {/* ✅ Actual options */}
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.value}
                onSelect={() => toggleOption(opt.value)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{opt.label}</span>
                {!isAllSelected && selected.includes(opt.value) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
