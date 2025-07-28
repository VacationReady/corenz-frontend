"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useState, useEffect } from "react";

type Department = { id: string; name: string };
type JobRole = { id: string; name: string };
type Document = {
  id: string;
  name: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  departments: Department[];
  jobRoles: JobRole[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSaved: () => void;
};

export default function EditAccessModal({ isOpen, onClose, document, onSaved }: Props) {
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [admin, setAdmin] = useState(false);
  const [manager, setManager] = useState(false);
  const [employee, setEmployee] = useState(false);

  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (document) {
      setDeptIds(document.departments.map((d) => d.id));
      setJobIds(document.jobRoles.map((j) => j.id));
      setAdmin(document.canViewAdmin);
      setManager(document.canViewManager);
      setEmployee(document.canViewEmployee);
    }
  }, [document]);

  useEffect(() => {
    // Fetch dropdown options
    const fetchDropdowns = async () => {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments/active"),
        fetch("/api/job-roles/active"),
      ]);
      const deptData = await deptRes.json();
      const roleData = await roleRes.json();
      setDepartmentsList(deptData.map((d: any) => ({ label: d.name, value: d.id })));
      setJobRolesList(roleData.map((r: any) => ({ label: r.name, value: r.id })));
    };
    fetchDropdowns();
  }, []);

  const handleSave = async () => {
    if (!document) return;
    await fetch("/api/documents/update-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: document.id,
        canViewAdmin: admin,
        canViewManager: manager,
        canViewEmployee: employee,
        departmentIds: deptIds,
        jobRoleIds: jobIds,
      }),
    });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Access: {document?.name}</DialogTitle>
        </DialogHeader>
        {document && (
          <div className="space-y-4">
            <MultiSelect
              label="Departments"
              options={departmentsList}
              selected={deptIds}
              onChange={setDeptIds}
              placeholder="Select department(s)"
            />
            <MultiSelect
              label="Job Roles"
              options={jobRolesList}
              selected={jobIds}
              onChange={setJobIds}
              placeholder="Select job role(s)"
            />
            <div className="flex gap-4">
              <label>
                <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} /> Admin
              </label>
              <label>
                <input type="checkbox" checked={manager} onChange={(e) => setManager(e.target.checked)} /> Manager
              </label>
              <label>
                <input type="checkbox" checked={employee} onChange={(e) => setEmployee(e.target.checked)} /> Employee
              </label>
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
