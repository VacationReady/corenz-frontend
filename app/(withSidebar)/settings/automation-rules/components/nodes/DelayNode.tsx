import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[110px] max-w-[180px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-purple-500 shadow-lg shadow-purple-100"
          : "border-purple-300 hover:border-purple-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-purple-400 bg-purple-50 flex items-center justify-center text-purple-600">
            {data?.icon || <Clock className="w-3 h-3" />}
          </div>
          <span className="font-semibold text-[10px] text-purple-900 truncate">
            {data?.label ?? "Delay"}
          </span>
        </div>
        {data?.config?.days && (
          <p className="text-[9px] leading-tight text-purple-700/70 pl-6">
            Wait {data.config.days} day{data.config.days !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-purple-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-purple-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


