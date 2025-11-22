"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ICON_OPTIONS, getEventCategoryIcon } from "@/lib/event-category-icons";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface IconPickerProps {
  value?: string | null;
  onChange: (iconKey: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const SelectedIcon = getEventCategoryIcon(value);

  const filteredIcons = ICON_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <SelectedIcon className="h-4 w-4" />
            {value ? ICON_OPTIONS.find(o => o.key === value)?.label || "Custom Icon" : "Select Icon"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
            {filteredIcons.map(({ key, Icon, label }) => (
              <button
                key={key}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md p-2 hover:bg-accent hover:text-accent-foreground",
                  value === key && "bg-accent text-accent-foreground ring-1 ring-ring"
                )}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
            {filteredIcons.length === 0 && (
              <div className="col-span-4 text-center text-sm text-muted-foreground py-4">
                No icons found.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

