"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Pattern {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  workingPattern: Pattern;
  effectiveDate: string;
}

export default function WorkingPatternAssignment({
  employeeId,
}: {
  employeeId: string;
}) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/working-patterns")
      .then((res) => res.json())
      .then((data) => setPatterns(data));

    fetch(`/api/employees/${employeeId}/working-pattern-assignment`)
      .then((res) => res.json())
      .then((data) => setAssignments(data));
  }, [employeeId]);

  const handleAssign = async () => {
    await fetch(
      `/api/employees/${employeeId}/working-pattern-assignment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingPatternId: selected,
          effectiveDate: date,
        }),
      }
    );

    setOpen(false);
    // reload assignments after save
    const res = await fetch(
      `/api/employees/${employeeId}/working-pattern-assignment`
    );
    setAssignments(await res.json());
  };

  return (
    <div className="card p-4 space-y-4">
      <h3 className="text-lg font-medium">Working Pattern Assignment</h3>
      <p>
        Current:&nbsp;
        <strong>
          {assignments[0]?.workingPattern.name ?? "None assigned"}
        </strong>
      </p>
      <Button onClick={() => setOpen(true)}>Assign New Pattern</Button>

      <Dialog open={open} onOpenChange={setOpen} title="Assign Working Pattern">
        <div className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <Select.Trigger placeholder="Select pattern" />
            <Select.Content>
              {patterns.map((p) => (
                <Select.Item key={p.id} value={p.id}>
                  {p.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <label className="block text-sm font-medium">Effective Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Button onClick={handleAssign}>Save Assignment</Button>
        </div>
      </Dialog>
    </div>
  );
}
