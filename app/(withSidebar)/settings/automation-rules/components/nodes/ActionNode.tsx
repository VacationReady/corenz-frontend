import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group",
        selected && "ring-2 ring-green-500 ring-offset-1 rounded-xl"
      )}
    >
      <Card
        className={cn(
          "min-w-[140px] shadow-sm border transition-all cursor-move",
          selected
            ? "border-green-500 shadow-lg scale-105"
            : "border-green-200 hover:border-green-300 hover:shadow-md",
          "bg-gradient-to-br from-green-50 via-white to-green-50/40"
        )}
      >
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-green-100 flex items-center justify-center text-green-600 text-sm">
              {data?.icon || "▶"}
            </div>
            <span className="font-semibold text-[11px] text-green-900 truncate">
              {data?.label ?? "Action"}
            </span>
          </div>
          {data?.description && (
            <p className="text-[10px] leading-snug text-green-700/70 line-clamp-2">
              {data.description}
            </p>
          )}
          {(data?.actionType || data?.config?.actionType) && (
            <Badge
              variant="secondary"
              className="mt-1 text-[9px] bg-green-100 text-green-700 border-green-200 px-1.5 py-0.5"
            >
              {(data.actionType || data.config?.actionType || '').replace(/_/g, " ")}
            </Badge>
          )}
          {data?.config?.subject && (
            <p className="text-[10px] leading-snug text-green-700/70 line-clamp-1 mt-1">
              "{data.config.subject}"
            </p>
          )}
        </div>
        <Handle
          id="in"
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-green-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
        <Handle
          id="out"
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-green-500 border-2 border-white shadow-md transition-transform hover:scale-125"
        />
      </Card>
    </div>
  );
};


