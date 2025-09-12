"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  useEffect(() => {
    fetch("/api/working-patterns")
      .then((res) => res.json())
      .then(setPatterns);
  }, []);

  const handleAssign = async () => {
    if (!selected || !date) {
      toast.error("Please select a pattern and effective date.");
      return;
    }

    setLoading(true);
    try {
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

      toast.success("Working pattern assigned successfully.");
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
              onClick={handleAssign}
              disabled={!selected || !date || loading}
            >
              {loading ? "Saving..." : "Save Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
