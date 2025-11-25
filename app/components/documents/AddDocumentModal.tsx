"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import SignatureCapture from "@/components/documents/SignatureCapture";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";
import { 
  FileText, 
  Building2, 
  User, 
  Upload, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Shield,
  PenLine,
  FolderOpen,
  X,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock,
  FileUp
} from "lucide-react";

// Helper functions for searchable dropdowns
const normalizeSearch = (value: string) => value.trim().toLowerCase();

const SelectSearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="sticky top-0 z-10 bg-popover p-2 border-b border-muted/40">
    <Input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search..."}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.stopPropagation()}
      autoFocus
      className="h-9"
    />
  </div>
);

const filterBySearch = <T,>(
  items: T[],
  accessor: (item: T) => string | undefined,
  query: string,
) => {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const value = accessor(item);
    if (!value) {
      return false;
    }
    return value.toLowerCase().includes(normalized);
  });
};

export default function AddDocumentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const tenantFetch = useTenantFetch();
  const [type, setType] = useState<"employee" | "company" | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);

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

  // Reset signature state when switching to company type (company docs only support acknowledgement)
  useEffect(() => {
    if (type === "company") {
      setRequiresSignature(false);
      setSignatureDueAt("");
      setSignerDepartments([]);
      setSignerJobRoles([]);
      setSignerEmployees([]);
    }
  }, [type]);

  // Helper function to get employee display name
  const getEmployeeDisplayName = (emp: any) =>
    (emp.firstName || emp.lastName)
      ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
      : emp.email ?? "";

  // Sort and filter employees for dropdown
  const sortedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return [...employees].sort((a, b) => {
      const lastNameCompare = (a.lastName || "").localeCompare(b.lastName || "", undefined, {
        sensitivity: "base",
      });
      if (lastNameCompare !== 0) return lastNameCompare;

      const firstNameCompare = (a.firstName || "").localeCompare(b.firstName || "", undefined, {
        sensitivity: "base",
      });
      if (firstNameCompare !== 0) return firstNameCompare;

      return (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" });
    });
  }, [employees]);

  const shouldShowEmployeeSearch = sortedEmployees.length > 10;
  const employeeOptions = useMemo(
    () =>
      shouldShowEmployeeSearch
        ? filterBySearch(sortedEmployees, (emp) => getEmployeeDisplayName(emp), employeeSearch)
        : sortedEmployees,
    [sortedEmployees, employeeSearch, shouldShowEmployeeSearch],
  );

  const handleEmployeeOpenChange = (open: boolean) => {
    setIsEmployeeSelectOpen(open);
    if (!open) setEmployeeSearch("");
  };

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

        // Ensure employees is always an array
        const employeesData = Array.isArray(empRes) ? empRes : [];
        setEmployees(employeesData);
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

  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/document-categories");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.categories || [];
        setCategoriesList(items);
      } else {
        // Fallback defaults if API not available
        setCategoriesList([
          "Contract",
          "Visa",
          "Right to Work",
          "Passport",
          "Training Certificate",
          "ID Document",
          "Policy",
          "Performance Review",
          "Other",
        ]);
      }
    } catch {
      setCategoriesList([
        "Contract",
        "Visa",
        "Right to Work",
        "Passport",
        "Training Certificate",
        "ID Document",
        "Policy",
        "Performance Review",
        "Other",
      ]);
    }
  };
  useEffect(() => {
    if (open) loadCategories();
  }, [open]);

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategoriesList((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategory(trimmed);
  };

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

      const res = await tenantFetch("/api/documents/upload", {
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
          await tenantFetch(`/api/documents/signature-fields/${payload.Document.id}` as any, {
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
      const res = await tenantFetch("/api/documents/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      const payload = await res.json();
      if (requiresSignature && fields && fields.length > 0 && payload?.Document?.id) {
        await tenantFetch(`/api/documents/signature-fields/${payload.Document.id}` as any, {
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

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent rawContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Upload Document
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add a new document to your organisation
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
            {/* Step 1: Type Selector - Compact Cards */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/80">Document Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  onClick={() => setType("employee")}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                    type === "employee" 
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                      : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  {type === "employee" && (
                    <motion.div
                      layoutId="typeIndicator"
                      className="absolute top-2 right-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${type === "employee" ? "bg-primary/20" : "bg-muted/50"}`}>
                      <User className={`w-4 h-4 ${type === "employee" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${type === "employee" ? "text-primary" : "text-foreground"}`}>
                        Employee Document
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Tied to one specific employee
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setType("company")}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                    type === "company" 
                      ? "border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/10" 
                      : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-violet-500/30 hover:bg-violet-500/5"
                  }`}
                >
                  {type === "company" && (
                    <motion.div
                      layoutId="typeIndicator"
                      className="absolute top-2 right-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${type === "company" ? "bg-violet-500/20" : "bg-muted/50"}`}>
                      <Building2 className={`w-4 h-4 ${type === "company" ? "text-violet-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${type === "company" ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                        Company Document
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Visible to all or specific groups
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Employee Document Fields */}
            <AnimatePresence mode="wait">
              {type === "employee" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <Label className="text-xs font-medium text-foreground/80">Select Employee</Label>
                  <Select 
                    open={isEmployeeSelectOpen}
                    onOpenChange={handleEmployeeOpenChange}
                    onValueChange={setEmployeeId}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 text-sm">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {shouldShowEmployeeSearch && (
                        <SelectSearchInput
                          value={employeeSearch}
                          onChange={setEmployeeSearch}
                          placeholder="Search employees..."
                        />
                      )}
                      {employeeOptions.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* Company Document Fields */}
              {type === "company" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Restrict by Department</Label>
                    <MultiSelect
                      options={departmentsList}
                      selected={selectedDepartments}
                      onChange={(values) =>
                        values.includes("all")
                          ? setSelectedDepartments(["all"])
                          : setSelectedDepartments(values)
                      }
                      placeholder="Select department(s)"
                      searchable
                      searchPlaceholder="Search departments..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Restrict by Job Role</Label>
                    <MultiSelect
                      options={jobRolesList}
                      selected={selectedJobRoles}
                      onChange={(values) =>
                        values.includes("all")
                          ? setSelectedJobRoles(["all"])
                          : setSelectedJobRoles(values)
                      }
                      placeholder="Select job role(s)"
                      searchable
                      searchPlaceholder="Search job roles..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Document Details Section */}
            {type && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Document Details</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">
                      Title <span className="text-primary">*</span>
                    </Label>
                    <Input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Enter document title"
                      className="h-9 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Category</Label>
                    <Select
                      value={category || undefined}
                      onValueChange={(v) => {
                        if (v === "__new__") {
                          setManageCategoriesOpen(true);
                        } else {
                          setCategory(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesList.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                        <div className="border-t border-muted/30 mt-1 pt-1">
                          <SelectItem value="__new__">
                            <span className="text-primary">+ Add new category</span>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description of the document..."
                    className="min-h-[60px] rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 text-sm resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Settings Panels */}
            {type && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className="space-y-3"
              >
                {/* Visibility (Employee only) - Compact inline */}
                {type === "employee" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-sm">Visibility</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch checked={canViewAdmin} onChange={setCanViewAdmin} />
                        <span className="text-xs font-medium">Admin</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch checked={canViewManager} onChange={setCanViewManager} />
                        <span className="text-xs font-medium">Manager</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch checked={canViewEmployee} onChange={setCanViewEmployee} />
                        <span className="text-xs font-medium">Employee</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Compliance Section - Compact */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-sm">Compliance Requirements</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-sm cursor-pointer">Requires Acknowledgement</Label>
                          <p className="text-xs text-muted-foreground">Employee must confirm reading</p>
                        </div>
                      </div>
                      <Switch checked={requiresAck} onChange={setRequiresAck} />
                    </div>
                    {type === "employee" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PenLine className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label className="text-sm cursor-pointer">Requires Signature</Label>
                            <p className="text-xs text-muted-foreground">Document needs to be signed</p>
                          </div>
                        </div>
                        <Switch checked={requiresSignature} onChange={setRequiresSignature} />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {requiresSignature && type === "employee" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-3 border-t border-muted/30"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Signature Due Date
                          </Label>
                          <Input
                            type="datetime-local"
                            value={signatureDueAt}
                            onChange={(e) => setSignatureDueAt(e.target.value)}
                            className="h-9 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 text-sm"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* File Upload Section - Compact Drag & Drop */}
            {type && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                className="space-y-1.5"
              >
                <Label className="text-xs font-medium text-foreground/80">
                  Upload File <span className="text-primary">*</span>
                </Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 ${
                    isDragging 
                      ? "border-primary bg-primary/10 scale-[1.01]" 
                      : file 
                        ? "border-emerald-500 bg-emerald-500/10" 
                        : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {file ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-emerald-600 dark:text-emerald-400 text-sm truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-muted-foreground hover:text-destructive h-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isDragging ? "bg-primary/20" : "bg-muted/50"
                      }`}>
                        <Upload className={`w-5 h-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground text-sm">
                          {isDragging ? "Drop file here" : "Drag & drop or click to upload"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, Word, Excel, or image files
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            {file && type && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-end gap-3 pt-2"
              >
                {requiresSignature ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPlacementBeforeSendOpen(true)}
                      className="h-9 rounded-lg"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview & Place Fields
                    </Button>
                    <Button
                      type="button"
                      onClick={() => uploadWithPending(pendingFields)}
                      disabled={loading || !title}
                      className="h-9 px-5 rounded-lg bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                          />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="button"
                    onClick={handleSubmit} 
                    disabled={loading || !title}
                    className="h-9 px-5 rounded-lg bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </div>
      </DialogContent>
    {/* Manage Categories Modal */}
    <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
      <DialogContent rawContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-md max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Manage Categories</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-auto rounded-xl border border-muted/30 bg-white/30 dark:bg-white/5">
                {categoriesList.map((c) => (
                  <div key={c} className="flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium">{c}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/document-categories", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: c }),
                          });
                          if (!res.ok) throw new Error("Failed to delete category");
                          setCategoriesList((prev) => prev.filter((x) => x !== c));
                          if (category === c) setCategory("");
                        } catch (e: any) {
                          toast.error(e.message);
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {categoriesList.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">No categories yet.</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5"
                />
                <Button
                  className="h-11 px-5 rounded-xl"
                  onClick={async () => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    try {
                      const res = await fetch("/api/document-categories", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name }),
                      });
                      if (!res.ok) throw new Error("Failed to add category");
                      setCategoriesList((prev) => (prev.includes(name) ? prev : [...prev, name]));
                      setCategory(name);
                      setNewCategoryName("");
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-muted/30 flex justify-end">
              <Button variant="ghost" onClick={() => setManageCategoriesOpen(false)} className="rounded-xl">
                Done
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
      {/* Placement before upload (local) */}
      <FieldPlacementModal
        isOpen={isPlacementBeforeSendOpen}
        onClose={() => setIsPlacementBeforeSendOpen(false)}
        documentId={"local"}
        url={objectUrl}
        saveMode="local"
        onSaveFields={(f) => setPendingFields(f)}
        isInitialUpload
        onDiscard={() => {
          setIsPlacementBeforeSendOpen(false);
          setPendingFields(null);
          setFile(null);
          onClose(); // Close the main upload modal too if they completely discard
        }}
      />
    </Dialog>
  );
}
