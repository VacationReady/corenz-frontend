"use client";

import { useState, useEffect } from "react";

import Checkbox from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";

interface VisibilitySettingsProps {
  visibleToRoles: string[];
  visibleToDepartments: string[];
  visibleToJobRoles: string[];
  onChange: (visibility: {
    visibleToRoles: string[];
    visibleToDepartments: string[];
    visibleToJobRoles: string[];
  }) => void;
}

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

const AVAILABLE_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
];

export function VisibilitySettings({
  visibleToRoles,
  visibleToDepartments,
  visibleToJobRoles,
  onChange,
}: VisibilitySettingsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(Array.isArray(deptData) ? deptData : []);
        }

        if (roleRes.ok) {
          const roleData = await roleRes.json();
          setJobRoles(Array.isArray(roleData) ? roleData : []);
        }
      } catch (error) {
        console.error("Failed to fetch departments/job roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRoleChange = (role: string, checked: boolean) => {
    const newRoles = checked
      ? [...visibleToRoles, role]
      : visibleToRoles.filter((r) => r !== role);

    onChange({
      visibleToRoles: newRoles,
      visibleToDepartments,
      visibleToJobRoles,
    });
  };

  const handleDepartmentChange = (deptId: string, checked: boolean) => {
    const newDepts = checked
      ? [...visibleToDepartments, deptId]
      : visibleToDepartments.filter((d) => d !== deptId);

    onChange({
      visibleToRoles,
      visibleToDepartments: newDepts,
      visibleToJobRoles,
    });
  };

  const handleJobRoleChange = (roleId: string, checked: boolean) => {
    const newJobRoles = checked
      ? [...visibleToJobRoles, roleId]
      : visibleToJobRoles.filter((r) => r !== roleId);

    onChange({
      visibleToRoles,
      visibleToDepartments,
      visibleToJobRoles: newJobRoles,
    });
  };

  if (loading) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-lg">Form Visibility</h3>
        <div className="text-sm text-gray-500">
          Loading visibility options...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Roles */}
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-sm mb-1">
            User Roles *
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            Select which user role levels can access this form
          </p>
        </div>
        <div className="space-y-2">
          {AVAILABLE_ROLES.map((role) => (
            <div key={role.value} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.value}`}
                checked={visibleToRoles.includes(role.value)}
                onCheckedChange={(checked) =>
                  handleRoleChange(role.value, Boolean(checked))
                }
              />
              <label
                htmlFor={`role-${role.value}`}
                className="text-sm cursor-pointer"
              >
                {role.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Departments */}
      {departments.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div>
            <h4 className="font-medium text-sm mb-1">
              Restrict to Departments
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Optional: Limit to specific departments only
            </p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 glass-subtle rounded-lg p-3">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center gap-2">
                <Checkbox
                  id={`dept-${dept.id}`}
                  checked={visibleToDepartments.includes(dept.id)}
                  onCheckedChange={(checked) =>
                    handleDepartmentChange(dept.id, Boolean(checked))
                  }
                />
                <label
                  htmlFor={`dept-${dept.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {dept.name}
                </label>
              </div>
            ))}
          </div>
          {visibleToDepartments.length > 0 && (
            <p className="text-xs text-primary font-medium">
              ✓ {visibleToDepartments.length} department(s) selected
            </p>
          )}
        </div>
      )}

      {/* Job Roles */}
      {jobRoles.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div>
            <h4 className="font-medium text-sm mb-1">
              Restrict to Job Roles
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Optional: Limit to specific job roles (e.g., only Drivers)
            </p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 glass-subtle rounded-lg p-3">
            {jobRoles.map((role) => (
              <div key={role.id} className="flex items-center gap-2">
                <Checkbox
                  id={`jobrole-${role.id}`}
                  checked={visibleToJobRoles.includes(role.id)}
                  onCheckedChange={(checked) =>
                    handleJobRoleChange(role.id, Boolean(checked))
                  }
                />
                <label
                  htmlFor={`jobrole-${role.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {role.name}
                </label>
              </div>
            ))}
          </div>
          {visibleToJobRoles.length > 0 && (
            <p className="text-xs text-primary font-medium">
              ✓ {visibleToJobRoles.length} job role(s) selected
            </p>
          )}
        </div>
      )}

      <div className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 p-3 rounded-lg mt-4 space-y-1">
        <p className="font-medium">How visibility works:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Users must match <strong>all</strong> selected criteria</li>
          <li>If no departments selected: visible to all departments</li>
          <li>If no job roles selected: visible to all job roles</li>
          <li>Example: Select &quot;Employee&quot; role + &quot;Driver&quot; job role for an HGV screening form</li>
        </ul>
      </div>
    </div>
  );
}
