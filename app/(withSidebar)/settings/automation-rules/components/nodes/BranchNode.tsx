import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { GitBranch, AlertCircle, Split } from "lucide-react";
import { cn } from "@/lib/utils";

export const BranchNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  
  return (
    <div
      className={cn(
        "relative group min-w-[160px] max-w-[200px]",
        "bg-gradient-to-br from-white via-white to-pink-50/50 rounded-2xl border-2 transition-all duration-300 cursor-move",
        "hover:shadow-2xl hover:shadow-pink-500/20 hover:scale-[1.02] hover:-translate-y-0.5",
        "backdrop-blur-xl",
        selected
          ? "border-pink-500 shadow-2xl shadow-pink-500/25 scale-[1.02] ring-4 ring-pink-500/10"
          : "border-pink-200/80 hover:border-pink-400 shadow-lg shadow-pink-100/50",
        hasValidationErrors && "ring-2 ring-red-400/50 border-red-300"
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-400 rounded-b-full opacity-80" />
      
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/40 group-hover:shadow-xl group-hover:shadow-pink-500/50 transition-all group-hover:scale-110">
              {data?.icon || <GitBranch className="w-5 h-5" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate block">
                {data?.label ?? "Branch"}
              </span>
              <span className="text-[10px] text-pink-600/80 font-medium">
                Split into paths
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
        
        <Badge
          className="text-[10px] bg-gradient-to-r from-pink-100 to-rose-100 text-pink-800 border-0 px-2.5 py-1 h-auto font-semibold rounded-lg shadow-sm"
        >
          <Split className="w-3 h-3 mr-1" />
          Parallel execution
        </Badge>
      </div>
      
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-gradient-to-br !from-pink-500 !to-rose-600 !border-[3px] !border-white !shadow-lg !-top-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-pink-500 !to-rose-600 !border-[3px] !border-white !shadow-lg !-bottom-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
    </div>
  );
};
