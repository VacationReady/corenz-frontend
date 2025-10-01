import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group",
        selected && "ring-2 ring-amber-500 ring-offset-1 rounded-xl"
      )}
    >
      <Card
        className={cn(
          "min-w-[140px] shadow-sm border transition-all cursor-move",
          selected
            ? "border-amber-500 shadow-lg scale-105"
            : "border-amber-200 hover:border-amber-300 hover:shadow-md",
          "bg-gradient-to-br from-amber-50 via-white to-amber-50/40"
        )}
      >
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 text-sm">
              {data?.icon || "◆"}
            </div>
            <span className="font-semibold text-[11px] text-amber-900 truncate">
              {data?.label ?? "Condition"}
            </span>
          </div>
          {data?.description && (
            <p className="text-[10px] leading-snug text-amber-700/70 line-clamp-2">
              {data.description}
            </p>
          )}
          {data?.conditionType && (
            <Badge
              variant="secondary"
              className="mt-1 text-[9px] bg-amber-100 text-amber-700 border-amber-200 px-1.5 py-0.5"
            >
              {data.conditionType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <Handle
          id="in"
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-amber-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
        <Handle
          id="out"
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-amber-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
      </Card>
    </div>
  );
};


