import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { Zap, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  const triggerType = data?.triggerType || data?.config?.triggerType;
  
  return (
    <div
      className={cn(
        "relative group min-w-[180px] max-w-[240px]",
        "bg-gradient-to-br from-white via-white to-blue-50/50 rounded-2xl border-2 transition-all duration-300 cursor-move",
        "hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] hover:-translate-y-0.5",
        "backdrop-blur-xl",
        selected
          ? "border-blue-500 shadow-2xl shadow-blue-500/25 scale-[1.02] ring-4 ring-blue-500/10"
          : "border-blue-200/80 hover:border-blue-400 shadow-lg shadow-blue-100/50",
        hasValidationErrors && "ring-2 ring-red-400/50 border-red-300"
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-b-full opacity-80" />
      
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/40 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition-all group-hover:scale-110">
              <Zap className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate block">
                {data?.label ?? "Trigger"}
              </span>
              <span className="text-[10px] text-blue-600/80 font-medium">
                Starts the workflow
              </span>
            </div>
          </div>
          {hasValidationErrors && (
            <div 
              className="flex-shrink-0 p-1.5 rounded-lg bg-red-50 border border-red-200" 
              title={data.validationErrors.join(', ')}
            >
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
          )}
        </div>
        
        {data?.description && (
          <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-2 pl-0.5">
            {data.description}
          </p>
        )}
        
        {triggerType && (
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[10px] bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-0 px-2.5 py-1 h-auto font-semibold rounded-lg shadow-sm"
            >
              {triggerType.replace(/_/g, " ")}
            </Badge>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </div>
        )}
      </div>
      
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-blue-500 !to-indigo-600 !border-[3px] !border-white !shadow-lg !-bottom-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
    </div>
  );
};
