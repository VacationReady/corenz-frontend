import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export const BranchNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={cn(
        "relative group min-w-[110px] max-w-[180px]",
        "bg-white rounded-lg border-2 transition-all cursor-move",
        selected
          ? "border-pink-500 shadow-lg shadow-pink-100"
          : "border-pink-300 hover:border-pink-400 hover:shadow-md"
      )}
    >
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-5 h-5 rounded border border-pink-400 bg-pink-50 flex items-center justify-center text-pink-600">
            {data?.icon || <GitBranch className="w-3 h-3" />}
          </div>
          <span className="font-semibold text-[10px] text-pink-900 truncate">
            {data?.label ?? "Branch"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[9px] leading-tight text-pink-700/70 line-clamp-1 pl-6">
            {data.description}
          </p>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-pink-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-pink-500 border-2 border-white shadow-sm transition-transform hover:scale-125"
      />
    </div>
  );
};


