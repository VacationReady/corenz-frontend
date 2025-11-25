import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import { PlayCircle, Mail, Bell, FileText, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case "send_notification":
      return <Bell className="w-4 h-4" />;
    case "send_email":
      return <Mail className="w-4 h-4" />;
    case "create_task":
      return <CheckCircle className="w-4 h-4" />;
    case "assign_form":
    case "send_form":
      return <FileText className="w-4 h-4" />;
    case "start_onboarding":
      return <UserPlus className="w-4 h-4" />;
    default:
      return <PlayCircle className="w-4 h-4" />;
  }
};

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasValidationErrors = data?.validationErrors && data.validationErrors.length > 0;
  const actionType = data?.actionType || data?.config?.actionType;
  
  return (
    <div
      className={cn(
        "relative group min-w-[180px] max-w-[260px]",
        "bg-gradient-to-br from-white via-white to-emerald-50/50 rounded-2xl border-2 transition-all duration-300 cursor-move",
        "hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] hover:-translate-y-0.5",
        "backdrop-blur-xl",
        selected
          ? "border-emerald-500 shadow-2xl shadow-emerald-500/25 scale-[1.02] ring-4 ring-emerald-500/10"
          : "border-emerald-200/80 hover:border-emerald-400 shadow-lg shadow-emerald-100/50",
        hasValidationErrors && "ring-2 ring-red-400/50 border-red-300"
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-b-full opacity-80" />
      
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 group-hover:shadow-xl group-hover:shadow-emerald-500/50 transition-all group-hover:scale-110">
              {data?.icon || getActionIcon(actionType)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate block">
                {data?.label ?? "Action"}
              </span>
              <span className="text-[10px] text-emerald-600/80 font-medium">
                Performs an action
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
        
        {actionType && (
          <Badge
            className="text-[10px] bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-0 px-2.5 py-1 h-auto font-semibold rounded-lg shadow-sm"
          >
            {actionType.replace(/_/g, " ")}
          </Badge>
        )}
        
        {/* Show subject/message preview for notifications */}
        {data?.config?.subject && (
          <div className="space-y-1 pt-1.5 mt-1.5 border-t border-emerald-100">
            <p className="text-[10px] leading-tight text-emerald-700 line-clamp-1 flex items-center gap-1.5 font-medium">
              <Mail className="w-3 h-3 flex-shrink-0" /> 
              {data.config.subject}
            </p>
            {data.config.message && (
              <p className="text-[9px] leading-tight text-slate-500 line-clamp-2 pl-4">
                {data.config.message}
              </p>
            )}
          </div>
        )}
      </div>
      
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-gradient-to-br !from-emerald-500 !to-green-600 !border-[3px] !border-white !shadow-lg !-top-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-emerald-500 !to-green-600 !border-[3px] !border-white !shadow-lg !-bottom-2 transition-all duration-200 hover:!scale-150 hover:!shadow-xl"
      />
    </div>
  );
};
