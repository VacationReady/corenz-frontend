"use client";

import { Badge } from "@/components/ui/Badge";

interface PersonalInfoPanelProps {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
    startDate?: Date;
    manager?: { firstName: string; lastName: string };
    employmentStatus?: string;
  };
}

export default function PersonalInfoPanel({ employee }: PersonalInfoPanelProps) {
  const lengthOfService = employee.startDate
    ? Math.floor(
        (new Date().getTime() - new Date(employee.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      )
    : "N/A";

  return (
    <div className="space-y-2 text-sm">
      <p>
        <strong>Email:</strong> {employee.email}
      </p>
      <p>
        <strong>Phone:</strong> {employee.phone || "N/A"}
      </p>
      <p>
        <strong>Job Title:</strong> {employee.jobTitle || "N/A"}
      </p>
      <p>
        <strong>Department:</strong> {employee.department || "N/A"}
      </p>
      <p>
        <strong>Manager:</strong>{" "}
        {employee.manager
          ? `${employee.manager.firstName} ${employee.manager.lastName}`
          : "N/A"}
      </p>
      <p>
        <strong>Employment Status:</strong>{" "}
        <Badge variant="outline">
          {employee.employmentStatus || "Active"}
        </Badge>
      </p>
      <p>
        <strong>Length of Service:</strong>{" "}
        {lengthOfService !== "N/A" ? `${lengthOfService} years` : "N/A"}
      </p>
    </div>
  );
}
