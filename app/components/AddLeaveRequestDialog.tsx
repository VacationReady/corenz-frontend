"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Info } from "lucide-react";
import Tooltip from "@/components/ui/tooltip";

interface AddLeaveRequestDialogProps {
  employeeId: string;
  isAdminOrManager: boolean;
}

type EventCategory = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

export default function AddLeaveRequestDialog({
  employeeId,
  isAdminOrManager,
}: AddLeaveRequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [type, setType] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [sickReason, setSickReason] = useState("");
  const [paidStatus, setPaidStatus] = useState("PAID");
  const [totalDays, setTotalDays] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/event-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        toast.error("Failed to load leave categories.");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error fetching leave categories.");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories(); // refresh categories on modal open
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (startDate && endDate) {
      (async () => {
        try {
          const res = await fetch(
            `/api/employees/${employeeId}/leave-requests/preview-deduction?startDate=${startDate}&endDate=${endDate}`
          );
          if (res.ok) {
            const data = await res.json();
            setDeduction(data.deduction);
          } else {
            setDeduction(0);
          }
        } catch {
          setDeduction(0);
        }
      })();
    } else {
      setDeduction(0);
    }
  }, [startDate, endDate, employeeId]);

  const handleSubmit = async () => {
    if (!type || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }

    const selectedCategory = categories.find((cat) => cat.id === type);

    if (!selectedCategory) {
      toast.error("Invalid leave type selected.");
      return;
    }

    if (!isAdminOrManager && selectedCategory.name.toLowerCase().includes("sick")) {
      toast.error("Only managers/admins can book sick leave directly.");
      return;
    }

    if (selectedCategory.name.toLowerCase().includes("sick") && !sickReason) {
      toast.error("Please provide a reason for sickness.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCategoryId: type,
          eventSubcategoryId: subcategory || null,
          startDate,
          endDate,
          reason,
          status: isAdminOrManager ? "APPROVED" : undefined,
          ...(selectedCategory.name.toLowerCase().includes("sick") && {
            sickReason,
            paidStatus,
          }),
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.success === false) {
        const errorMessage =
          data?.error || `Failed to submit leave request. Status: ${res.status}`;
        toast.error(errorMessage);
        return;
      }

      toast.success("Leave request submitted successfully.");
      setIsOpen(false);
      setType("");
      setSubcategory("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setSickReason("");
      setPaidStatus("PAID");
      setTotalDays(0);
      setDeduction(0);
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(
        error?.message || "An unexpected error occurred while submitting the leave request."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalDeducted = Math.max(0, deduction).toFixed(1);
  const selectedCategory = categories.find((cat) => cat.id === type);

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
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium">Subcategory (optional)</label>
              <select
                className="w-full border rounded p-2 mt-1"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              >
                <option value="">Select Subcategory</option>
                {selectedCategory.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium">End Date</label>
              <Tooltip content="If returning to work on Monday, select Sunday as your end date.">
                <Info className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" />
              </Tooltip>
            </div>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">
              Select the last day you will be <em>away</em>. Do not include your return-to-work day.
            </p>
          </div>

          <p className="text-sm text-gray-700">Total Days Requested: {totalDays}</p>
          {deduction !== null && (
            <p className="text-sm font-medium text-green-700">
              ✅ Total Days Deducted (per working pattern): {totalDeducted}
            </p>
          )}

          {selectedCategory && selectedCategory.name.toLowerCase().includes("sick") && (
            <>
              <div>
                <label className="block text-sm font-medium">Reason for Sickness</label>
                <Input
                  value={sickReason}
                  onChange={(e) => setSickReason(e.target.value)}
                  placeholder="E.g. Flu, injury, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Paid or Unpaid</label>
                <select
                  className="w-full border rounded p-2 mt-1"
                  value={paidStatus}
                  onChange={(e) => setPaidStatus(e.target.value)}
                >
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium">General Reason (optional)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for this leave"
            />
          </div>

          <Button variant="ghost" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
