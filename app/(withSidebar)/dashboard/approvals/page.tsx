"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { StageTimeline } from "@/components/approvals/StageTimeline";
import { usePatchMutation } from "@/hooks/useMutationWithRefresh";
import { useApi } from "@/hooks/useApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function ApprovalsPage() {
  const [canViewAll, setCanViewAll] = useState(false);
  const [scopeMy, setScopeMy] = useState(true);
  const [departmentId, setDepartmentId] = useState<string | "all">("all");

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

  const handleDecision = async (
    id: string,
    decisionId: string | undefined,
    action: "approve" | "decline",
  ) => {
    const payload: { requestId: string; action: "approve" | "decline"; decisionId?: string } = {
      requestId: id,
      action,
    };
    if (decisionId) {
      payload.decisionId = decisionId;
    }

    const result = await updateLeaveRequest(payload);

    if (result.success) {
      toast.success(
        `Leave ${action === "approve" ? "approved" : "declined"}`
      );
    }
  };

  return (
    <div className="w-full px-6 pt-6 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pending Leave Requests</h1>
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="h-8">
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
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  !scopeMy ? "text-foreground" : "text-muted-foreground"
                }
              >
                All
              </span>
              <Switch checked={scopeMy} onChange={setScopeMy} />
              <span
                className={
                  scopeMy ? "text-foreground" : "text-muted-foreground"
                }
              >
                My
              </span>
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <p>No pending approvals assigned to you.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border p-4 rounded shadow bg-white">
              <p>
                <strong>{req.type}</strong> from{" "}
                <strong>{new Date(req.startDate).toLocaleDateString()}</strong>{" "}
                to <strong>{new Date(req.endDate).toLocaleDateString()}</strong>
              </p>
              <p>
                Employee: {req.employee?.user?.name ?? "Employee"}
                {req.employee?.user?.email ? ` (${req.employee.user.email})` : ""}
              </p>
              <p>Reason: {req.reason || "N/A"}</p>
              <StageTimeline stages={req.approvalStages} />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleDecision(req.id, req.myDecision?.id, "approve")}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => handleDecision(req.id, req.myDecision?.id, "decline")}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
