"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Users, MapPin, Briefcase, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";

interface FilterOption {
  id: string;
  name: string;
}

interface CollapsibleFilterProps {
  title: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function CollapsibleFilter({
  title,
  icon,
  options,
  selectedIds,
  onToggle,
  onClear,
  placeholder = "No options available",
  disabled = false,
  error,
}: CollapsibleFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className={`flex items-center gap-2 text-base font-semibold transition-colors ${
            disabled ? "text-gray-400 cursor-not-allowed" : "hover:text-primary cursor-pointer"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {icon}
          {title}
          {hasSelection && (
            <Badge variant="secondary" className="ml-2">
              {selectedCount} selected
            </Badge>
          )}
        </button>
        {hasSelection && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="ml-6 space-y-2">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
              {error}
            </div>
          )}
          
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">{placeholder}</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {options.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => onToggle(option.id)}
                    disabled={disabled}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      disabled
                        ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-sm" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{option.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
