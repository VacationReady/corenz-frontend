"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { StageTimeline } from "@/components/approvals/StageTimeline";
import { usePatchMutation } from "@/hooks/useMutationWithRefresh";
import { useApi } from "@/hooks/useApi";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  ClipboardCheck,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Filter,
  Sparkles,
  CalendarDays,
  MessageSquare,
  Inbox,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import confetti from "canvas-confetti";

interface Decision {
  id: string;
  approverId: string;
  approverName: string | null;
  approverEmail: string | null;
  order: number;
  status: string;
  isActive: boolean;
}

interface Stage {
  id: string;
  name: string | null;
  order: number;
  mode: string;
  status: string;
  isActive: boolean;
  decisions: Decision[];
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approvalStatus: string;
  eventCategory?: { id: string; name: string } | null;
  employee: {
    user: {
      name: string | null;
      email: string | null;
    };
  };
  approvalStages?: Stage[];
  myDecision?: { id: string; stageId: string; mode: string } | null;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring" as const, 
      stiffness: 300, 
      damping: 24 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: -20,
    transition: { duration: 0.3 } 
  },
};

const successExitVariants = {
  exit: {
    opacity: 0,
    scale: 1.05,
    y: -30,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const declineExitVariants = {
  exit: {
    opacity: 0,
    scale: 0.85,
    x: -50,
    transition: { duration: 0.3, ease: "easeIn" as const },
  },
};

// Approval Card Component
function ApprovalCard({
  request,
  onDecision,
  isProcessing,
  processingAction,
}: {
  request: LeaveRequest;
  onDecision: (id: string, decisionId: string | undefined, action: "approve" | "decline") => Promise<void>;
  isProcessing: boolean;
  processingAction: "approve" | "decline" | null;
}) {
  const [exitAnimation, setExitAnimation] = useState<"approve" | "decline" | null>(null);
  
  const handleAction = async (action: "approve" | "decline") => {
    setExitAnimation(action);
    
    // Trigger confetti for approval
    if (action === "approve") {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
      });
    }
    
    await onDecision(request.id, request.myDecision?.id, action);
  };

  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const leaveType = request.eventCategory?.name || request.type || "Leave";

  return (
    <motion.div
      layout
      variants={exitAnimation === "approve" ? successExitVariants : exitAnimation === "decline" ? declineExitVariants : cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="glass-card rounded-2xl overflow-hidden hover:shadow-depth-3 transition-all duration-300 group"
    >
      {/* Card Header with Leave Type Badge */}
      <div className="relative px-6 pt-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-primary/5 to-violet-500/5" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <CalendarDays className="w-5 h-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{leaveType}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Pending
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {daysDiff} day{daysDiff !== 1 ? "s" : ""} requested
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-6 pb-5 space-y-4">
        {/* Employee Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {request.employee?.user?.name ?? "Employee"}
            </p>
            {request.employee?.user?.email && (
              <p className="text-xs text-muted-foreground truncate">
                {request.employee.user.email}
              </p>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-muted-foreground">From</span>
            </div>
            <p className="font-semibold text-foreground">
              {startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-medium text-muted-foreground">To</span>
            </div>
            <p className="font-semibold text-foreground">
              {endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="p-3 rounded-xl bg-muted/20 border border-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Reason</span>
            </div>
            <p className="text-sm text-foreground">{request.reason}</p>
          </div>
        )}

        {/* Approval Stages */}
        {request.approvalStages && request.approvalStages.length > 0 && (
          <div className="pt-2">
            <StageTimeline stages={request.approvalStages} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction("approve")}
            disabled={isProcessing}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing && processingAction === "approve" ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>Approve</span>
              </>
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction("decline")}
            disabled={isProcessing}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing && processingAction === "decline" ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>Declining...</span>
              </>
            ) : (
              <>
                <ThumbsDown className="w-4 h-4" />
                <span>Decline</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20 mb-6"
      >
        <Inbox className="w-12 h-12 text-emerald-500" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xl font-bold text-foreground mb-2"
      >
        All caught up!
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground text-center max-w-md"
      >
        No pending approvals assigned to you. Check back later or adjust your filters.
      </motion.p>
    </motion.div>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const [canViewAll, setCanViewAll] = useState(false);
  const [scopeMy, setScopeMy] = useState(true);
  const [departmentId, setDepartmentId] = useState<string | "all">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"approve" | "decline" | null>(null);

  const scopeParam = useMemo(
    () => (canViewAll ? (scopeMy ? "my" : "all") : undefined),
    [canViewAll, scopeMy],
  );

  // Fetch metrics to determine permissions
  const { data: metricsData } = useApi<{ canViewAllApprovals?: boolean }>(
    '/api/dashboard/metrics'
  );

  // Update canViewAll when metrics load
  useEffect(() => {
    if (metricsData?.canViewAllApprovals !== undefined) {
      setCanViewAll(Boolean(metricsData.canViewAllApprovals));
    }
  }, [metricsData]);

  // Build query params for leave requests
  const leaveRequestParams = useMemo(() => {
    const params: Record<string, string> = { status: 'PENDING' };
    if (scopeParam) params.scope = scopeParam;
    if (departmentId !== 'all') params.departmentId = departmentId;
    return params;
  }, [scopeParam, departmentId]);

  // Fetch leave requests with filters
  const { data: requestsData, isLoading: loading, mutate: refetchRequests } = useApi<{
    success: boolean;
    data: LeaveRequest[];
    error?: string;
  }>('/api/leave-request', { params: leaveRequestParams });

  const requests = requestsData?.success ? requestsData.data : [];

  // Fetch departments for filter
  const { data: departmentsData } = useApi<Array<{ id: string; name: string }>>(
    '/api/departments'
  );
  const departments = departmentsData || [];

  // Mutation for approving/declining leave requests
  const { trigger: updateLeaveRequest, isMutating: actionLoading } = usePatchMutation<
    any,
    { requestId: string; action: 'approve' | 'decline'; decisionId?: string }
  >(
    (body) => `/api/leave-request/${body?.requestId}`,
    {
      invalidateKeys: ['/api/leave-request'],
      refreshRouter: true,
      onSuccess: () => {
        // Refetch to update the list
        refetchRequests();
      },
    }
  );

  const handleDecision = useCallback(async (
    id: string,
    decisionId: string | undefined,
    action: "approve" | "decline",
  ) => {
    setProcessingId(id);
    setProcessingAction(action);
    
    const payload: { requestId: string; action: "approve" | "decline"; decisionId?: string } = {
      requestId: id,
      action,
    };
    if (decisionId) {
      payload.decisionId = decisionId;
    }

    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await updateLeaveRequest(payload);

    if (result.success) {
      toast.success(
        action === "approve" ? "🎉 Leave approved successfully!" : "Leave request declined",
        {
          icon: action === "approve" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />,
        }
      );
    }
    
    setProcessingId(null);
    setProcessingAction(null);
  }, [updateLeaveRequest]);

  return (
    <div className="w-full min-h-screen">
      {/* Hero Header */}
      <div className="relative px-6 pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-primary/5 to-violet-500/5" />
        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-primary/10 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10"
              >
                <ClipboardCheck className="w-7 h-7" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Pending Approvals
                </h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage leave requests
                </p>
              </div>
            </div>

            {/* Stats Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-subtle border border-muted/30"
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                {loading ? "..." : requests.length} pending
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-4 p-4 rounded-2xl glass-subtle border border-muted/30"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters</span>
            </div>
            
            <div className="w-px h-6 bg-muted/50 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 w-48 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canViewAll && (
              <>
                <div className="w-px h-6 bg-muted/50 hidden sm:block" />
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/30">
                  <span className={`text-sm font-medium transition-colors ${!scopeMy ? "text-foreground" : "text-muted-foreground"}`}>
                    All
                  </span>
                  <Switch checked={scopeMy} onChange={setScopeMy} />
                  <span className={`text-sm font-medium transition-colors ${scopeMy ? "text-foreground" : "text-muted-foreground"}`}>
                    My Approvals
                  </span>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <LoadingSkeleton />
          ) : requests.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {requests.map((req) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onDecision={handleDecision}
                    isProcessing={processingId === req.id}
                    processingAction={processingId === req.id ? processingAction : null}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
