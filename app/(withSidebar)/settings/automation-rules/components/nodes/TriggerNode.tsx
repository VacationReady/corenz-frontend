import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <Card
      className={cn(
        "min-w-[200px] shadow-sm border-2 transition-all",
        selected ? "border-blue-500 shadow-lg" : "border-blue-200",
        "bg-gradient-to-br from-blue-50 to-white",
      )}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {data?.icon}
          <span className="font-medium text-sm">{data?.label ?? "Trigger"}</span>
        </div>
        {data?.description && (
          <p className="text-xs text-muted-foreground">{data.description}</p>
        )}
        {data?.config?.triggerType && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {data.config.triggerType}
          </Badge>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
    </Card>
  );
};


