import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[120px] max-w-[180px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-amber-500 shadow-lg shadow-amber-100"
          : "border-amber-300 hover:border-amber-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-amber-400 bg-amber-50 flex items-center justify-center text-amber-600 text-xs">
            {data?.icon || "◆"}
          </div>
          <span className="font-semibold text-[10px] text-amber-900 truncate">
            {data?.label ?? "Condition"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[9px] leading-tight text-amber-700/70 line-clamp-1 pl-6">
            {data.description}
          </p>
        )}
        {(data?.conditionType || data?.config?.conditionType) && (
          <Badge
            variant="secondary"
            className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0 h-4"
          >
            {(data.conditionType || data.config?.conditionType || '').replace(/_/g, " ")}
          </Badge>
        )}
      </div>
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-amber-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-amber-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


