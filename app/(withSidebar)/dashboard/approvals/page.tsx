"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approvalStatus: string;
  employee: {
    user: {
      name: string | null;
      email: string | null;
    };
  };
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [canViewAll, setCanViewAll] = useState(false);
  const [scopeMy, setScopeMy] = useState(true);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState<string | "all">("all");

  const scopeParam = useMemo(() => (canViewAll ? (scopeMy ? "my" : "all") : undefined), [canViewAll, scopeMy]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const metricsRes = await fetch("/api/dashboard/metrics", { cache: "no-store" });
        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          if (isMounted) setCanViewAll(Boolean(metrics?.canViewAllApprovals));
        }

        const qs = new URLSearchParams({ status: "PENDING" });
        if (scopeParam) qs.set("scope", scopeParam);
        if (departmentId !== "all") qs.set("departmentId", departmentId);
        const res = await fetch(`/api/leave-request?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success) {
          if (isMounted) setRequests(data.data);
        } else {
          toast.error(data.error || "Failed to fetch requests");
        }
      } catch {
        toast.error("Error fetching leave requests");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [scopeParam, departmentId]);

  useEffect(() => {
    let isMounted = true;
    const loadDepts = async () => {
      try {
        const res = await fetch("/api/departments", { cache: "no-store" });
        if (res.ok) {
          const items = await res.json();
          if (isMounted) setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
        }
      } catch {}
    };
    loadDepts();
    return () => {
        isMounted = false;
    };
  }, []);

  const handleDecision = async (id: string, action: "approve" | "decline") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/leave-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }), // sends lowercase as expected
      });

      if (res.ok) {
        toast.success(`Leave ${action === "approve" ? "approved" : "declined"}`);
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating request");
    } finally {
      setActionLoading(null);
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
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canViewAll && (
            <div className="flex items-center gap-2 text-sm">
              <span className={!scopeMy ? "text-foreground" : "text-muted-foreground"}>All</span>
              <Switch checked={scopeMy} onCheckedChange={setScopeMy} />
              <span className={scopeMy ? "text-foreground" : "text-muted-foreground"}>My</span>
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
        <p>No pending leave requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border p-4 rounded shadow bg-white">
              <p>
                <strong>{req.type}</strong> from{" "}
                <strong>{new Date(req.startDate).toLocaleDateString()}</strong> to{" "}
                <strong>{new Date(req.endDate).toLocaleDateString()}</strong>
              </p>
              <p>Employee: {req.employee.user.name} ({req.employee.user.email})</p>
              <p>Reason: {req.reason || "N/A"}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleDecision(req.id, "approve")}
                  disabled={actionLoading === req.id}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === req.id ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => handleDecision(req.id, "decline")}
                  disabled={actionLoading === req.id}
                  className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === req.id ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
