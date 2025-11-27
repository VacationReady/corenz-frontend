"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { roundToTwoDecimals } from "@/lib/decimalPrecision";

interface EventCategory {
  id: string;
  name: string;
}

interface LeaveEntitlement {
  id: string;
  employeeId: string;
  eventCategoryId: string;
  totalDays: number;
  usedDays: number;
  createdAt: Date;
  updatedAt: Date;
  eventCategory: EventCategory;
}

export default function EditEntitlementModal({
  open,
  setOpen,
  employeeId,
  currentEntitlements,
  refresh,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string;
  currentEntitlements: LeaveEntitlement[];
  refresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEventCategories = async () => {
      try {
        const res = await fetch("/api/event-categories");
        const data: EventCategory[] = await res.json();
        setCategories(data);

        const initialEntitlements: Record<string, string> = {};
        data.forEach((cat) => {
          const existing = currentEntitlements.find(
            (e) => e.eventCategoryId === cat.id,
          );
          initialEntitlements[cat.id] = existing
            ? String(existing.totalDays)
            : "";
        });
        setEntitlements(initialEntitlements);
      } catch (error) {
        console.error("Failed to fetch event categories", error);
      }
    };

    if (open) {
      fetchEventCategories();
    }
  }, [open, currentEntitlements]);

  const handleChange = (categoryId: string, value: string) => {
    // Round to 2 decimal places as user types (NZ HRIS requirement)
    let roundedValue = value;
    if (value !== '') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        // Only round if there are more than 2 decimal places
        const decimalPlaces = (value.split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          roundedValue = roundToTwoDecimals(num).toString();
        }
      }
    }
    setEntitlements((prev) => ({
      ...prev,
      [categoryId]: roundedValue,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Round all values to 2 decimal places before submission (NZ HRIS requirement)
      const payload = Object.entries(entitlements).map(
        ([categoryId, totalDays]) => ({
          eventCategoryId: categoryId,
          totalDays: roundToTwoDecimals(parseFloat(totalDays) || 0),
        }),
      );

      const res = await fetch(`/api/employees/${employeeId}/entitlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update entitlement.");

      setOpen(false);
      refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update entitlement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Leave Entitlements</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
          {categories.length === 0 && <p>Loading categories...</p>}
          {categories.map((category) => (
            <label key={category.id} className="block">
              {category.name}:
              <Input
                type="number"
                min={0}
                step={0.01}
                value={entitlements[category.id] ?? ""}
                onChange={(e) => handleChange(category.id, e.target.value)}
                title="Maximum 2 decimal places allowed"
              />
            </label>
          ))}

          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? "Saving..." : "Save Entitlements"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
