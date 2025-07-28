import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/MultiSelect";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Department = { id: string; name: string };
type JobRole = { id: string; name: string };
type Document = {
  id: string;
  name: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  departments?: Department[];
  jobRoles?: JobRole[];
};

interface EditAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSaved: () => void;
  isEmployeeDocument?: boolean; // ✅ NEW: Context flag
}

export default function EditAccessModal({
  isOpen,
  onClose,
  document,
  onSaved,
  isEmployeeDocument = false,
}: EditAccessModalProps) {
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [canAdmin, setCanAdmin] = useState(false);
  const [canManager, setCanManager] = useState(false);
  const [canEmployee, setCanEmployee] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);

  // Fetch dropdowns if not employee document
  useEffect(() => {
    if (!isEmployeeDocument) {
      fetch("/api/departments/active").then((res) => res.json()).then((data) => {
        setDepartmentsList([{ label: "All Departments", value: "all" }, ...data.map((d: any) => ({ label: d.name, value: d.id }))]);
      });
      fetch("/api/job-roles/active").then((res) => res.json()).then((data) => {
        setJobRolesList([{ label: "All Job Roles", value: "all" }, ...data.map((r: any) => ({ label: r.name, value: r.id }))]);
      });
    }
  }, [isEmployeeDocument]);

  // Populate fields when modal opens
  useEffect(() => {
    if (document) {
      setDeptIds(document.departments?.length ? document.departments.map((d) => d.id) : ["all"]);
      setRoleIds(document.jobRoles?.length ? document.jobRoles.map((jr) => jr.id) : ["all"]);
      setCanAdmin(document.canViewAdmin);
      setCanManager(document.canViewManager);
      setCanEmployee(document.canViewEmployee);
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    const res = await fetch("/api/documents/update-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: document.id,
        canViewAdmin: canAdmin,
        canViewManager: canManager,
        canViewEmployee: canEmployee,
        departments: isEmployeeDocument ? [] : deptIds.includes("all") ? [] : deptIds,
        jobRoles: isEmployeeDocument ? [] : roleIds.includes("all") ? [] : roleIds,
      }),
    });

    if (res.ok) {
      toast("Access updated successfully");
      onSaved();
      onClose();
    } else {
      toast("Failed to update access");
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Access: {document.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Only show department/job role if NOT employee-specific */}
          {!isEmployeeDocument && (
            <>
              <div>
                <Label>Departments</Label>
                <MultiSelect
                  options={departmentsList}
                  selected={deptIds}
                  onChange={setDeptIds}
                  placeholder="Select Departments"
                />
              </div>
              <div>
                <Label>Job Roles</Label>
                <MultiSelect
                  options={jobRolesList}
                  selected={roleIds}
                  onChange={setRoleIds}
                  placeholder="Select Job Roles"
                />
              </div>
            </>
          )}

          {/* Access toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <Switch checked={canAdmin} onChange={setCanAdmin} />
              <span>Admin</span>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={canManager} onChange={setCanManager} />
              <span>Manager</span>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={canEmployee} onChange={setCanEmployee} />
              <span>Employee</span>
            </label>
          </div>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
