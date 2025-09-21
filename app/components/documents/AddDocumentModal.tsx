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
import SignatureCapture from "@/components/documents/SignatureCapture";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";

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
  const [newCategory, setNewCategory] = useState("");
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
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureDueAt, setSignatureDueAt] = useState<string>("");
  const [signerDepartments, setSignerDepartments] = useState<string[]>([]);
  const [signerJobRoles, setSignerJobRoles] = useState<string[]>([]);
  const [signerEmployees, setSignerEmployees] = useState<string[]>([]);
  const [isPlacementBeforeSendOpen, setIsPlacementBeforeSendOpen] = useState(false);
  const [pendingFields, setPendingFields] = useState<any[] | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>("");

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

      // --- ADDED: Signature requirements ---
      formData.append("requiresSignature", String(requiresSignature));
      if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
      if (type === "company") {
        formData.append(
          "signerDepartments",
          JSON.stringify(signerDepartments),
        );
        formData.append(
          "signerJobRoles",
          JSON.stringify(signerJobRoles),
        );
      }
      if (type === "employee" && employeeId) {
        formData.append("signerEmployees", JSON.stringify([employeeId]));
      } else if (signerEmployees.length) {
        formData.append("signerEmployees", JSON.stringify(signerEmployees));
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "API call failed");
      }

      const payload = await res.json();
      toast.success("Document uploaded successfully");
      if (requiresSignature && payload?.Document?.id) {
        // If we have pre-placement fields, post them now (server save) to preserve pre-upload UX
        if (pendingFields && pendingFields.length > 0) {
          await fetch(`/api/documents/signature-fields/${payload.Document.id}` as any, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pendingFields),
          });
        }
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Create a local object URL for preview when a file is selected
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file as any);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setObjectUrl("");
    }
  }, [file]);

  // Upload routine that can be triggered after local placement save
  const uploadWithPending = async (fields: any[] | null) => {
    if (!file || !title || !session?.user?.id) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", title);
      formData.append("category", category || "");
      formData.append("description", description || "");
      formData.append("employeeId", type === "employee" ? employeeId : "");
      formData.append("type", type || "");
      formData.append("canViewAdmin", String(canViewAdmin));
      formData.append("canViewManager", String(canViewManager));
      formData.append("canViewEmployee", String(canViewEmployee));
      formData.append("requiresAck", String(requiresAck));
      formData.append("requiresSignature", String(requiresSignature));
      if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
      if (type === "company") {
        formData.append("departments", JSON.stringify(selectedDepartments.includes("all") ? [] : selectedDepartments));
        formData.append("jobRoles", JSON.stringify(selectedJobRoles.includes("all") ? [] : selectedJobRoles));
        formData.append("signerDepartments", JSON.stringify(signerDepartments));
        formData.append("signerJobRoles", JSON.stringify(signerJobRoles));
      }
      if (type === "employee" && employeeId) {
        formData.append("signerEmployees", JSON.stringify([employeeId]));
      } else if (signerEmployees.length) {
        formData.append("signerEmployees", JSON.stringify(signerEmployees));
      }
      // No defer here; local placement happens pre-upload
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      const payload = await res.json();
      if (requiresSignature && fields && fields.length > 0 && payload?.Document?.id) {
        await fetch(`/api/documents/signature-fields/${payload.Document.id}` as any, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
      }
      toast.success("Document uploaded successfully");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
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
          <Select onValueChange={(v) => { setCategory(v); if (v !== "__new__") setNewCategory(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Add new category</SelectItem>
            </SelectContent>
          </Select>
          {category === "__new__" && (
            <Input
              className="mt-2"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onBlur={() => { if (newCategory.trim()) setCategory(newCategory.trim()); }}
            />
          )}
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

        {/* --- ADDED: Signature requirements --- */}
        {(type === "employee" || type === "company") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Requires Signature</Label>
              <Switch
                checked={requiresSignature}
                onChange={setRequiresSignature}
              />
            </div>
            {requiresSignature && (
              <div className="space-y-3">
                <div>
                  <Label>Signature due date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={signatureDueAt}
                    onChange={(e) => setSignatureDueAt(e.target.value)}
                  />
                </div>
                {type === "company" && (
                  <>
                    <div>
                      <Label>Signers: Departments</Label>
                      <MultiSelect
                        options={departmentsList}
                        selected={signerDepartments}
                        onChange={setSignerDepartments}
                        placeholder="Select departments required to sign"
                      />
                    </div>
                    <div>
                      <Label>Signers: Job Roles</Label>
                      <MultiSelect
                        options={jobRolesList}
                        selected={signerJobRoles}
                        onChange={setSignerJobRoles}
                        placeholder="Select job roles required to sign"
                      />
                    </div>
                    <div>
                      <Label>Additional Individual Signers</Label>
                      <MultiSelect
                        options={employees.map((e:any)=>({label:`${e.firstName} ${e.lastName} (${e.email})`, value:e.id}))}
                        selected={signerEmployees}
                        onChange={setSignerEmployees}
                        placeholder="Select specific employees"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Upload File</Label>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Primary action: Preview when requiresSignature, else Upload */}
        {requiresSignature ? (
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={!file}
              onClick={() => setIsPlacementBeforeSendOpen(true)}
            >
              Preview & Place Signature Fields
            </Button>
            <Button
              onClick={() => uploadWithPending(pendingFields)}
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        ) : (
          <Button onClick={handleSubmit} disabled={loading || !file}>
            {loading ? "Uploading..." : "Upload Document"}
          </Button>
        )}
      </DialogContent>
      {/* Placement before upload (local) */}
      <FieldPlacementModal
        isOpen={isPlacementBeforeSendOpen}
        onClose={() => setIsPlacementBeforeSendOpen(false)}
        documentId={"local"}
        url={objectUrl}
        saveMode="local"
        onSaveFields={(f) => setPendingFields(f)}
      />
    </Dialog>
  );
}
