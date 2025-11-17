import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  
  return (
    <div
      className={cn(
        "relative group min-w-[140px] max-w-[200px]",
        "bg-gradient-to-br from-white to-blue-50/30 rounded-xl border-2 transition-all duration-200 cursor-move",
        "hover:shadow-xl hover:scale-[1.02]",
        selected
          ? "border-blue-500 shadow-2xl shadow-blue-200/50 scale-[1.02]"
          : "border-blue-300/60 hover:border-blue-400 shadow-lg shadow-blue-100/30",
        hasValidationErrors && "ring-2 ring-red-400/50"
      )}
    >
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs text-blue-900 truncate">
              {data?.label ?? "Trigger"}
            </span>
          </div>
          {hasValidationErrors && (
            <div className="flex-shrink-0" title={data.validationErrors.join(', ')}>
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
          )}
        </div>
        {data?.description && (
          <p className="text-[10px] leading-snug text-blue-700/80 line-clamp-1 pl-9">
            {data.description}
          </p>
        )}
        {(data?.triggerType || data?.config?.triggerType) && (
          <div className="pl-9">
            <Badge
              variant="secondary"
              className="text-[9px] bg-blue-100/80 text-blue-800 border-0 px-2 py-0.5 h-5 font-medium"
            >
              {(data.triggerType || data.config?.triggerType || '').replace(/_/g, " ")}
            </Badge>
          </div>
        )}
      </div>
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white shadow-lg transition-all duration-200 hover:scale-150 hover:shadow-xl"
      />
    </div>
  );
};


