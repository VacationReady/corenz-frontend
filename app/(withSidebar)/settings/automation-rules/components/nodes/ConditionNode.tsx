import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { Filter, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  const conditionType = data?.conditionType || data?.config?.conditionType;
  
  return (
    <div
      className={cn(
        "relative group min-w-[160px] max-w-[220px]",
        "bg-gradient-to-br from-white via-white to-amber-50/50 rounded-2xl border-2 transition-all duration-300 cursor-move",
        "hover:shadow-2xl hover:shadow-amber-500/20 hover:scale-[1.02] hover:-translate-y-0.5",
        "backdrop-blur-xl",
        selected
          ? "border-amber-500 shadow-2xl shadow-amber-500/25 scale-[1.02] ring-4 ring-amber-500/10"
          : "border-amber-200/80 hover:border-amber-400 shadow-lg shadow-amber-100/50",
        hasValidationErrors && "ring-2 ring-red-400/50 border-red-300"
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-b-full opacity-80" />
      
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40 group-hover:shadow-xl group-hover:shadow-amber-500/50 transition-all group-hover:scale-110">
              {data?.icon || <Filter className="w-5 h-5" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate block">
                {data?.label ?? "Condition"}
              </span>
              <span className="text-[10px] text-amber-600/80 font-medium">
                Filters or branches
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
        
        {conditionType && (
          <Badge
            className="text-[10px] bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-0 px-2.5 py-1 h-auto font-semibold rounded-lg shadow-sm"
          >
            {conditionType.replace(/_/g, " ")}
          </Badge>
        )}
        
        {/* Show condition details */}
        {data?.conditionData && Object.keys(data.conditionData).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {data.conditionData.operator && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                {data.conditionData.operator.replace(/_/g, " ")}
              </span>
            )}
            {data.conditionData.departmentIds?.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                {data.conditionData.departmentIds.length} dept{data.conditionData.departmentIds.length > 1 ? 's' : ''}
              </span>
            )}
            {data.conditionData.jobRoleIds?.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                {data.conditionData.jobRoleIds.length} role{data.conditionData.jobRoleIds.length > 1 ? 's' : ''}
              </span>
            )}
            {data.conditionData.days && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                {data.conditionData.days} days
              </span>
            )}
            {data.conditionData.value && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                <ArrowRight className="w-2.5 h-2.5" />
                {data.conditionData.value}
              </span>
            )}
          </div>
        )}
      </div>
      
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-gradient-to-br !from-amber-500 !to-orange-500 !border-[3px] !border-white !shadow-lg !-top-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-amber-500 !to-orange-500 !border-[3px] !border-white !shadow-lg !-bottom-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
    </div>
  );
};
