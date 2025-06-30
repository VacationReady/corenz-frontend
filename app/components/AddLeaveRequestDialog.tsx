"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

interface AddLeaveRequestDialogProps {
  employeeId: string;
  isAdminOrManager: boolean;
}

// Aligned with your schema
const leaveTypes = [
  { label: "Annual Leave", value: "ANNUAL" },
  { label: "Sick Leave", value: "SICK" },
  { label: "Bereavement", value: "BEREAVEMENT" },
];

export default function AddLeaveRequestDialog({
  employeeId,
  isAdminOrManager,
}: AddLeaveRequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      const diff =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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

    if (!isAdminOrManager && type === "SICK") {
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
      console.log("Leave request response:", data);

      if (!res.ok || data.success === false) {
        const errorMessage =
          data.error ||
          "Failed to submit leave request. Please check your details and try again.";
        toast.error(errorMessage);
        return; // keep modal open on error
      }

      toast.success("Leave request submitted successfully.");
      setIsOpen(false);
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setTotalDays(0);
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(
        error?.message ||
          "An unexpected error occurred while submitting the leave request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setIsOpen(true)}>
        Book Leave
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Book Leave">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Leave Type</label>
            <select
              className="w-full border rounded p-2 mt-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-700">Total Days: {totalDays}</p>
          <div>
            <label className="block text-sm font-medium">
              Reason (optional)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason"
            />
          </div>
          <Button
            variant="ghost"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
