import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  ChevronDown, 
  ChevronUp,
  MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approvalStatus: string;
  eventCategory?: { id: string; name: string; color?: string } | null;
  employee: {
    user: {
      name: string | null;
      email: string | null;
      profileImageUrl?: string | null;
    };
  };
  myDecision?: { id: string; stageId: string; mode: string } | null;
}

interface ApprovalCardProps {
  request: LeaveRequest;
  onApprove: (id: string, decisionId: string | undefined) => Promise<void>;
  onDecline: (id: string, decisionId: string | undefined) => Promise<void>;
  isActionLoading?: boolean;
}

interface ApprovalDetails {
  departmentColleagues: Array<{
    id: string;
    name: string;
    profileImageUrl?: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    leaveColor?: string;
  }>;
  balance: {
    remainingDays: number;
    remainingAfterApproval: number;
  } | null;
}

export function ApprovalCard({ request, onApprove, onDecline, isActionLoading }: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const decisionId = request.myDecision?.id;
  
  // Fetch details only if we have a decision ID
  const { data: detailsResponse, isLoading: detailsLoading } = useApi<{ success: boolean; data: ApprovalDetails }>(
    decisionId ? `/api/approvals/${decisionId}/details` : null
  );

  const details = detailsResponse?.success ? detailsResponse.data : null;
  const colleagues = details?.departmentColleagues || [];
  const hasClashes = colleagues.length > 0;

  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  // Use UTC dates to avoid timezone issues when calculating calendar days
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const daysCount = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(request.id, request.myDecision?.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      await onDecline(request.id, request.myDecision?.id);
    } finally {
      setProcessing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const statusColor = request.approvalStatus === "PENDING" ? "text-yellow-600 bg-yellow-50" : "text-gray-600 bg-gray-50";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
              <AvatarImage src={request.employee.user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {getInitials(request.employee.user.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{request.employee.user.name}</h3>
              <p className="text-xs text-gray-500">{request.employee.user.email}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor} border border-opacity-10`}>
            {request.approvalStatus}
          </div>
        </div>

        {/* Main Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-gray-500">{daysCount} day{daysCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-700">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
              style={{ backgroundColor: request.eventCategory?.color || '#8b5cf6' }}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{request.type}</p>
              {request.reason && (
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{request.reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* Clashes Preview / Warnings */}
        {detailsLoading ? (
           <div className="mt-4 h-6 w-full bg-gray-100 animate-pulse rounded"></div>
        ) : (
          (hasClashes || (details?.balance && details.balance.remainingAfterApproval < 0)) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {hasClashes && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                  <Users className="w-3 h-3" />
                  {colleagues.length} Clashing
                </div>
              )}
              {details?.balance && details.balance.remainingAfterApproval < 0 && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                  <AlertTriangle className="w-3 h-3" />
                  Negative Balance
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 border-t border-gray-100"
          >
            <div className="p-4 space-y-4">
               {/* Balance Info */}
               {details?.balance && (
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-sm text-gray-600">Balance after:</span>
                  <span className={`font-bold ${details.balance.remainingAfterApproval < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {details.balance.remainingAfterApproval} days
                  </span>
                </div>
              )}

              {/* Clashes List */}
              {hasClashes ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Team Clashes</p>
                  {colleagues.map((colleague) => (
                    <div key={colleague.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={colleague.profileImageUrl} />
                        <AvatarFallback className="text-xs">{getInitials(colleague.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{colleague.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {format(new Date(colleague.startDate), "MMM d")} - {format(new Date(colleague.endDate), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !detailsLoading && (
                <div className="flex items-center gap-2 text-green-600 text-xs bg-green-50 p-2 rounded border border-green-100">
                  <CheckCircle className="w-3 h-3" />
                  No team clashes found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpanded ? "Less" : "Details"}
        </Button>
        
        <div className="flex gap-2 flex-1 justify-end">
           <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            disabled={processing || isActionLoading}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={processing || isActionLoading}
            className="bg-black text-white hover:bg-gray-800"
          >
            Approve
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

