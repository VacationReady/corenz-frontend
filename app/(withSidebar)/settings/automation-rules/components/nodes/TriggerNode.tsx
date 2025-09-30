import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn("relative group", selected && "ring-2 ring-blue-500 ring-offset-2 rounded-2xl")}>
      <Card
        className={cn(
          "min-w-[220px] shadow-md border-2 transition-all cursor-move",
          selected ? "border-blue-500 shadow-xl scale-105" : "border-blue-200 hover:border-blue-300 hover:shadow-lg",
          "bg-gradient-to-br from-blue-50 via-white to-blue-50/30",
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              {data?.icon || "⚡"}
            </div>
            <span className="font-semibold text-sm text-blue-900">{data?.label ?? "Trigger"}</span>
          </div>
          {data?.description && (
            <p className="text-xs text-blue-700/70 leading-relaxed">{data.description}</p>
          )}
          {data?.config?.triggerType && (
            <Badge variant="secondary" className="mt-2 text-xs bg-blue-100 text-blue-700 border-blue-200">
              {data.config.triggerType.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <Handle 
          id="out" 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md transition-transform hover:scale-125" 
        />
      </Card>
    </div>
  );
};


