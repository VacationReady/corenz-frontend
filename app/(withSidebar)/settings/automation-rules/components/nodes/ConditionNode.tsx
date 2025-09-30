import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn("relative group", selected && "ring-2 ring-amber-500 ring-offset-2 rounded-2xl")}>
      <Card
        className={cn(
          "min-w-[220px] shadow-md border-2 transition-all cursor-move",
          selected ? "border-amber-500 shadow-xl scale-105" : "border-amber-200 hover:border-amber-300 hover:shadow-lg",
          "bg-gradient-to-br from-amber-50 via-white to-amber-50/30",
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              {data?.icon || "◆"}
            </div>
            <span className="font-semibold text-sm text-amber-900">{data?.label ?? "Condition"}</span>
          </div>
          {data?.description && (
            <p className="text-xs text-amber-700/70 leading-relaxed">{data.description}</p>
          )}
          {data?.conditionType && (
            <Badge variant="secondary" className="mt-2 text-xs bg-amber-100 text-amber-700 border-amber-200">
              {data.conditionType.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <Handle id="in" type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
        <Handle id="out" type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white shadow-md transition-transform hover:scale-125" />
      </Card>
    </div>
  );
};


