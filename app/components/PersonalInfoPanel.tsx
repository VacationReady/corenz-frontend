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
    accessLevel?: string;
    permissionProfile?: any;
  };
}

export default function PersonalInfoPanel({
  employee,
}: PersonalInfoPanelProps) {
  const lengthOfService = employee.startDate
    ? Math.floor(
        (new Date().getTime() - new Date(employee.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      )
    : "N/A";

  const formatAccessLevel = (
    role: string | undefined,
    permissionProfile?: any,
  ) => {
    // If user has a custom permission profile, show that
    if (permissionProfile) {
      return `${permissionProfile.name} - ${permissionProfile.description || "Custom permissions"}`;
    }

    // Fall back to role-based display
    if (!role) return "N/A";
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "Admin - Full system access";
      case "MANAGER":
        return "Manager - Team management access";
      case "EMPLOYEE":
        return "Employee - Standard access";
      default:
        return role;
    }
  };

  const getAccessLevelBadgeVariant = (
    role: string | undefined,
    permissionProfile?: any,
  ) => {
    // If user has a custom permission profile, use outline style
    if (permissionProfile) {
      return "outline";
    }

    // Fall back to role-based styling
    if (!role) return "secondary";
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "destructive"; // Red for admin
      case "MANAGER":
        return "default"; // Blue for manager
      case "EMPLOYEE":
        return "secondary"; // Gray for employee
      default:
        return "secondary";
    }
  };

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
        <strong>Access Level:</strong>{" "}
        <Badge
          variant={getAccessLevelBadgeVariant(
            employee.accessLevel,
            employee.permissionProfile,
          )}
        >
          {formatAccessLevel(employee.accessLevel, employee.permissionProfile)}
        </Badge>
      </p>
      <p>
        <strong>Employment Status:</strong>{" "}
        <Badge variant="outline">{employee.employmentStatus || "Active"}</Badge>
      </p>
      <p>
        <strong>Length of Service:</strong>{" "}
        {lengthOfService !== "N/A" ? `${lengthOfService} years` : "N/A"}
      </p>
    </div>
  );
}
