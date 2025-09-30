import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card
      className={cn(
        "min-w-[200px] shadow-sm border-2 transition-all",
        selected ? "border-purple-500 shadow-lg" : "border-purple-200",
        "bg-gradient-to-br from-purple-50 to-white",
      )}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {data?.icon}
          <span className="font-medium text-sm">{data?.label ?? "Delay"}</span>
        </div>
        {data?.description && (
          <p className="text-xs text-muted-foreground">{data.description}</p>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-purple-500" />
    </Card>
  );
};


