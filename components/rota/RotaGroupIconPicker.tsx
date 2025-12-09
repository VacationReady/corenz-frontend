"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ROTA_GROUP_ICON_OPTIONS, getRotaGroupIcon } from "@/lib/rota-group-icons";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface RotaGroupIconPickerProps {
  value?: string | null;
  onChange: (iconKey: string) => void;
  disabled?: boolean;
  color?: string;
}

export function RotaGroupIconPicker({ value, onChange, disabled, color }: RotaGroupIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const SelectedIcon = getRotaGroupIcon(value);

  const filteredIcons = ROTA_GROUP_ICON_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-12 justify-center"
          disabled={disabled}
          style={{
            backgroundColor: color ? `${color}15` : undefined,
            borderColor: color ? `${color}40` : undefined,
          }}
        >
          <SelectedIcon 
            className="h-6 w-6" 
            style={{ color: color || '#3B82F6' }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-6 gap-1.5 max-h-[280px] overflow-y-auto p-1">
            {filteredIcons.map(({ key, Icon, label }) => (
              <button
                key={key}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg p-2.5 hover:bg-accent hover:text-accent-foreground transition-all",
                  value === key && "bg-accent text-accent-foreground ring-2 ring-ring"
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
              <div className="col-span-6 text-center text-sm text-muted-foreground py-6">
                No icons found.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
