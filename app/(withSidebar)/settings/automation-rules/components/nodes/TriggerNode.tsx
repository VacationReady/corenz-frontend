import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[120px] max-w-[180px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-blue-500 shadow-lg shadow-blue-100"
          : "border-blue-300 hover:border-blue-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-blue-400 bg-blue-50 flex items-center justify-center text-blue-600 text-xs">
            {data?.icon || "⚡"}
          </div>
          <span className="font-semibold text-[10px] text-blue-900 truncate">
            {data?.label ?? "Trigger"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[9px] leading-tight text-blue-700/70 line-clamp-1 pl-6">
            {data.description}
          </p>
        )}
        {(data?.triggerType || data?.config?.triggerType) && (
          <Badge
            variant="secondary"
            className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0 h-4"
          >
            {(data.triggerType || data.config?.triggerType || '').replace(/_/g, " ")}
          </Badge>
        )}
      </div>
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-blue-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


