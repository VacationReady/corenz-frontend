import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group",
        selected && "ring-2 ring-purple-500 ring-offset-1 rounded-xl"
      )}
    >
      <Card
        className={cn(
          "min-w-[130px] shadow-sm border transition-all cursor-move",
          selected
            ? "border-purple-500 shadow-lg scale-105"
            : "border-purple-200 hover:border-purple-300 hover:shadow-md",
          "bg-gradient-to-br from-purple-50 via-white to-purple-50/40"
        )}
      >
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-purple-600 text-sm">
              {data?.icon || "⏱"}
            </div>
            <span className="font-semibold text-[11px] text-purple-900 truncate">
              {data?.label ?? "Delay"}
            </span>
          </div>
          {data?.config?.days && (
            <p className="text-[10px] leading-snug text-purple-700/70">
              Wait {data.config.days} day{data.config.days !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Handle
          id="in"
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-purple-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
        <Handle
          id="out"
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-purple-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
      </Card>
    </div>
  );
};


