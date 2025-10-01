import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const iconSize = selected ? "w-6 h-6" : "w-5 h-5";
  return (
    <div
      className={cn(
        "relative group",
        selected && "ring-2 ring-blue-500 ring-offset-1 rounded-xl"
      )}
    >
      <Card
        className={cn(
          "min-w-[140px] shadow-sm border transition-all cursor-move",
          selected
            ? "border-blue-500 shadow-lg scale-105"
            : "border-blue-200 hover:border-blue-300 hover:shadow-md",
          "bg-gradient-to-br from-blue-50 via-white to-blue-50/40"
        )}
      >
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex-shrink-0 rounded-md bg-blue-100 flex items-center justify-center text-blue-600",
                selected ? "w-7 h-7" : "w-6 h-6"
              )}
            >
              {data?.icon || "⚡"}
            </div>
            <span className="font-semibold text-[11px] text-blue-900 truncate">
              {data?.label ?? "Trigger"}
            </span>
          </div>
          {data?.description && (
            <p className="text-[10px] leading-snug text-blue-700/70 line-clamp-2">
              {data.description}
            </p>
          )}
          {data?.config?.triggerType && (
            <Badge
              variant="secondary"
              className="mt-1 text-[9px] bg-blue-100 text-blue-700 border-blue-200 px-1.5 py-0.5"
            >
              {data.config.triggerType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <Handle
          id="out"
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-blue-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
      </Card>
    </div>
  );
};


