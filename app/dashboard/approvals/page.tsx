"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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

  useEffect(() => {
    fetch("/api/leave-request?status=PENDING")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.data);
        } else {
          toast.error(data.error || "Failed to fetch requests");
        }
      })
      .catch(() => toast.error("Error fetching leave requests"))
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async (id: string, status: "APPROVED" | "DECLINED") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/leave-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: status }),
      });

      if (res.ok) {
        toast.success(`Leave ${status.toLowerCase()}`);
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
    <div className="w-full px-6 pt-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Pending Leave Requests</h1>
      {loading ? (
        <p>Loading...</p>
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
                  onClick={() => handleDecision(req.id, "APPROVED")}
                  disabled={actionLoading === req.id}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === req.id ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => handleDecision(req.id, "DECLINED")}
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
