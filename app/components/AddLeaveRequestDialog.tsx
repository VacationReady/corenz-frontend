"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

interface AddLeaveRequestDialogProps {
  employeeId: string;
  isAdminOrManager: boolean;
}

const leaveTypes = [
  "Annual Leave",
  "Sick Leave",
  "Dentist",
  "Doctor",
  "Other",
];

export default function AddLeaveRequestDialog({ employeeId, isAdminOrManager }: AddLeaveRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setTotalDays(diff > 0 ? diff : 0);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    if (!type || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }

    if (!isAdminOrManager && type === "Sick Leave") {
      toast.error("Only managers/admins can book sick leave directly.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          reason,
          status: isAdminOrManager ? "APPROVED" : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to submit leave request.");
      }

      toast.success("Leave request submitted successfully.");
      setOpen(false);
      // Optionally clear fields after successful submission
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setTotalDays(0);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred while submitting the leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">Book Leave</Button>
      </DialogTrigger>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Leave</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Leave Type</label>
            <select
              className="w-full border rounded p-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt) => (
                <option key={lt} value={lt}>{lt}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mt-2">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

            <label className="block text-sm font-medium mt-2">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

            <p className="text-sm text-gray-700 mt-2">Total Days: {totalDays}</p>

            <label className="block text-sm font-medium mt-2">Reason (optional)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} loading={loading} disabled={loading}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
