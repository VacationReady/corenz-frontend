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
    <Card className="p-4">
      <h3 className="font-semibold mb-3 text-lg">Form Visibility</h3>
      <div className="space-y-4">
        {/* Roles */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">
            Visible to Roles
          </h4>
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
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              Specific Departments (optional)
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
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
                    className="text-sm cursor-pointer"
                  >
                    {dept.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Job Roles */}
        {jobRoles.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              Specific Job Roles (optional)
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
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
                    className="text-sm cursor-pointer"
                  >
                    {role.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-3">
          <p>
            • If no specific departments or job roles are selected, the form
            will be visible to all users with the selected roles.
          </p>
          <p>
            • Selecting specific departments or job roles will restrict
            visibility to only those groups.
          </p>
        </div>
      </div>
    </Card>
  );
}
