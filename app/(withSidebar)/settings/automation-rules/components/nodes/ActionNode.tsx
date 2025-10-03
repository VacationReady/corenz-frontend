import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[140px] max-w-[220px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-green-500 shadow-lg shadow-green-100"
          : "border-green-300 hover:border-green-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-green-400 bg-green-50 flex items-center justify-center text-green-600 text-xs">
            {data?.icon || "▶"}
          </div>
          <span className="font-semibold text-[10px] text-green-900 truncate">
            {data?.label ?? "Action"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[9px] leading-tight text-green-700/70 line-clamp-1 pl-6">
            {data.description}
          </p>
        )}
        {(data?.actionType || data?.config?.actionType) && (
          <Badge
            variant="secondary"
            className="text-[8px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0 h-4"
          >
            {(data.actionType || data.config?.actionType || '').replace(/_/g, " ")}
          </Badge>
        )}
        {data?.config?.subject && (
          <div className="space-y-0.5">
            <p className="text-[9px] leading-tight text-green-700/70 line-clamp-1 pl-6 italic">
              📧 {data.config.subject}
            </p>
            {data.config.body && (
              <p className="text-[8px] leading-tight text-green-600/60 line-clamp-2 pl-6">
                {data.config.body}
              </p>
            )}
          </div>
        )}
      </div>
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-green-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-green-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


