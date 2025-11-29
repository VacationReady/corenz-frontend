"use client";

import React, {
  ChangeEvent,
  KeyboardEvent,
  useMemo,
  useState,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
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
  AlertCircle,
  User,
  Clock,
  Shield,
  Package,
  Users,
  FileText,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  UserMinus,
  CalendarDays,
  Send,
  ClipboardList,
  BadgeCheck,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toUTCFromLondon } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";
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
      staggerChildren: 0.05,
    },
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// Collapsible Section Component
const FormSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  accentColor = "primary",
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose" | "blue" | "orange";
  badge?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const iconColors = {
    primary: "text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    blue: "text-blue-600 dark:text-blue-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  const bgColors = {
    primary: "from-primary/5 to-primary/10",
    emerald: "from-emerald-500/5 to-emerald-500/10",
    violet: "from-violet-500/5 to-violet-500/10",
    amber: "from-amber-500/5 to-amber-500/10",
    rose: "from-rose-500/5 to-rose-500/10",
    blue: "from-blue-500/5 to-blue-500/10",
    orange: "from-orange-500/5 to-orange-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200",
          isOpen && `bg-gradient-to-r ${bgColors[accentColor]}`
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl bg-gradient-to-br",
            bgColors[accentColor]
          )}>
            <Icon className={cn("w-4 h-4", iconColors[accentColor])} />
          </div>
          <span className="font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 pt-2 space-y-4 border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Search input for select dropdowns
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
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  jobRoleName?: string;
}

interface OffboardingModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
}

type FormTiming = "NOW" | "ON_DATE";

interface OffboardingFormData {
  lastWorkingDate: Date | null;
  offboardingType: string;
  offboardingReason: string;
  isVoluntary: boolean;
  noticePeriodDays: string;
  resignationDate: Date | null;
  removeAccessImmediately: boolean;
  handoverRequired: boolean;
  handoverAssignedTo: string;
  exitInterviewRequired: boolean;
  exitInterviewDate: Date | null;
  exitInterviewTime: string;
  exitInterviewDuration: number;
  exitInterviewInterviewer: string;
  sendForm: boolean;
  formTemplateId: string;
  formTiming: FormTiming;
  assetsToReturn: string[];
  hrNotes: string;
}

const offboardingTypes = [
  { value: "RESIGNATION", label: "Resignation", icon: UserMinus, color: "blue" },
  { value: "TERMINATION", label: "Termination", icon: AlertCircle, color: "rose" },
  { value: "RETIREMENT", label: "Retirement", icon: Clock, color: "amber" },
  { value: "END_OF_CONTRACT", label: "End of Contract", icon: FileText, color: "violet" },
  { value: "REDUNDANCY", label: "Redundancy", icon: Users, color: "orange" },
  { value: "OTHER", label: "Other", icon: FileText, color: "slate" },
];

const commonAssets = [
  { name: "Laptop/Computer", icon: "ðŸ’»" },
  { name: "Mobile Phone", icon: "ðŸ“±" },
  { name: "ID Card/Badge", icon: "ðŸªª" },
  { name: "Keys", icon: "ðŸ”‘" },
  { name: "Company Credit Card", icon: "ðŸ’³" },
  { name: "Uniform/Clothing", icon: "ðŸ‘”" },
  { name: "Tools/Equipment", icon: "ðŸ”§" },
  { name: "Vehicle", icon: "ðŸš—" },
  { name: "Documentation", icon: "ðŸ“„" },
];

// Step definitions
const steps = [
  {
    id: "basics",
    title: "Basics",
    description: "Type & dates",
    icon: CalendarDays,
  },
  {
    id: "details",
    title: "Details",
    description: "Access & handover",
    icon: ClipboardList,
  },
  {
    id: "exit",
    title: "Exit Process",
    description: "Interview & forms",
    icon: MessageSquare,
  },
];

export default function OffboardingModal({
  open,
  onClose,
  employee,
  onSuccess,
}: OffboardingModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [handoverSearch, setHandoverSearch] = useState("");
  const [interviewerSearch, setInterviewerSearch] = useState("");
  const [isHandoverSelectOpen, setIsHandoverSelectOpen] = useState(false);
  const [isInterviewerSelectOpen, setIsInterviewerSelectOpen] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);

  const [formData, setFormData] = useState<OffboardingFormData>({
    lastWorkingDate: null,
    offboardingType: "",
    offboardingReason: "",
    isVoluntary: true,
    noticePeriodDays: "",
    resignationDate: null,
    removeAccessImmediately: false,
    handoverRequired: false,
    handoverAssignedTo: "",
    exitInterviewRequired: false,
    exitInterviewDate: null,
    exitInterviewTime: "09:00",
    exitInterviewDuration: 60,
    exitInterviewInterviewer: "",
    sendForm: false,
    formTemplateId: "",
    formTiming: "NOW",
    assetsToReturn: [],
    hrNotes: "",
  });

  const paginate = (newDirection: number) => {
    console.log(`[Offboarding] paginate called: direction=${newDirection}, currentStep=${currentStep}`);
    const newStep = currentStep + newDirection;
    if (newStep >= 0 && newStep < steps.length) {
      setCurrentStep(newStep);
      setPage([newStep, newDirection]);
    }
  };

  // Helper function to get employee display name
  const getEmployeeDisplayName = (emp: Employee) =>
    emp.firstName || emp.lastName
      ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
      : emp.email ?? "";

  // Sort and filter employees for dropdowns
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
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
  }, [employees]);

  const shouldShowHandoverSearch = sortedEmployees.length > 10;
  const handoverOptions = useMemo(
    () =>
      shouldShowHandoverSearch
        ? filterBySearch(
            sortedEmployees,
            (emp) => getEmployeeDisplayName(emp),
            handoverSearch
          )
        : sortedEmployees,
    [sortedEmployees, handoverSearch, shouldShowHandoverSearch]
  );

  const shouldShowInterviewerSearch = sortedEmployees.length > 10;
  const interviewerOptions = useMemo(
    () =>
      shouldShowInterviewerSearch
        ? filterBySearch(
            sortedEmployees,
            (emp) => getEmployeeDisplayName(emp),
            interviewerSearch
          )
        : sortedEmployees,
    [sortedEmployees, interviewerSearch, shouldShowInterviewerSearch]
  );

  const handleHandoverOpenChange = (open: boolean) => {
    setIsHandoverSelectOpen(open);
    if (!open) setHandoverSearch("");
  };

  const handleInterviewerOpenChange = (open: boolean) => {
    setIsInterviewerSelectOpen(open);
    if (!open) setInterviewerSearch("");
  };

  const fetchEmployees = async () => {
    try {
      const headers: HeadersInit = {};
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const response = await fetch("/api/employees?status=active", { headers });
      if (response.ok) {
        const result = await response.json();
        const employeesList = result.data || result;
        setEmployees(
          employeesList.filter((emp: Employee) => emp.userId !== employee?.userId)
        );
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchFormTemplates();
      // Reset form when modal opens
      setFormData({
        lastWorkingDate: null,
        offboardingType: "",
        offboardingReason: "",
        isVoluntary: true,
        noticePeriodDays: "",
        resignationDate: null,
        removeAccessImmediately: false,
        handoverRequired: false,
        handoverAssignedTo: "",
        exitInterviewRequired: false,
        exitInterviewDate: null,
        exitInterviewTime: "09:00",
        exitInterviewDuration: 60,
        exitInterviewInterviewer: "",
        sendForm: false,
        formTemplateId: "",
        formTiming: "NOW",
        assetsToReturn: [],
        hrNotes: "",
      });
      setCurrentStep(0);
      setPage([0, 0]);
    }
  }, [open, session?.user?.companyId]);

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

  // Calculate notice period automatically
  const calculatedNoticePeriod = useMemo(() => {
    if (formData.resignationDate && formData.lastWorkingDate) {
      return differenceInDays(formData.lastWorkingDate, formData.resignationDate);
    }
    return null;
  }, [formData.resignationDate, formData.lastWorkingDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[Offboarding] handleSubmit called`);
    // Prevent accidental submission if not on final step
    if (currentStep !== 2) {
      console.log(`[Offboarding] Blocked submission - not on final step (currentStep=${currentStep})`);
      return;
    }

    if (!employee || !formData.lastWorkingDate || !formData.offboardingType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        lastWorkingDate: formData.lastWorkingDate,
        offboardingType: formData.offboardingType,
        offboardingReason: formData.offboardingReason,
        isVoluntary: formData.isVoluntary,
        noticePeriodDays: formData.noticePeriodDays
          ? parseInt(formData.noticePeriodDays)
          : null,
        resignationDate: formData.resignationDate,
        removeAccessImmediately: formData.removeAccessImmediately,
        handoverRequired: formData.handoverRequired,
        handoverAssignedTo: formData.handoverAssignedTo,
        exitInterviewRequired: formData.exitInterviewRequired,
        assetsToReturn:
          formData.assetsToReturn.length > 0 ? formData.assetsToReturn : null,
        hrNotes: formData.hrNotes,
      };

      const response = await fetch(`/api/employees/${employee.id}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start offboarding");
      }

      const data = await response.json();

      if (formData.exitInterviewRequired && data.offboardingId) {
        try {
          const finalFormTemplateId = formData.sendForm
            ? formData.formTemplateId || formTemplates[0]?.id
            : undefined;
          const scheduledAt = formData.exitInterviewDate
            ? toUTCFromLondon(
                format(formData.exitInterviewDate, "yyyy-MM-dd"),
                formData.exitInterviewTime
              ).toISOString()
            : undefined;

          const exitInterviewResponse = await fetch(
            `/api/offboarding/${employee.id}/exit-interview`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scheduledAt,
                durationMinutes: formData.exitInterviewDuration,
                interviewerId: formData.exitInterviewInterviewer || undefined,
                sendForm: formData.sendForm,
                formTemplateId: finalFormTemplateId,
                formTiming: formData.sendForm ? formData.formTiming : undefined,
              }),
            }
          );

          if (!exitInterviewResponse.ok) {
            const errorData = await exitInterviewResponse.json();
            console.error("Exit interview setup failed:", errorData);
          }

          if (formData.sendForm && formData.formTiming === "NOW") {
            try {
              await fetch("/api/cron/send-expiry-alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
            } catch (err) {
              console.error("Error sending form invitation:", err);
            }
          }
        } catch (err) {
          console.error("Error setting up exit interview:", err);
        }
      }

      toast({
        title: "Offboarding Started Successfully",
        description: `Offboarding initiated for ${employee.firstName} ${employee.lastName}. ${
          formData.exitInterviewRequired ? "Calendar invite sent." : ""
        } ${
          formData.sendForm && formData.formTiming === "NOW"
            ? "Exit interview form sent immediately."
            : ""
        }`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error starting offboarding:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start offboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssetToggle = (asset: string) => {
    setFormData((prev) => ({
      ...prev,
      assetsToReturn: prev.assetsToReturn.includes(asset)
        ? prev.assetsToReturn.filter((a) => a !== asset)
        : [...prev.assetsToReturn, asset],
    }));
  };

  // Validation for each step
  const isStep1Valid = useMemo(() => {
    return formData.lastWorkingDate && formData.offboardingType;
  }, [formData.lastWorkingDate, formData.offboardingType]);

  const isStep2Valid = useMemo(() => {
    if (formData.handoverRequired && !formData.handoverAssignedTo) return false;
    return true;
  }, [formData.handoverRequired, formData.handoverAssignedTo]);

  const isStep3Valid = useMemo(() => {
    if (formData.exitInterviewRequired) {
      if (!formData.exitInterviewDate) return false;
      if (formData.sendForm && !formData.formTemplateId) return false;
    }
    return true;
  }, [
    formData.exitInterviewRequired,
    formData.exitInterviewDate,
    formData.sendForm,
    formData.formTemplateId,
  ]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return isStep1Valid;
      case 1:
        return isStep2Valid;
      case 2:
        return isStep3Valid;
      default:
        return false;
    }
  }, [currentStep, isStep1Valid, isStep2Valid, isStep3Valid]);

  if (!employee) return null;

  const selectedOffboardingType = offboardingTypes.find(
    (t) => t.value === formData.offboardingType
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { console.log(`[Offboarding] Dialog onOpenChange: isOpen=${isOpen}`); if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-amber-500/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-rose-500/20 to-transparent rounded-full blur-3xl" />
          
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/25">
                <UserMinus className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Start Offboarding Process
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {employee.firstName} {employee.lastName} â€¢ {employee.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="relative px-6 pb-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const StepIcon = step.icon;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < currentStep || (index === currentStep + 1 && canProceed)) {
                          setCurrentStep(index);
                          setPage([index, index > currentStep ? 1 : -1]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                        isActive
                          ? "bg-white/80 dark:bg-white/10 shadow-lg scale-105"
                          : isCompleted
                          ? "opacity-70 hover:opacity-100"
                          : "opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25"
                            : isCompleted
                            ? "bg-gradient-to-br from-emerald-500 to-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-left hidden sm:block">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isActive
                              ? "text-foreground"
                              : isCompleted
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-1 mx-2 rounded-full transition-all duration-500",
                          index < currentStep
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : "bg-muted"
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Step 1: Basics */}
                {currentStep === 0 && (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-4"
                  >
                    {/* Employee Summary Card */}
                    <motion.div
                      variants={fadeInUp}
                      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Employee</p>
                            <p className="font-semibold">
                              {employee.firstName} {employee.lastName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="font-medium text-sm truncate">{employee.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Department</p>
                            <p className="font-medium text-sm">{employee.departmentName || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Job Role</p>
                            <p className="font-medium text-sm">{employee.jobRoleName || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Offboarding Type Selection */}
                    <FormSection
                      title="Offboarding Type"
                      icon={Briefcase}
                      accentColor="rose"
                      defaultOpen={true}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {offboardingTypes.map((type) => {
                          const TypeIcon = type.icon;
                          const isSelected = formData.offboardingType === type.value;
                          return (
                            <motion.button
                              key={type.value}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  offboardingType: type.value,
                                }))
                              }
                              className={cn(
                                "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                                isSelected
                                  ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10"
                                  : "border-border/50 hover:border-border bg-background/50 hover:bg-muted/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  isSelected
                                    ? "bg-rose-500 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <span
                                className={cn(
                                  "font-medium text-sm",
                                  isSelected ? "text-rose-600" : "text-foreground"
                                )}
                              >
                                {type.label}
                              </span>
                              {isSelected && (
                                <motion.div
                                  layoutId="selected-type"
                                  className="absolute top-2 right-2"
                                >
                                  <BadgeCheck className="w-5 h-5 text-rose-500" />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-muted/30">
                        <Checkbox
                          id="isVoluntary"
                          checked={formData.isVoluntary}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              isVoluntary: checked as boolean,
                            }))
                          }
                        />
                        <Label htmlFor="isVoluntary" className="text-sm">
                          Voluntary departure
                        </Label>
                      </div>
                    </FormSection>

                    {/* Key Dates */}
                    <FormSection
                      title="Key Dates & Timeline"
                      icon={CalendarDays}
                      accentColor="amber"
                      defaultOpen={true}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Last Working Date <span className="text-rose-500">*</span>
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left h-11 rounded-xl",
                                  !formData.lastWorkingDate && "text-muted-foreground"
                                )}
                                type="button"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.lastWorkingDate ? (
                                  format(formData.lastWorkingDate, "PPP")
                                ) : (
                                  <span>Select date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.lastWorkingDate || undefined}
                                onSelect={(date) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    lastWorkingDate: date || null,
                                  }))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Resignation Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left h-11 rounded-xl",
                                  !formData.resignationDate && "text-muted-foreground"
                                )}
                                type="button"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.resignationDate ? (
                                  format(formData.resignationDate, "PPP")
                                ) : (
                                  <span>Optional</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.resignationDate || undefined}
                                onSelect={(date) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    resignationDate: date || null,
                                  }))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Notice Period (days)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={formData.noticePeriodDays}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  noticePeriodDays: e.target.value,
                                }))
                              }
                              placeholder="e.g., 14"
                              className="h-11 rounded-xl"
                            />
                            {calculatedNoticePeriod !== null && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="text-xs text-muted-foreground">
                                  ({calculatedNoticePeriod} calculated)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reason for leaving */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Reason for Leaving</Label>
                        <Textarea
                          value={formData.offboardingReason}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              offboardingReason: e.target.value,
                            }))
                          }
                          placeholder="Brief description of the reason for leaving..."
                          rows={3}
                          className="rounded-xl resize-none"
                        />
                      </div>
                    </FormSection>
                  </motion.div>
                )}

                {/* Step 2: Details */}
                {currentStep === 1 && (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-4"
                  >
                    {/* Access Management */}
                    <FormSection
                      title="Access Management"
                      icon={Shield}
                      accentColor="violet"
                      defaultOpen={true}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10">
                              <Shield className="w-4 h-4 text-violet-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Remove access immediately</p>
                              <p className="text-xs text-muted-foreground">
                                System access will be revoked when offboarding starts
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={formData.removeAccessImmediately}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                removeAccessImmediately: checked as boolean,
                              }))
                            }
                          />
                        </div>

                        {formData.removeAccessImmediately && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                          >
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Access will be revoked immediately upon starting offboarding
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </FormSection>

                    {/* Knowledge Transfer */}
                    <FormSection
                      title="Knowledge Transfer"
                      icon={Users}
                      accentColor="blue"
                      defaultOpen={true}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Users className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Handover required</p>
                              <p className="text-xs text-muted-foreground">
                                Assign someone to receive handover
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={formData.handoverRequired}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                handoverRequired: checked as boolean,
                              }))
                            }
                          />
                        </div>

                        {formData.handoverRequired && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                          >
                            <Label className="text-sm font-medium">
                              Assign handover to <span className="text-rose-500">*</span>
                            </Label>
                            <Select
                              open={isHandoverSelectOpen}
                              onOpenChange={handleHandoverOpenChange}
                              value={formData.handoverAssignedTo}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  handoverAssignedTo: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {shouldShowHandoverSearch && (
                                  <SelectSearchInput
                                    value={handoverSearch}
                                    onChange={setHandoverSearch}
                                    placeholder="Search employees..."
                                  />
                                )}
                                {handoverOptions.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} - {emp.departmentName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </motion.div>
                        )}
                      </div>
                    </FormSection>

                    {/* Asset Return */}
                    <FormSection
                      title="Assets to Return"
                      icon={Package}
                      accentColor="orange"
                      defaultOpen={true}
                      badge={
                        formData.assetsToReturn.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500/10 text-orange-600">
                            {formData.assetsToReturn.length} selected
                          </span>
                        )
                      }
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {commonAssets.map((asset) => {
                          const isSelected = formData.assetsToReturn.includes(asset.name);
                          return (
                            <motion.button
                              key={asset.name}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleAssetToggle(asset.name)}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                                isSelected
                                  ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                  : "border-border/50 hover:border-border hover:bg-muted/30"
                              )}
                            >
                              <span className="text-lg">{asset.icon}</span>
                              <span className="text-sm font-medium">{asset.name}</span>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 ml-auto text-orange-500" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </FormSection>

                    {/* HR Notes */}
                    <FormSection
                      title="HR Notes"
                      icon={FileText}
                      accentColor="emerald"
                      defaultOpen={false}
                    >
                      <Textarea
                        value={formData.hrNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, hrNotes: e.target.value }))
                        }
                        placeholder="Internal notes for HR team..."
                        rows={4}
                        className="rounded-xl resize-none"
                      />
                    </FormSection>
                  </motion.div>
                )}

                {/* Step 3: Exit Process */}
                {currentStep === 2 && (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-4"
                  >
                    {/* Exit Interview */}
                    <FormSection
                      title="Exit Interview"
                      icon={MessageSquare}
                      accentColor="primary"
                      defaultOpen={true}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <CalendarDays className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Schedule exit interview</p>
                              <p className="text-xs text-muted-foreground">
                                Conduct a final conversation with the employee
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={formData.exitInterviewRequired}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                exitInterviewRequired: checked as boolean,
                              }))
                            }
                          />
                        </div>

                        {formData.exitInterviewRequired && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-4 pt-2"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  Interview Date <span className="text-rose-500">*</span>
                                </Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left h-11 rounded-xl",
                                        !formData.exitInterviewDate && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {formData.exitInterviewDate ? (
                                        format(formData.exitInterviewDate, "PPP")
                                      ) : (
                                        <span>Select date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={formData.exitInterviewDate || undefined}
                                      onSelect={(date) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          exitInterviewDate: date || null,
                                        }))
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Interview Time</Label>
                                <Input
                                  type="time"
                                  value={formData.exitInterviewTime}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      exitInterviewTime: e.target.value,
                                    }))
                                  }
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
                                      exitInterviewDuration: parseInt(value, 10),
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Select duration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[10, 20, 30, 40, 50, 60].map((m) => (
                                      <SelectItem key={m} value={m.toString()}>
                                        {m} minutes
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Interviewer</Label>
                                <Select
                                  open={isInterviewerSelectOpen}
                                  onOpenChange={handleInterviewerOpenChange}
                                  value={formData.exitInterviewInterviewer}
                                  onValueChange={(value) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      exitInterviewInterviewer: value,
                                    }))
                                  }
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
                                    {interviewerOptions.map((emp) => (
                                      <SelectItem key={emp.id} value={emp.userId}>
                                        {emp.firstName} {emp.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </FormSection>

                    {/* Exit Interview Form */}
                    {formData.exitInterviewRequired && (
                      <FormSection
                        title="Exit Interview Form"
                        icon={Send}
                        accentColor="emerald"
                        defaultOpen={true}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Send className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">Send exit interview form</p>
                                <p className="text-xs text-muted-foreground">
                                  Collect structured feedback from the employee
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              checked={formData.sendForm}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  sendForm: checked as boolean,
                                }))
                              }
                            />
                          </div>

                          {formData.sendForm && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="space-y-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                            >
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
                                          {template.name}
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
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-border/50 hover:border-border"
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
                                        Immediately
                                      </p>
                                    </div>
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
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-border/50 hover:border-border"
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
                                        Scheduled
                                      </p>
                                    </div>
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </FormSection>
                    )}

                    {/* Summary Preview */}
                    <motion.div
                      variants={fadeInUp}
                      className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border border-border/50"
                    >
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Offboarding Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <p className="font-medium">
                            {selectedOffboardingType?.label || "Not selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Day</p>
                          <p className="font-medium">
                            {formData.lastWorkingDate
                              ? format(formData.lastWorkingDate, "PPP")
                              : "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Assets</p>
                          <p className="font-medium">
                            {formData.assetsToReturn.length} items
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Exit Interview</p>
                          <p className="font-medium">
                            {formData.exitInterviewRequired ? "Scheduled" : "Not required"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Access</p>
                          <p className="font-medium">
                            {formData.removeAccessImmediately
                              ? "Remove immediately"
                              : "Standard process"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Handover</p>
                          <p className="font-medium">
                            {formData.handoverRequired ? "Required" : "Not required"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer with navigation */}
          <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => paginate(-1)}
                disabled={currentStep === 0 || loading}
                className="h-11 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      index === currentStep
                        ? "w-6 bg-gradient-to-r from-rose-500 to-orange-500"
                        : index < currentStep
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => paginate(1)}
                  disabled={!canProceed || loading}
                  className="h-11 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/25"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canProceed || loading}
                  className="h-11 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/25"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Clock className="w-4 h-4" />
                      </motion.div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Start Offboarding
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}




