"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings, Route, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyModeToggleProps {
  mode: "automation" | "journey";
  onModeChange: (mode: "automation" | "journey") => void;
  disabled?: boolean;
}

export function JourneyModeToggle({ mode, onModeChange, disabled = false }: JourneyModeToggleProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleModeChange = (newMode: "automation" | "journey") => {
    if (disabled) return;
    
    if (hasUnsavedChanges) {
      // In a real implementation, you'd show a confirmation dialog
      // For now, we'll just proceed
    }
    
    onModeChange(newMode);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
        {/* Mode Indicators */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange("automation")}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              mode === "automation"
                ? "bg-blue-100 text-blue-900 border border-blue-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Automation Mode</span>
            {mode === "automation" && (
              <Badge variant="secondary" className="ml-1 text-xs">
                Current
              </Badge>
            )}
          </button>

          <div className="w-px h-6 bg-gray-300" />

          <button
            onClick={() => handleModeChange("journey")}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              mode === "journey"
                ? "bg-purple-100 text-purple-900 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Route className="w-4 h-4" />
            <span>Journey Mode</span>
            {mode === "journey" && (
              <div className="flex items-center gap-1 ml-1">
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
                <Sparkles className="w-3 h-3 text-purple-600" />
              </div>
            )}
          </button>
        </div>

        {/* Info Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <div>
                <strong>Automation Mode:</strong> Traditional workflow builder with triggers, conditions, and actions.
              </div>
              <div>
                <strong>Journey Mode:</strong> AI-powered journey designer for end-to-end employee lifecycle programs.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Unsaved Changes Indicator */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1 text-amber-600">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Unsaved</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
