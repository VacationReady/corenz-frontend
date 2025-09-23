import React from "react";
import { cn } from "@/lib/utils";

interface LegendItem {
  label: string;
  swatchClassName?: string;
  swatchStyle?: React.CSSProperties;
}

interface CalendarLegendProps {
  categories: LegendItem[];
  showBankHoliday?: boolean;
  bankHolidayLabel?: string | null;
  showBlackout?: boolean;
}

export function CalendarLegend({
  categories,
  showBankHoliday = false,
  bankHolidayLabel,
  showBlackout = true,
}: CalendarLegendProps) {
  if (
    categories.length === 0 &&
    !showBankHoliday &&
    !showBlackout
  ) {
    return null;
  }

  const items: LegendItem[] = [...categories];

  if (showBankHoliday) {
    items.push({
      label: bankHolidayLabel ? `Public holiday (${bankHolidayLabel})` : "Public holiday",
      swatchClassName: "bg-emerald-500",
    });
  }

  if (showBlackout) {
    items.push({
      label: "Blackout day",
      swatchStyle: {
        backgroundImage:
          "repeating-linear-gradient(45deg,#fecaca,#fecaca 4px,#ffffff 4px,#ffffff 8px)",
        border: "1px solid rgb(248 113 113)",
      },
    });
  }

  return (
    <div className="px-4 pb-2">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {items.map((item) => (
          <div key={item.label} className="inline-flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-3 w-3 shrink-0 rounded-sm border border-border",
                item.swatchClassName,
              )}
              style={item.swatchStyle}
            />
            <span className="font-medium text-foreground/80">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
