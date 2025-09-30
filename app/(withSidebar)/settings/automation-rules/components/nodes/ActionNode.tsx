import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn("relative group", selected && "ring-2 ring-green-500 ring-offset-2 rounded-2xl")}>
      <Card
        className={cn(
          "min-w-[220px] shadow-md border-2 transition-all cursor-move",
          selected ? "border-green-500 shadow-xl scale-105" : "border-green-200 hover:border-green-300 hover:shadow-lg",
          "bg-gradient-to-br from-green-50 via-white to-green-50/30",
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              {data?.icon || "▶"}
            </div>
            <span className="font-semibold text-sm text-green-900">{data?.label ?? "Action"}</span>
          </div>
          {data?.description && (
            <p className="text-xs text-green-700/70 leading-relaxed">{data.description}</p>
          )}
          {data?.actionType && (
            <Badge variant="secondary" className="mt-2 text-xs bg-green-100 text-green-700 border-green-200">
              {data.actionType.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <Handle id="in" type="target" position={Position.Top} className="w-3 h-3 bg-green-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
        <Handle id="out" type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
      </Card>
    </div>
  );
};


