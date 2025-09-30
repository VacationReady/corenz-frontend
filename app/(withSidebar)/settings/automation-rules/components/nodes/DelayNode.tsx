import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn("relative group", selected && "ring-2 ring-purple-500 ring-offset-2 rounded-2xl")}>
      <Card
        className={cn(
          "min-w-[200px] shadow-md border-2 transition-all cursor-move",
          selected ? "border-purple-500 shadow-xl scale-105" : "border-purple-200 hover:border-purple-300 hover:shadow-lg",
          "bg-gradient-to-br from-purple-50 via-white to-purple-50/30",
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              {data?.icon || "⏱"}
            </div>
            <span className="font-semibold text-sm text-purple-900">{data?.label ?? "Delay"}</span>
          </div>
          {data?.config?.days && (
            <p className="text-xs text-purple-700/70">Wait {data.config.days} day{data.config.days !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Handle id="in" type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
        <Handle id="out" type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
      </Card>
    </div>
  );
};


