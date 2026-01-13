"use client";

import { useEffect, useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { Trash2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: string; startDate: string; endDate: string } | null>(null);

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

  const handleDeleteClick = (req: LeaveRequest) => {
    // Only allow deletion of pending requests for employees
    if (req.status !== "PENDING") {
      toast.error("Only pending leave requests can be cancelled");
      return;
    }
    setConfirmDelete({ id: req.id, type: req.type, startDate: req.startDate, endDate: req.endDate });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try {
      const res = await tenantFetch(`/api/leave-request/${confirmDelete.id}`, {
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
          <p className="text-destructive">{error}</p>
        ) : requests.length === 0 ? (
          <p className="italic text-muted-foreground">No leave requests found.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-foreground">{req.type}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          req.status === "APPROVED" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          req.status === "DECLINED" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          req.status === "PENDING" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {req.status === "PENDING" && (
                  <button
                    onClick={() => handleDeleteClick(req)}
                    disabled={deletingId === req.id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    title="Cancel leave request"
                    aria-label="Cancel leave request"
                  >
                    <Trash2 className={cn("w-4 h-4", deletingId === req.id && "animate-pulse")} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle>Cancel Leave Request?</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {confirmDelete && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">{confirmDelete.type}</p>
              <p className="text-muted-foreground">
                {new Date(confirmDelete.startDate).toLocaleDateString()} — {new Date(confirmDelete.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
