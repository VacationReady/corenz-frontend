"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DATE_PRESET_OPTIONS,
  RELATIVE_PRESET_OPTIONS,
  calculateDateRange,
  describeRange,
  getDefaultRelativeAmount,
  type DatePresetKey,
  type DatePresetSelection,
  type RelativePresetKey,
} from "@/lib/reportingDatePresets";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DatePresetSelectorProps {
  value?: DatePresetSelection;
  onChange: (selection: DatePresetSelection) => void;
  onRangeComputed?: (range: { start?: string; end?: string }) => void;
  timeZone: string;
  locale?: string;
}

function groupPresets() {
  const groups = new Map<string, typeof DATE_PRESET_OPTIONS>();
  for (const option of DATE_PRESET_OPTIONS) {
    if (!groups.has(option.group)) {
      groups.set(option.group, []);
    }
    groups.get(option.group)!.push(option);
  }
  return Array.from(groups.entries());
}

export function DatePresetSelector({
  value,
  onChange,
  onRangeComputed,
  timeZone,
  locale,
}: DatePresetSelectorProps) {
  const [relativeAmountInput, setRelativeAmountInput] = useState(() =>
    String(getDefaultRelativeAmount(value)),
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const groupedPresets = useMemo(() => groupPresets(), []);

  useEffect(() => {
    if (value?.type === "relative") {
      setRelativeAmountInput(String(getDefaultRelativeAmount(value)));
    }
  }, [value]);

  useEffect(() => {
    if (!value) return;
    const range = calculateDateRange(value, { timeZone });
    onRangeComputed?.({
      start: range.start ? range.start.toISOString() : undefined,
      end: range.end ? range.end.toISOString() : undefined,
    });
  }, [value, timeZone, onRangeComputed]);

  const applySelection = (selection: DatePresetSelection) => {
    onChange(selection);
  };

  const handlePresetClick = (key: DatePresetKey) => {
    applySelection({ type: "preset", key });
  };

  const parseRelativeAmount = (raw: string): number | null => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInputError("Enter a positive whole number");
      return null;
    }
    setInputError(null);
    return Math.floor(parsed);
  };

  const handleRelativeClick = (key: RelativePresetKey) => {
    const amount = parseRelativeAmount(relativeAmountInput);
    if (!amount) return;
    applySelection({ type: "relative", key, amount });
  };

  const onRelativeAmountChange = (next: string) => {
    setRelativeAmountInput(next);
    if (value?.type === "relative") {
      const parsed = parseRelativeAmount(next);
      if (parsed) {
        applySelection({ type: "relative", key: value.key, amount: parsed });
      }
    }
  };

  const activeKey = value?.type === "preset" ? value.key : undefined;
  const activeRelative = value?.type === "relative" ? value.key : undefined;

  const summary = value
    ? describeRange(value, { timeZone, locale })
    : "Choose a preset to calculate a range";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {groupedPresets.map(([group, options]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{group}</p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const presetSelection: DatePresetSelection = {
                  type: "preset",
                  key: option.key,
                } as DatePresetSelection;
                const tooltip = describeRange(presetSelection, { timeZone, locale });
                const isActive = activeKey === option.key;
                return (
                  <Tooltip key={option.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handlePresetClick(option.key)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition",
                          isActive
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-transparent bg-muted hover:bg-muted/80",
                        )}
                      >
                        {option.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Relative ranges</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="relative-amount">
                Days
              </label>
              <input
                id="relative-amount"
                type="number"
                min={1}
                inputMode="numeric"
                value={relativeAmountInput}
                onChange={(event) => onRelativeAmountChange(event.target.value)}
                className="w-20 rounded-md border border-input px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {inputError && (
              <p className="text-xs text-red-600">{inputError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {RELATIVE_PRESET_OPTIONS.map((option) => (
                <Tooltip key={option.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleRelativeClick(option.key)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition",
                        activeRelative === option.key
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-transparent bg-muted hover:bg-muted/80",
                      )}
                    >
                      {option.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-pretty">{option.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Current range</p>
          <p className="mt-1 leading-relaxed">{summary}</p>
          <p className="mt-1">Times are calculated in {timeZone}.</p>
        </div>
      </div>
    </TooltipProvider>
  );
}

