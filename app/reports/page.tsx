"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Field arrays (real schema fields)
const USER_FIELDS = [
  { label: "Email", value: "user.email" },
  { label: "Role", value: "user.role" },
  { label: "Created At", value: "user.createdAt" },
  { label: "Updated At", value: "user.updatedAt" },
  { label: "Email Verified", value: "user.emailVerified" },
  { label: "Name", value: "user.name" },
  { label: "First Name", value: "user.firstName" },
  { label: "Last Name", value: "user.lastName" },
  { label: "Phone", value: "user.phone" },
  { label: "Is Activated", value: "user.isActivated" },
];

const EMPLOYEE_FIELDS = [
  { label: "Is Active", value: "employee.isActive" },
  { label: "Department ID", value: "employee.departmentId" },
  { label: "Working Pattern ID", value: "employee.workingPatternId" },
];

const DEPARTMENT_FIELDS = [
  { label: "Name", value: "department.name" },
  { label: "Company ID", value: "department.companyId" },
];

const JOBROLE_FIELDS = [
  { label: "Name", value: "jobrole.name" },
  { label: "Description", value: "jobrole.description" },
];

const LEAVE_REQUEST_FIELDS = [
  { label: "Start Date", value: "leaverequest.startDate" },
  { label: "End Date", value: "leaverequest.endDate" },
  { label: "Status", value: "leaverequest.status" },
  { label: "Days Requested", value: "leaverequest.daysRequested" },
  { label: "Approved By", value: "leaverequest.approvedById" },
];

const LEAVE_ENTITLEMENT_FIELDS = [
  { label: "Total Days", value: "leaveentitlement.totalDays" },
  { label: "Used Days", value: "leaveentitlement.usedDays" },
  { label: "Carryover Days", value: "leaveentitlement.carryoverDays" },
  { label: "Carryover Expiry", value: "leaveentitlement.carryoverExpiry" },
  { label: "Event Category ID", value: "leaveentitlement.eventCategoryId" },
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
    // TODO: Route to /reports/preview or use context
  };

  const renderFieldGroup = (
    id: string,
    title: string,
    fields: { label: string; value: string }[]
  ) => (
    <AccordionItem value={id}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2">
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
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Build a Custom Report</h1>
      <p className="mb-4">Select the fields you would like to include in your report:</p>

      <Accordion type="multiple" className="w-full space-y-2">
        {renderFieldGroup("user", "User Fields", USER_FIELDS)}
        {renderFieldGroup("employee", "Employee Fields", EMPLOYEE_FIELDS)}
        {renderFieldGroup("department", "Department Fields", DEPARTMENT_FIELDS)}
        {renderFieldGroup("jobrole", "Job Role Fields", JOBROLE_FIELDS)}
        {renderFieldGroup("leaverequest", "Leave Request Fields", LEAVE_REQUEST_FIELDS)}
        {renderFieldGroup("leaveentitlement", "Leave Entitlement Fields", LEAVE_ENTITLEMENT_FIELDS)}
      </Accordion>

      <Button
        onClick={handleNext}
        disabled={selectedFields.length === 0}
        className="mt-4"
      >
        Next: Preview Report
      </Button>
    </main>
  );
}
