"use client";

import React, {
  ChangeEvent,
  KeyboardEvent,
  useMemo,
  useState,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  CheckCircle,
  User,
  Send,
  MapPin,
  MessageSquare,
  CalendarDays,
  FileText,
  Sparkles,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

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
      className="h-9 rounded-lg"
    />
  </div>
);

const filterBySearch = <T,>(
  items: T[],
  accessor: (item: T) => string | undefined,
  query: string
) => {
  const normalized = normalizeSearch(query);
  if (!normalized) return items;
  return items.filter((item) => {
    const value = accessor(item);
    if (!value) return false;
    return value.toLowerCase().includes(normalized);
  });
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  jobRoleName?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
}

interface OffboardingModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

interface OffboardingFormData {
  exitInterviewDate: Date | undefined;
  exitInterviewTime: string;
  exitInterviewDuration: number;
  interviewerUserId: string;
  interviewerName: string;
  interviewerEmail: string;
  location: string;
  notes: string;
  sendForm: boolean;
  formTemplateId: string;
  formTiming: "NOW" | "ON_DATE";
}

const durationOptions = [
  { value: 10, label: "10 minutes", description: "Quick check-in" },
  { value: 20, label: "20 minutes", description: "Brief discussion" },
  { value: 30, label: "30 minutes", description: "Standard" },
  { value: 40, label: "40 minutes", description: "Extended" },
  { value: 50, label: "50 minutes", description: "Comprehensive" },
  { value: 60, label: "60 minutes", description: "Full session" },
];

export default function EnhancedOffboardingModal({
  open,
  onClose,
  employee,
  onSuccess,
}: OffboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [interviewerSearch, setInterviewerSearch] = useState("");
  const [isInterviewerSelectOpen, setIsInterviewerSelectOpen] = useState(false);
  const [formData, setFormData] = useState<OffboardingFormData>({
    exitInterviewDate: undefined,
    exitInterviewTime: "09:00",
    exitInterviewDuration: 60,
    interviewerUserId: "",
    interviewerName: "",
    interviewerEmail: "",
    location: "",
    notes: "",
    sendForm: false,
    formTemplateId: "",
    formTiming: "NOW",
  });

  const getUserDisplayName = (user: User) =>
    user.firstName || user.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : user.email ?? "";

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const lastNameCompare = (a.lastName || "").localeCompare(
        b.lastName || "",
        undefined,
        { sensitivity: "base" }
      );
      if (lastNameCompare !== 0) return lastNameCompare;
      const firstNameCompare = (a.firstName || "").localeCompare(
        b.firstName || "",
        undefined,
        { sensitivity: "base" }
      );
      if (firstNameCompare !== 0) return firstNameCompare;
      return (a.email || "").localeCompare(b.email || "", undefined, {
        sensitivity: "base",
      });
    });
  }, [users]);

  const shouldShowInterviewerSearch = sortedUsers.length > 10;
  const interviewerOptions = useMemo(
    () =>
      shouldShowInterviewerSearch
        ? filterBySearch(
            sortedUsers,
            (user) => getUserDisplayName(user),
            interviewerSearch
          )
        : sortedUsers,
    [sortedUsers, interviewerSearch, shouldShowInterviewerSearch]
  );

  const handleInterviewerOpenChange = (open: boolean) => {
    setIsInterviewerSelectOpen(open);
    if (!open) setInterviewerSearch("");
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchFormTemplates();
      resetForm();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: User) => user.id !== employee?.id));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchFormTemplates = async () => {
    try {
      const response = await fetch(
        "/api/exit-interview-templates?activeOnly=true"
      );
      if (response.ok) {
        const data = await response.json();
        setFormTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching form templates:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      exitInterviewDate: undefined,
      exitInterviewTime: "09:00",
      exitInterviewDuration: 60,
      interviewerUserId: "",
      interviewerName: "",
      interviewerEmail: "",
      location: "",
      notes: "",
      sendForm: false,
      formTemplateId: "",
      formTiming: "NOW",
    });
  };

  const handleInterviewerChange = (userId: string) => {
    if (userId === "other") {
      setFormData((prev) => ({
        ...prev,
        interviewerUserId: "",
        interviewerName: "",
        interviewerEmail: "",
      }));
    } else {
      const selectedUser = users.find((user) => user.id === userId);
      if (selectedUser) {
        setFormData((prev) => ({
          ...prev,
          interviewerUserId: userId,
          interviewerName: `${selectedUser.firstName} ${selectedUser.lastName}`,
          interviewerEmail: selectedUser.email,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) return;

    if (!formData.exitInterviewDate) {
      toast.error("Please select an exit interview date");
      return;
    }

    if (
      !formData.interviewerUserId &&
      (!formData.interviewerName || !formData.interviewerEmail)
    ) {
      toast.error(
        "Please select an interviewer or provide interviewer details"
      );
      return;
    }

    if (formData.sendForm && !formData.formTemplateId) {
      toast.error("Please select a form template");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/offboarding/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          exitInterviewDate: formData.exitInterviewDate
            ? format(formData.exitInterviewDate, "yyyy-MM-dd")
            : null,
          exitInterviewTime: formData.exitInterviewTime,
          exitInterviewDuration: formData.exitInterviewDuration,
          interviewerUserId: formData.interviewerUserId || null,
          interviewerName: formData.interviewerName || null,
          interviewerEmail: formData.interviewerEmail || null,
          location: formData.location,
          notes: formData.notes,
          sendForm: formData.sendForm,
          formTemplateId: formData.sendForm ? formData.formTemplateId : null,
          formTiming: formData.sendForm ? formData.formTiming : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate offboarding");
      }

      const result = await response.json();

      toast.success("Offboarding initiated successfully");

      if (result.offboarding.emailSent) {
        toast.success("Exit interview confirmation email sent");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error initiating offboarding:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initiate offboarding"
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = useMemo(() => {
    if (!formData.exitInterviewDate) return false;
    if (
      !formData.interviewerUserId &&
      (!formData.interviewerName || !formData.interviewerEmail)
    )
      return false;
    if (formData.sendForm && !formData.formTemplateId) return false;
    return true;
  }, [formData]);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-violet-500/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl" />

          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25">
                <UserMinus className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Schedule Exit Interview
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Set up the exit interview for {employee.firstName}{" "}
                  {employee.lastName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Employee Card */}
              <motion.div
                variants={fadeInUp}
                className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="font-semibold">
                        {employee.firstName} {employee.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-sm truncate">
                        {employee.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium text-sm">
                        {employee.departmentName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Job Role</p>
                      <p className="font-medium text-sm">
                        {employee.jobRoleName || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Interview Schedule Section */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-border/50 bg-background/50 overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10">
                      <CalendarDays className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">Interview Schedule</h3>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Interview Date <span className="text-rose-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left h-11 rounded-xl",
                              !formData.exitInterviewDate &&
                                "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.exitInterviewDate ? (
                              format(formData.exitInterviewDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.exitInterviewDate}
                            onSelect={(date) =>
                              setFormData((prev) => ({
                                ...prev,
                                exitInterviewDate: date,
                              }))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Interview Time
                      </Label>
                      <Input
                        type="time"
                        value={formData.exitInterviewTime}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            exitInterviewTime: e.target.value,
                          }))
                        }
                        required
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Duration</Label>
                      <Select
                        value={formData.exitInterviewDuration.toString()}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            exitInterviewDuration: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {option.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Interviewer <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      open={isInterviewerSelectOpen}
                      onOpenChange={handleInterviewerOpenChange}
                      value={formData.interviewerUserId || "other"}
                      onValueChange={handleInterviewerChange}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {shouldShowInterviewerSearch && (
                          <SelectSearchInput
                            value={interviewerSearch}
                            onChange={setInterviewerSearch}
                            placeholder="Search interviewers..."
                          />
                        )}
                        {interviewerOptions.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                {user.firstName?.charAt(0) ||
                                  user.email?.charAt(0)}
                              </div>
                              <span>
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="other">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-3 h-3" />
                            </div>
                            <span>Other (external)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(!formData.interviewerUserId ||
                    formData.interviewerUserId === "other") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/30"
                    >
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Interviewer Name
                        </Label>
                        <Input
                          value={formData.interviewerName}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              interviewerName: e.target.value,
                            }))
                          }
                          placeholder="Enter interviewer name"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Interviewer Email
                        </Label>
                        <Input
                          type="email"
                          value={formData.interviewerEmail}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              interviewerEmail: e.target.value,
                            }))
                          }
                          placeholder="Enter interviewer email"
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Location
                    </Label>
                    <Input
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Meeting room, online link, etc."
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      Notes
                    </Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Additional notes for the exit interview"
                      rows={3}
                      className="rounded-xl resize-none"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Exit Interview Form Section */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-border/50 bg-background/50 overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-emerald-500/5 to-green-500/5 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <FileText className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold">Exit Interview Form</h3>
                    </div>
                    <Checkbox
                      id="sendForm"
                      checked={formData.sendForm}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          sendForm: checked as boolean,
                        }))
                      }
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {formData.sendForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4 bg-emerald-500/5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Form Template <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={formData.formTemplateId}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                formTemplateId: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select form template" />
                            </SelectTrigger>
                            <SelectContent>
                              {formTemplates.length === 0 ? (
                                <SelectItem value="" disabled>
                                  No templates available
                                </SelectItem>
                              ) : (
                                formTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-emerald-500" />
                                      <span>{template.name}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            When should the form be sent?
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  formTiming: "NOW",
                                }))
                              }
                              className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                formData.formTiming === "NOW"
                                  ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                                  : "border-border/50 hover:border-border bg-background/50"
                              )}
                            >
                              <Sparkles
                                className={cn(
                                  "w-5 h-5",
                                  formData.formTiming === "NOW"
                                    ? "text-emerald-500"
                                    : "text-muted-foreground"
                                )}
                              />
                              <div className="text-left">
                                <p className="font-medium text-sm">Send Now</p>
                                <p className="text-xs text-muted-foreground">
                                  Send immediately
                                </p>
                              </div>
                              {formData.formTiming === "NOW" && (
                                <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                              )}
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  formTiming: "ON_DATE",
                                }))
                              }
                              className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                formData.formTiming === "ON_DATE"
                                  ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                                  : "border-border/50 hover:border-border bg-background/50"
                              )}
                            >
                              <CalendarDays
                                className={cn(
                                  "w-5 h-5",
                                  formData.formTiming === "ON_DATE"
                                    ? "text-emerald-500"
                                    : "text-muted-foreground"
                                )}
                              />
                              <div className="text-left">
                                <p className="font-medium text-sm">On Interview Date</p>
                                <p className="text-xs text-muted-foreground">
                                  Send on scheduled date
                                </p>
                              </div>
                              {formData.formTiming === "ON_DATE" && (
                                <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <Clock className="w-4 h-4" />
                    </motion.div>
                    Initiating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
