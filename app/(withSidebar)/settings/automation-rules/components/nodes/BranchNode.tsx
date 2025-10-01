import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const BranchNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card
      className={cn(
        "min-w-[120px] shadow-sm border transition-all cursor-move",
        selected
          ? "border-pink-500 shadow-lg scale-105"
          : "border-pink-200 hover:border-pink-300 hover:shadow-md",
        "bg-gradient-to-br from-pink-50 via-white to-pink-50/40"
      )}
    >
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-shrink-0 w-6 h-6 rounded-md bg-pink-100 flex items-center justify-center text-pink-600 text-sm">
            {data?.icon}
          </div>
          <span className="font-medium text-[11px] text-pink-900 truncate">
            {data?.label ?? "Branch"}
          </span>
        </div>
        {data?.description && (
          <p className="text-[10px] leading-snug text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-pink-500 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-pink-500 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
    </Card>
  );
};


