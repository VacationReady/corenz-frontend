"use client";

import { useEffect, useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantFetch } from "@/hooks/useTenantFetch";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function LeaveHistory() {
  const tenantFetch = useTenantFetch();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRequests = () => {
    setLoading(true);
    tenantFetch("/api/leave-request")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leave requests");
        return res.json();
      })
      .then((data) => setRequests(data))
      .catch(() => setError("Failed to load leave requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async (id: string, status: string) => {
    // Only allow deletion of pending requests for employees
    if (status !== "PENDING") {
      toast.error("Only pending leave requests can be cancelled");
      return;
    }

    if (!confirm("Cancel this leave request? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await tenantFetch(`/api/leave-request/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Leave request cancelled");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel leave request");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Your Leave History</SectionHeading>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Loading leave history...</span>
            </div>
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : requests.length === 0 ? (
          <p className="italic text-gray-500">No leave requests found.</p>
        ) : (
          <table className="min-w-full border border-gray-300 rounded shadow-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-left">Type</th>
                <th className="p-2 border text-left">Start Date</th>
                <th className="p-2 border text-left">End Date</th>
                <th className="p-2 border text-left">Status</th>
                <th className="p-2 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="text-left">
                  <td className="p-2 border">{req.type}</td>
                  <td className="p-2 border">
                    {new Date(req.startDate).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-white text-sm ${
                        req.status === "APPROVED"
                          ? "bg-green-600"
                          : req.status === "DECLINED"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="p-2 border">
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => handleDelete(req.id, req.status)}
                        disabled={deletingId === req.id}
                        className="text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Cancel leave request"
                      >
                        <Trash2 className={`w-4 h-4 ${deletingId === req.id ? "animate-pulse" : ""}`} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
