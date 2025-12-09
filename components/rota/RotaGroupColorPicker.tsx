"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ROTA_GROUP_COLORS } from "@/lib/rota-group-icons";
import { Palette, Check } from "lucide-react";

interface RotaGroupColorPickerProps {
  value?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function RotaGroupColorPicker({ value, onChange, disabled }: RotaGroupColorPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedColor = value || ROTA_GROUP_COLORS[0].value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-12 justify-center gap-2"
          disabled={disabled}
        >
          <div 
            className="w-6 h-6 rounded-md shadow-sm"
            style={{ backgroundColor: selectedColor }}
          />
          <Palette className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Choose a color</p>
          <div className="grid grid-cols-7 gap-2">
            {ROTA_GROUP_COLORS.map(({ value: colorValue, label }) => (
              <button
                key={colorValue}
                className={cn(
                  "w-9 h-9 rounded-lg transition-all relative hover:scale-110",
                  value === colorValue && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                )}
                style={{ backgroundColor: colorValue }}
                onClick={() => {
                  onChange(colorValue);
                  setOpen(false);
                }}
                title={label}
              >
                {value === colorValue && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
