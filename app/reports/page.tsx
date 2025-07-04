"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";

const EMPLOYEE_FIELDS = [
  { label: "Name", value: "employee.name" },
  { label: "Email", value: "employee.email" },
  { label: "Department", value: "employee.department" },
];

const LEAVE_FIELDS = [
  { label: "Leave Type", value: "leave.type" },
  { label: "Days Used", value: "leave.daysUsed" },
  { label: "Status", value: "leave.status" },
];

const DEPARTMENT_FIELDS = [
  { label: "Name", value: "department.name" },
  { label: "Company", value: "department.company" },
];

export default function ReportsPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleNext = () => {
    console.log("Selected fields:", selectedFields);
    // Later: Route to /reports/preview with selectedFields in searchParams or Context
  };

  const renderFieldGroup = (title: string, fields: { label: string; value: string }[]) => (
    <Card className="p-4 mb-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map((field) => (
          <label key={field.value} className="flex items-center gap-2">
            <Checkbox
  id={field.value}
  checked={selectedFields.includes(field.value)}
  onCheckedChange={() => handleFieldToggle(field.value)}
/>
            <span>{field.label}</span>
          </label>
        ))}
      </div>
    </Card>
  );

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Build a Custom Report</h1>
      <p className="mb-4">Select the fields you would like to include in your report:</p>

      {renderFieldGroup("Employee Fields", EMPLOYEE_FIELDS)}
      {renderFieldGroup("Leave Fields", LEAVE_FIELDS)}
      {renderFieldGroup("Department Fields", DEPARTMENT_FIELDS)}

      <Button onClick={handleNext} disabled={selectedFields.length === 0}>
        Next: Preview Report
      </Button>
    </main>
  );
}
