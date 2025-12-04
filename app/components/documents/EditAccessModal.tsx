"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/MultiSelect";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { 
  FileText, 
  Shield, 
  Users, 
  Building2, 
  Briefcase,
  CheckCircle2,
  FileSignature,
  Calendar,
  Loader2
} from "lucide-react";

type Department = { id: string; name: string };
type JobRole = { id: string; name: string };
type Document = {
  id: string;
  name: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  requiresAck?: boolean;
  requiresSignature?: boolean;
  signatureDueAt?: string | null;
  departments?: Department[];
  jobRoles?: JobRole[];
};

interface EditAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSaved: () => void;
  isEmployeeDocument?: boolean;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

export default function EditAccessModal({
  isOpen,
  onClose,
  document,
  onSaved,
  isEmployeeDocument = false,
}: EditAccessModalProps) {
  const tenantFetch = useTenantFetch();
  const [documentName, setDocumentName] = useState("");
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [canAdmin, setCanAdmin] = useState(false);
  const [canManager, setCanManager] = useState(false);
  const [canEmployee, setCanEmployee] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureDueAt, setSignatureDueAt] = useState<string>("");
  const [signerDepartments, setSignerDepartments] = useState<string[]>([]);
  const [signerJobRoles, setSignerJobRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<
    { label: string; value: string }[]
  >([]);
  const [jobRolesList, setJobRolesList] = useState<
    { label: string; value: string }[]
  >([]);

  // Fetch dropdowns if not employee document
  useEffect(() => {
    if (!isEmployeeDocument && isOpen) {
      tenantFetch("/api/departments/active")
        .then((res) => res.json())
        .then((data) => {
          setDepartmentsList([
            { label: "All Departments", value: "all" },
            ...data.map((d: any) => ({ label: d.name, value: d.id })),
          ]);
        });
      tenantFetch("/api/job-roles/active")
        .then((res) => res.json())
        .then((data) => {
          setJobRolesList([
            { label: "All Job Roles", value: "all" },
            ...data.map((r: any) => ({ label: r.name, value: r.id })),
          ]);
        });
    }
  }, [isEmployeeDocument, isOpen]);

  // Populate fields when modal opens
  useEffect(() => {
    if (document) {
      setDocumentName(document.name || "");
      setDeptIds(
        document.departments?.length
          ? document.departments.map((d) => d.id)
          : ["all"],
      );
      setRoleIds(
        document.jobRoles?.length
          ? document.jobRoles.map((jr) => jr.id)
          : ["all"],
      );
      setCanAdmin(document.canViewAdmin);
      setCanManager(document.canViewManager);
      setCanEmployee(document.canViewEmployee);
      setRequiresAck(document.requiresAck || false);
      setRequiresSignature(document.requiresSignature || false);
      setSignatureDueAt(document.signatureDueAt || "");
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    
    if (!documentName.trim()) {
      toast.error("Document name cannot be empty");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await tenantFetch("/api/documents/update-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          name: documentName.trim(),
          canViewAdmin: canAdmin,
          canViewManager: canManager,
          canViewEmployee: canEmployee,
          requiresAck,
          // Only send signature data for employee documents
          requiresSignature: isEmployeeDocument ? requiresSignature : false,
          signatureDueAt: isEmployeeDocument && requiresSignature ? (signatureDueAt || null) : null,
          signerDepartments: isEmployeeDocument ? signerDepartments : [],
          signerJobRoles: isEmployeeDocument ? signerJobRoles : [],
          departmentIds: isEmployeeDocument
            ? []
            : deptIds.includes("all")
              ? []
              : deptIds,
          jobRoleIds: isEmployeeDocument
            ? []
            : roleIds.includes("all")
              ? []
              : roleIds,
        }),
      });

      if (res.ok) {
        toast.success("Document updated successfully");
        onSaved();
        onClose();
      } else {
        toast.error("Failed to update document");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-slate-200/60 dark:border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent dark:from-emerald-900/20" />
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900 dark:text-white">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Edit Document
            </DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Update document settings and access permissions
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Document Name Section */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-emerald-600" />
              Document Name
            </div>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              className="w-full h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </motion.div>

          {/* Visibility Section - Only for company-wide documents */}
          {!isEmployeeDocument && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.05 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-blue-600" />
                Visibility
              </div>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Departments</Label>
                  <MultiSelect
                    options={departmentsList}
                    selected={deptIds}
                    onChange={setDeptIds}
                    placeholder="Select departments..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Job Roles</Label>
                  <MultiSelect
                    options={jobRolesList}
                    selected={roleIds}
                    onChange={setRoleIds}
                    placeholder="Select job roles..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Access Permissions Section */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Shield className="w-4 h-4 text-violet-600" />
              Access Permissions
            </div>
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCanAdmin(!canAdmin)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                  canAdmin 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-lg ${canAdmin ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <Shield className={`w-4 h-4 ${canAdmin ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  </div>
                  <span className={`text-xs font-medium ${canAdmin ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
                    Admin
                  </span>
                </div>
                {canAdmin && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCanManager(!canManager)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                  canManager 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-lg ${canManager ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <Briefcase className={`w-4 h-4 ${canManager ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  </div>
                  <span className={`text-xs font-medium ${canManager ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
                    Manager
                  </span>
                </div>
                {canManager && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCanEmployee(!canEmployee)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                  canEmployee 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-lg ${canEmployee ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <Users className={`w-4 h-4 ${canEmployee ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  </div>
                  <span className={`text-xs font-medium ${canEmployee ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
                    Employee
                  </span>
                </div>
                {canEmployee && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Acknowledgement Section */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Requires Acknowledgement
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Employees must confirm they've read this document
                  </p>
                </div>
              </div>
              <Switch 
                checked={requiresAck} 
                onChange={setRequiresAck}
              />
            </div>
          </motion.div>

          {/* Signature Section - Only for employee documents */}
          {isEmployeeDocument && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <FileSignature className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Requires Signature
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Employee must sign this document
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={requiresSignature} 
                  onChange={setRequiresSignature}
                />
              </div>

              <AnimatePresence>
                {requiresSignature && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Signature Due Date (optional)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={signatureDueAt}
                        onChange={(e) => setSignatureDueAt(e.target.value)}
                        className="h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/60 dark:border-slate-800">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={isSaving || !documentName.trim()}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
