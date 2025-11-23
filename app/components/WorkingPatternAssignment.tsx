"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { toast } from "sonner";

interface Pattern {
  id: string;
  name: string;
  weeks?: Array<{
    days: Array<{
      type: string;
      hoursPerDay: number | null;
    }>;
  }>;
}

export default function WorkingPatternAssignment({
  employeeId,
}: {
  employeeId: string;
}) {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState<number | null>(null);
  const [currentHourlyRate, setCurrentHourlyRate] = useState<number | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/working-patterns")
      .then((res) => res.json())
      .then(setPatterns);
  }, []);

  // Fetch employee salary and hourly rate
  useEffect(() => {
    if (open) {
      fetch(`/api/employees/${employeeId}/bank-payroll`)
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data) {
            // Ensure values are proper numbers
            setSalaryAmount(data.salaryAmount ? Number(data.salaryAmount) : null);
            setCurrentHourlyRate(data.hourlyRate ? Number(data.hourlyRate) : null);
          }
        })
        .catch((err) => console.error("Failed to fetch salary data", err));
    }
  }, [open, employeeId]);

  // Calculate new hourly rate when pattern is selected
  useEffect(() => {
    if (!selected || !salaryAmount) {
      setNewHourlyRate(null);
      return;
    }

    const selectedPattern = patterns.find((p) => p.id === selected);
    if (!selectedPattern || !selectedPattern.weeks || selectedPattern.weeks.length === 0) {
      setNewHourlyRate(null);
      return;
    }

    // Calculate total hours per week from working pattern
    let totalHours = 0;
    let weekCount = 0;

    for (const week of selectedPattern.weeks) {
      if (!week.days || week.days.length === 0) continue;
      weekCount++;
      
      for (const day of week.days) {
        if (day.type === 'FULL_DAY') {
          totalHours += day.hoursPerDay ? day.hoursPerDay : 8;
        } else if (day.type.includes('HALF_DAY')) {
          totalHours += day.hoursPerDay ? day.hoursPerDay / 2 : 4;
        }
      }
    }

    if (weekCount === 0 || totalHours === 0) {
      setNewHourlyRate(null);
      return;
    }

    // Average hours per week
    const avgHoursPerWeek = totalHours / weekCount;
    
    // Calculate hourly rate: annual salary / (weeks per year * hours per week)
    const weeksPerYear = 52;
    const calculatedRate = salaryAmount / (weeksPerYear * avgHoursPerWeek);
    
    setNewHourlyRate(calculatedRate);
  }, [selected, salaryAmount, patterns]);

  const handleProceedToConfirm = () => {
    if (!selected || !date) {
      toast.error("Please select a pattern and effective date.");
      return;
    }

    // Check if we need to show confirmation for hourly rate change
    if (salaryAmount && newHourlyRate && currentHourlyRate !== newHourlyRate) {
      setConfirmOpen(true);
    } else {
      // No hourly rate change needed, proceed directly
      handleAssign(false);
    }
  };

  const handleAssign = async (shouldUpdateHourlyRate: boolean) => {
    setLoading(true);
    setConfirmOpen(false);
    
    try {
      // Assign the working pattern
      const res = await fetch(
        `/api/employees/${employeeId}/working-pattern-assignment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workingPatternId: selected,
            effectiveDate: date,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to assign working pattern.");
      }

      // If confirmed to update hourly rate, update it
      if (shouldUpdateHourlyRate && newHourlyRate) {
        const updateRes = await fetch(
          `/api/employees/${employeeId}/bank-payroll`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hourlyRate: newHourlyRate,
            }),
          },
        );

        if (!updateRes.ok) {
          console.error("Failed to update hourly rate, but pattern was assigned");
          toast.warning("Working pattern assigned, but hourly rate update failed.");
        } else {
          toast.success("Working pattern and hourly rate updated successfully.");
        }
      } else {
        toast.success("Working pattern assigned successfully.");
      }

      setOpen(false);

      // Redirect back to the employee settings page to refresh state
      router.push(`/employees/${employeeId}/settings`);
    } catch (error: any) {
      console.error("Error assigning working pattern:", error);
      toast.error(error?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Assign New Pattern</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Assign Working Pattern">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Pattern</label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a pattern" />
                </SelectTrigger>
                <SelectContent>
                  {patterns.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Effective Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <Button
              onClick={handleProceedToConfirm}
              disabled={!selected || !date || loading}
            >
              {loading ? "Saving..." : "Save Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Hourly Rate Change */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pattern Change</DialogTitle>
            <DialogDescription>
              This employee&apos;s hourly rate will change from ${
                currentHourlyRate != null ? Number(currentHourlyRate).toFixed(2) : "0.00"
              } to ${
                newHourlyRate != null ? Number(newHourlyRate).toFixed(2) : "0.00"
              } based on this pattern change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">
              Do you want to update the hourly rate?
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => handleAssign(false)}
              disabled={loading}
            >
              {loading ? "Saving..." : "No, keep current rate"}
            </Button>
            <Button
              onClick={() => handleAssign(true)}
              disabled={loading}
            >
              {loading ? "Saving..." : "Yes, update rate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
