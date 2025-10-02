import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export const LoopNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[110px] max-w-[180px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-sky-500 shadow-lg shadow-sky-100"
          : "border-sky-300 hover:border-sky-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-sky-400 bg-sky-50 flex items-center justify-center text-sky-600 text-xs">
            {data?.icon}
          </div>
          <span className="font-semibold text-[10px] text-sky-900 truncate">
            {data?.label ?? "Loop"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[9px] leading-tight text-sky-700/70 line-clamp-1 pl-6">
            {data.description}
          </p>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-sky-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-sky-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


