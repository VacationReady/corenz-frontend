"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import {
  Users,
  Search,
  ArrowLeft,
  Mail,
  MessageSquare,
  Link2,
  TestTube,
  Info,
  Send,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MinimalEmployeeForEmail {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  departmentName?: string;
  jobRoleId: string | null;
  jobRoleName?: string;
  avatar: {
    path: string | null;
    signedUrl: string | null;
  };
}

interface EmailEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmailEmployeeModal({ open, onOpenChange }: EmailEmployeeModalProps) {
  const [employees, setEmployees] = useState<MinimalEmployeeForEmail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<MinimalEmployeeForEmail | null>(null);
  const [step, setStep] = useState<"select" | "compose">("select");

  // Message form state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sendTestTo, setSendTestTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load employees when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setEmployees(null);
      setLoading(false);
      setSearchQuery("");
      setSelectedEmployee(null);
      setStep("select");
      resetForm();
      return;
    }

    let active = true;
    const loadAllEmployees = async () => {
      setLoading(true);
      const allEmployees: MinimalEmployeeForEmail[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      try {
        while (hasMore) {
          const params = new URLSearchParams({ status: "active", limit: "100" });
          if (cursor) params.set("cursor", cursor);

          const res = await fetch(`/api/employees/minimal?${params.toString()}`, {
            cache: "no-store",
          });

          if (!res.ok) break;

          const data = await res.json();
          if (!active) return;

          if (Array.isArray(data?.data)) {
            allEmployees.push(...data.data.map((emp: any) => ({
              ...emp,
              email: emp.email || "",
            })));
          }

          cursor = data?.pagination?.cursor || null;
          hasMore = data?.pagination?.hasMore ?? false;
        }

        if (active) {
          setEmployees(allEmployees);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
        if (active) {
          setEmployees([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAllEmployees();
    return () => {
      active = false;
    };
  }, [open]);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return employees;
    return employees.filter((e) =>
      e.fullName.toLowerCase().includes(query) ||
      e.email?.toLowerCase().includes(query) ||
      e.departmentName?.toLowerCase().includes(query) ||
      e.jobRoleName?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const sortedEmployees = useMemo(() => {
    const toSortableName = (name: string) =>
      name
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();

    return [...filteredEmployees].sort((a, b) => {
      const aKey = toSortableName(a.fullName);
      const bKey = toSortableName(b.fullName);
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;

      const aDept = toSortableName(a.departmentName ?? "");
      const bDept = toSortableName(b.departmentName ?? "");
      if (aDept < bDept) return -1;
      if (aDept > bDept) return 1;

      return a.id.localeCompare(b.id);
    });
  }, [filteredEmployees]);

  const resetForm = () => {
    setSubject("");
    setPreviewText("");
    setBody("");
    setCtaLabel("");
    setCtaUrl("");
    setSendTestTo("");
  };

  const handleSelectEmployee = (employee: MinimalEmployeeForEmail) => {
    setSelectedEmployee(employee);
    setStep("compose");
  };

  const handleBack = () => {
    setSelectedEmployee(null);
    setStep("select");
    resetForm();
  };

  const canSubmit = subject.trim().length > 3 && body.trim().length > 5 && !submitting;

  const handleSendMessage = useCallback(async () => {
    if (!canSubmit || !selectedEmployee) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: [selectedEmployee.id],
          subject,
          previewText: previewText || undefined,
          body,
          ctaLabel: ctaLabel || undefined,
          ctaUrl: ctaUrl || undefined,
          sendTestTo: sendTestTo || undefined,
          reason: `Direct message to ${selectedEmployee.fullName}`,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to send message");
      }

      toast.success("Message sent!", {
        description: `Email sent to ${selectedEmployee.fullName}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to send message");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, selectedEmployee, subject, previewText, body, ctaLabel, ctaUrl, sendTestTo, onOpenChange]);

  const handleSendTest = useCallback(async () => {
    if (!sendTestTo || !subject.trim() || !body.trim()) {
      toast.error("Please fill in subject and body before sending a test");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: [],
          subject,
          previewText: previewText || undefined,
          body,
          ctaLabel: ctaLabel || undefined,
          ctaUrl: ctaUrl || undefined,
          sendTestTo,
          reason: "Test email",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to send test");
      }

      toast.success("Test email sent!", {
        description: `Check ${sendTestTo}`,
      });
    } catch (error: any) {
      toast.error(error?.message || "Unable to send test");
    } finally {
      setSubmitting(false);
    }
  }, [sendTestTo, subject, previewText, body, ctaLabel, ctaUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent rawContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 flex-shrink-0">
          {/* Custom Close Button */}
          <motion.button
            onClick={() => onOpenChange(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-4 top-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </motion.button>
          
          <div className="pr-10">
            <AnimatePresence mode="wait">
              {step === "select" ? (
                <motion.div
                  key="select-header"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Email Employee
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Select an employee to send them a message
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="compose-header"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3"
                >
                  <motion.button
                    onClick={handleBack}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>
                  <Avatar
                    size={40}
                    name={selectedEmployee?.fullName}
                    src={selectedEmployee?.avatar?.signedUrl || undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {selectedEmployee?.fullName}
                    </h2>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedEmployee?.email || "Compose your message"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === "select" ? (
              <motion.div
                key="select-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, department..."
                    className="h-10 pl-10 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all text-sm"
                  />
                </div>

                {/* Employee List */}
                <div className="max-h-[320px] overflow-y-auto space-y-1.5 -mr-2 pr-2">
                  {loading ? (
                    <div className="space-y-1.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {searchQuery ? "No employees match your search" : "No employees found"}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-sm text-primary hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    sortedEmployees.map((employee, index) => (
                      <motion.button
                        key={employee.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.015, duration: 0.2 }}
                        onClick={() => handleSelectEmployee(employee)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left",
                          "bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10",
                          "border border-transparent hover:border-sky-500/20",
                          "transition-all duration-200 group"
                        )}
                      >
                        <Avatar
                          size={40}
                          name={employee.fullName}
                          src={employee.avatar?.signedUrl || undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate group-hover:text-sky-600 transition-colors">
                            {employee.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.email || [employee.jobRoleName, employee.departmentName]
                              .filter(Boolean)
                              .join(" • ") || "No details"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    ))
                  )}
                </div>

                {/* Results count */}
                {!loading && employees && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground text-center pt-2"
                  >
                    {filteredEmployees.length} of {employees.length} employees
                  </motion.p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="compose-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Recipient Badge */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200/50 dark:border-sky-800/50">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-sky-700 dark:text-sky-400">
                    Sending to: {selectedEmployee?.fullName}
                  </span>
                  <span className="text-xs text-sky-600/70 dark:text-sky-500/70 ml-auto">
                    {selectedEmployee?.email}
                  </span>
                </div>

                {/* Message Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-sky-500" />
                      Subject Line
                    </Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter a compelling subject line"
                      className="h-10 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Preview Text
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                    </Label>
                    <Input
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      placeholder="Short summary for inbox previews"
                      className="h-10 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-sky-500" />
                      Message Body
                    </Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      placeholder="Write your message here..."
                      className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Links will be automatically detected
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center justify-between">
                        <span>CTA Button Label</span>
                        <span className="text-xs text-muted-foreground font-normal">Optional</span>
                      </Label>
                      <Input
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        placeholder="e.g. View Policy"
                        className="h-10 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        CTA URL
                      </Label>
                      <Input
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="https://..."
                        type="url"
                        className="h-10 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <TestTube className="h-4 w-4 text-blue-500" />
                      Send Test Email
                      <span className="text-xs text-muted-foreground font-normal ml-auto">Optional</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={sendTestTo}
                        onChange={(e) => setSendTestTo(e.target.value)}
                        placeholder="your-email@example.com"
                        type="email"
                        className="h-10 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 focus:border-sky-500 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendTest}
                        disabled={!sendTestTo || submitting}
                        className="h-10 rounded-xl"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-muted/30">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="flex-1 h-10 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!canSubmit}
                    className="flex-1 h-10 rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
