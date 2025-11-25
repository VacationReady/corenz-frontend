import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { Repeat, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const LoopNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  const iterations = data?.config?.iterations || 1;
  const collection = data?.config?.collection;
  
  return (
    <div
      className={cn(
        "relative group min-w-[160px] max-w-[200px]",
        "bg-gradient-to-br from-white via-white to-cyan-50/50 rounded-2xl border-2 transition-all duration-300 cursor-move",
        "hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] hover:-translate-y-0.5",
        "backdrop-blur-xl",
        selected
          ? "border-cyan-500 shadow-2xl shadow-cyan-500/25 scale-[1.02] ring-4 ring-cyan-500/10"
          : "border-cyan-200/80 hover:border-cyan-400 shadow-lg shadow-cyan-100/50",
        hasValidationErrors && "ring-2 ring-red-400/50 border-red-300"
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-400 rounded-b-full opacity-80" />
      
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/40 group-hover:shadow-xl group-hover:shadow-cyan-500/50 transition-all group-hover:scale-110">
              {data?.icon || <Repeat className="w-5 h-5" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate block">
                {data?.label ?? "Loop"}
              </span>
              <span className="text-[10px] text-cyan-600/80 font-medium">
                Repeat actions
              </span>
            </div>
          </div>
          {hasValidationErrors && (
            <div 
              className="flex-shrink-0 p-1.5 rounded-lg bg-red-50 border border-red-200" 
              title={data.validationErrors?.join(', ')}
            >
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
          )}
        </div>
        
        {data?.description && (
          <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-2">
            {data.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-1.5">
          <Badge
            className="text-[10px] bg-gradient-to-r from-cyan-100 to-sky-100 text-cyan-800 border-0 px-2.5 py-1 h-auto font-semibold rounded-lg shadow-sm"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {iterations}x iterations
          </Badge>
          {collection && (
            <Badge
              variant="outline"
              className="text-[9px] border-cyan-200 text-cyan-700 px-2 py-0.5"
            >
              Over: {collection}
            </Badge>
          )}
        </div>
      </div>
      
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-gradient-to-br !from-cyan-500 !to-sky-600 !border-[3px] !border-white !shadow-lg !-top-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-cyan-500 !to-sky-600 !border-[3px] !border-white !shadow-lg !-bottom-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
    </div>
  );
};
