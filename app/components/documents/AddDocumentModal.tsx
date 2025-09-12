"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { fetchEmployees } from "@/lib/fetchData";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/MultiSelect";

export default function AddDocumentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [type, setType] = useState<"employee" | "company" | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  // ✅ Departments & Job Roles for Company Docs
  const [departmentsList, setDepartmentsList] = useState<
    { label: string; value: string }[]
  >([]);
  const [jobRolesList, setJobRolesList] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    "all",
  ]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>(["all"]);

  // ✅ Access control state
  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  // --- ADDED: Requires Acknowledgement state ---
  const [requiresAck, setRequiresAck] = useState(false);

  const user = session?.user;

  // ✅ Fetch employees, departments, job roles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, deptRes, roleRes] = await Promise.all([
          fetchEmployees(),
          fetch("/api/departments/active"),
          fetch("/api/job-roles/active"),
        ]);

        const deptData = await deptRes.json();
        const roleData = await roleRes.json();

        setEmployees(empRes);
        setDepartmentsList([
          { label: "All Departments", value: "all" },
          ...deptData.map((d: any) => ({ label: d.name, value: d.id })),
        ]);
        setJobRolesList([
          { label: "All Job Roles", value: "all" },
          ...roleData.map((r: any) => ({ label: r.name, value: r.id })),
        ]);
      } catch (err) {
        console.error(
          "Failed to fetch employees, departments, or job roles",
          err,
        );
      }
    };
    if (open) loadData();
  }, [open]);

  const categories = [
    "Contract",
    "Visa",
    "Right to Work",
    "Passport",
    "Training Certificate",
    "ID Document",
    "Policy",
    "Performance Review",
    "Other",
  ];

  const handleSubmit = async () => {
    if (!title || !file || !user?.id) {
      toast.error("Title, file, and user must be provided");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", title);
      formData.append("category", category || "");
      formData.append("description", description || "");
      formData.append("employeeId", type === "employee" ? employeeId : "");
      formData.append("type", type || "");

      if (type === "company") {
        // ✅ Send multi-select departments & job roles
        formData.append(
          "departments",
          JSON.stringify(
            selectedDepartments.includes("all") ? [] : selectedDepartments,
          ),
        );
        formData.append(
          "jobRoles",
          JSON.stringify(
            selectedJobRoles.includes("all") ? [] : selectedJobRoles,
          ),
        );
      }

      // ✅ Include access rights
      formData.append("canViewAdmin", String(canViewAdmin));
      formData.append("canViewManager", String(canViewManager));
      formData.append("canViewEmployee", String(canViewEmployee));

      // --- ADDED: Requires Acknowledgement ---
      formData.append("requiresAck", String(requiresAck));

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "API call failed");
      }

      toast.success("Document uploaded successfully");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
        </DialogHeader>

        {/* Step 1: Type Selector */}
        <div className="flex gap-4">
          <div
            onClick={() => setType("employee")}
            className={`flex-1 border p-4 rounded-xl cursor-pointer ${type === "employee" ? "ring-2 ring-blue-500" : ""}`}
          >
            <h4 className="font-semibold mb-1">Employee Document</h4>
            <p className="text-sm text-muted-foreground">
              Tied to one specific employee
            </p>
          </div>
          <div
            onClick={() => setType("company")}
            className={`flex-1 border p-4 rounded-xl cursor-pointer ${type === "company" ? "ring-2 ring-blue-500" : ""}`}
          >
            <h4 className="font-semibold mb-1">Company Document</h4>
            <p className="text-sm text-muted-foreground">
              Visible to all or specific departments/job roles
            </p>
          </div>
        </div>

        {/* Employee Document Fields */}
        {type === "employee" && (
          <div>
            <Label>Select Employee</Label>
            <Select onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Company Document Fields */}
        {type === "company" && (
          <>
            <div>
              <Label>Restrict by Department</Label>
              <MultiSelect
                options={departmentsList}
                selected={selectedDepartments}
                onChange={(values) =>
                  values.includes("all")
                    ? setSelectedDepartments(["all"])
                    : setSelectedDepartments(values)
                }
                placeholder="Select department(s)"
              />
            </div>
            <div>
              <Label>Restrict by Job Role</Label>
              <MultiSelect
                options={jobRolesList}
                selected={selectedJobRoles}
                onChange={(values) =>
                  values.includes("all")
                    ? setSelectedJobRoles(["all"])
                    : setSelectedJobRoles(values)
                }
                placeholder="Select job role(s)"
              />
            </div>
          </>
        )}

        {/* Shared Fields */}
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label>Category</Label>
          <Select onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* ✅ Access Rights (Employee Only) */}
        {type === "employee" && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Admin Access</Label>
              <Switch
                checked={canViewAdmin}
                onChange={(checked) => setCanViewAdmin(checked)}
              />
            </div>
            <div>
              <Label>Manager Access</Label>
              <Switch
                checked={canViewManager}
                onChange={(checked) => setCanViewManager(checked)}
              />
            </div>
            <div>
              <Label>Employee Access</Label>
              <Switch
                checked={canViewEmployee}
                onChange={(checked) => setCanViewEmployee(checked)}
              />
            </div>
          </div>
        )}

        {/* --- ADDED: Requires Acknowledgement for both types --- */}
        {(type === "employee" || type === "company") && (
          <div>
            <Label>Requires Acknowledgement</Label>
            <Switch checked={requiresAck} onChange={setRequiresAck} />
          </div>
        )}

        <div>
          <Label>Upload File</Label>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Uploading..." : "Upload Document"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
