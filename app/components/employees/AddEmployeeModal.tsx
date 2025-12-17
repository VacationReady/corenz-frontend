"use client";
import {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useMemo,
  useCallback,
  useRef,
  KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import NewLocationModal from "@/components/shared/NewLocationModal";
import NewContractTypeModal from "@/components/shared/NewContractTypeModal";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { validateEmail, validatePhone, getPhoneHelperText } from "@/lib/validators";
import { useEmployeeModalData } from "@/hooks/useEmployeeModalData";
import type {
  Department,
  JobRole,
  EmployeeSummary,
  Location,
  ContractType,
  OnboardingTemplate,
  WorkingPattern,
  PermissionProfile,
  RotaGroup,
  DatasetState,
} from "@/hooks/useEmployeeModalData";
import { fetchWithCsrf } from "@/lib/csrf";
import { prepareSensitiveDataForTransmission } from "@/lib/crypto";
import { AddEmployeeModalErrorBoundary } from "./AddEmployeeModalErrorBoundary";
import { roundToTwoDecimals } from "@/lib/decimalPrecision";
import { RefreshCw, User, Users, Briefcase, Calendar, Shield, Building2, MapPin, FileText, DollarSign, Phone, Heart, CheckCircle2, ChevronRight, Sparkles, Check, Bell } from "lucide-react";

// 👇 Toggle
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// 👇 Wizard components
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

// 👇 Tooltip component
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, X, AlertCircle } from "lucide-react";

// Animation variants for smooth transitions
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
  accentColor = "primary"
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose";
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const iconColors = {
    primary: "text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColors[accentColor]}`} />
          <span className="font-semibold text-foreground">{title}</span>
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
            <div className="pt-3 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// NZ Tax Code options based on IRD tables
const NZ_TAX_CODES = [
  { value: "M", label: "M - Primary employment" },
  { value: "ME", label: "ME - Primary with ESCT" },
  { value: "M_SL", label: "M SL - Primary with student loan" },
  { value: "ME_SL", label: "ME SL - Primary with ESCT & student loan" },
  { value: "SB", label: "SB - Secondary employment" },
  { value: "SB_SL", label: "SB SL - Secondary with student loan" },
  { value: "S", label: "S - Secondary (higher rate)" },
  { value: "S_SL", label: "S SL - Secondary with student loan" },
  { value: "SH", label: "SH - Special rates" },
  { value: "SH_SL", label: "SH SL - Special rates with student loan" },
  { value: "ST", label: "ST - Special tax rate" },
  { value: "ST_SL", label: "ST SL - Special tax with student loan" },
  { value: "CAE", label: "CAE - Casual agricultural employee" },
  { value: "EDW", label: "EDW - Election day worker" },
  { value: "ND", label: "ND - No declaration" },
  { value: "NS", label: "NS - Non-notification" },
  { value: "STC", label: "STC - Special tax code certificate" },
  { value: "WT", label: "WT - Withholding tax" },
];

type TaxCodeOption = (typeof NZ_TAX_CODES)[number];

type DatasetHealthEntry = {
  key: string;
  label: string;
  description: string;
  state: DatasetState<unknown>;
  critical?: boolean;
};

const KIWISAVER_RATES = [
  { value: "3", label: "3%" },
  { value: "4", label: "4%" },
  { value: "6", label: "6%" },
  { value: "8", label: "8%" },
  { value: "10", label: "10%" },
];

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

interface HolidayYearRange {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

const getDaysInMonth = (month: number) => {
  if (month < 1 || month > 12) {
    return 31;
  }
  return new Date(2024, month, 0).getDate();
};

const calculateHolidayYearEnd = (startMonth: number, startDay: number) => {
  const startDate = new Date(2024, startMonth - 1, startDay);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);

  return {
    endMonth: endDate.getMonth() + 1,
    endDay: endDate.getDate(),
  };
};

const parseHolidayYearValue = (value?: string): HolidayYearRange | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<HolidayYearRange>;
    if (
      typeof parsed.startMonth === "number" &&
      typeof parsed.startDay === "number"
    ) {
      if (
        typeof parsed.endMonth === "number" &&
        typeof parsed.endDay === "number"
      ) {
        return {
          startMonth: parsed.startMonth,
          startDay: parsed.startDay,
          endMonth: parsed.endMonth,
          endDay: parsed.endDay,
        };
      }
      const { endMonth, endDay } = calculateHolidayYearEnd(
        parsed.startMonth,
        parsed.startDay,
      );
      return {
        startMonth: parsed.startMonth,
        startDay: parsed.startDay,
        endMonth,
        endDay,
      };
    }
  } catch {
    // Ignore parsing errors and fall back to legacy string format
  }

  const parts = value.split("-");
  if (parts.length === 2) {
    const startMonth = parseInt(parts[0], 10);
    const endMonth = parseInt(parts[1], 10);
    if (!Number.isNaN(startMonth) && !Number.isNaN(endMonth)) {
      const endDay = getDaysInMonth(endMonth);
      return { startMonth, startDay: 1, endMonth, endDay };
    }
  }

  return null;
};

const formatMonthDay = (month: number, day: number) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    day: "numeric",
  }).format(new Date(2024, month - 1, day));

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

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEmployeeModal({
  open,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) {
  const { data: session } = useSession();

  // Use SWR hook for cached, resilient data fetching
  const modalData = useEmployeeModalData(open, session?.user?.companyId);

  // Extract datasets from hook with concrete typing
  const departments: Department[] = modalData.departments.data;
  const jobRoles: JobRole[] = modalData.jobRoles.data;
  const employees: EmployeeSummary[] = modalData.employees.data;
  const locations: Location[] = modalData.locations.data;
  const contractTypes: ContractType[] = modalData.contractTypes.data;
  const templates: OnboardingTemplate[] = modalData.templates.data;
  const workingPatterns: WorkingPattern[] = modalData.workingPatterns.data;
  const permissionProfiles: PermissionProfile[] = modalData.permissionProfiles.data;
  const rotaGroups: RotaGroup[] = modalData.rotaGroups.data;

  const datasetHealth: DatasetHealthEntry[] = [
    {
      key: "templates",
      label: "Onboarding templates",
      description: "Required to create an employee.",
      state: modalData.templates,
      critical: true,
    },
    {
      key: "departments",
      label: "Departments",
      description: "Used for template filtering and default metadata.",
      state: modalData.departments,
    },
    {
      key: "jobRoles",
      label: "Job roles",
      description: "Used for template filtering and manager context.",
      state: modalData.jobRoles,
    },
    {
      key: "locations",
      label: "Locations",
      description: "Populates the location selector.",
      state: modalData.locations,
    },
    {
      key: "contractTypes",
      label: "Contract types",
      description: "Populates the contract selector.",
      state: modalData.contractTypes,
    },
    {
      key: "workingPatterns",
      label: "Working patterns",
      description: "Required for Step 2 entitlement calculations.",
      state: modalData.workingPatterns,
    },
    {
      key: "permissionProfiles",
      label: "Permission profiles",
      description: "Required when enabling admin access.",
      state: modalData.permissionProfiles,
    },
    {
      key: "employees",
      label: "Employees",
      description: "Used for manager assignments.",
      state: modalData.employees,
    },
  ];

  const criticalErrors = datasetHealth.filter((entry) => entry.critical && entry.state.error);
  const nonCriticalErrors = datasetHealth.filter((entry) => !entry.critical && entry.state.error);

  const [error, setError] = useState("");
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [isContractTypeModalOpen, setContractTypeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Control Select open states so the list closes when launching modals
  const [isDeptSelectOpen, setIsDeptSelectOpen] = useState(false);
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
  const [isLocationSelectOpen, setIsLocationSelectOpen] = useState(false);
  const [isContractTypeSelectOpen, setIsContractTypeSelectOpen] = useState(false);
  const [isManagerSelectOpen, setIsManagerSelectOpen] = useState(false);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [isTaxCodeSelectOpen, setIsTaxCodeSelectOpen] = useState(false);
  const [isHolidayMonthSelectOpen, setIsHolidayMonthSelectOpen] = useState(false);
  const [isWorkingPatternSelectOpen, setIsWorkingPatternSelectOpen] = useState(false);
  const [isCreatingSelfEmployee, setIsCreatingSelfEmployee] = useState(false);

  // Success animation state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successEmployeeName, setSuccessEmployeeName] = useState("");

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [holidayStartMonth, setHolidayStartMonth] = useState<string>("");
  const [holidayStartDay, setHolidayStartDay] = useState<string>("");
  const [holidayYearError, setHolidayYearError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    startDate: "",
    role: "EMPLOYEE", // Keep for backward compatibility
    permissionProfileId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    jobRoleId: undefined as string | undefined,
    siteLocation: undefined as string | undefined,
    locationId: undefined as string | undefined,
    contractType: undefined as string | undefined,
    managerId: undefined as string | undefined,
    onboardingTemplateId: undefined as string | undefined,
    // Step 2 fields
    holidayYear: undefined as string | undefined,
    workingPatternId: undefined as string | undefined,
    entitlementDays: "",
    // NZ leave entitlements
    sickLeaveDays: "10",
    alternativeHolidayDays: "0",
    publicHolidayEntitlement: "11",
    // NZ-specific onboarding fields
    irdNumber: "",
    taxCode: undefined as string | undefined,
    kiwiSaverEnrolled: false,
    kiwiSaverEmployeeRate: undefined as string | undefined,
    bankAccountNumber: "",
    residencyStatus: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    // Visa & Work Permit fields
    visaExpiryDate: "",
    workPermitType: "",
    // 90-day trial period fields
    ninetyDayTrialPeriod: false,
    trialPeriodAccepted: false,
    trialNotifyRecipient: "MANAGER" as "MANAGER" | "ADMIN" | "BOTH",
    trialNotifyDaysBefore: "7",
    // Public holiday leave booking (for contractors who don't get public holidays as paid leave)
    canBookPublicHolidays: false,
    // Rota group assignments for shift-based patterns
    rotaGroupIds: [] as string[],
  });

  // Validation errors for NZ fields
  const [irdError, setIrdError] = useState<string | null>(null);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);

  // Validation errors for email and phone
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Ref for debounce timer
  const emailCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedHolidayRange = useMemo(
    () => parseHolidayYearValue(formData.holidayYear),
    [formData.holidayYear],
  );

  // Toggle
  const [sendInviteNow, setSendInviteNow] = useState(true);
  const [isAdminAccess, setIsAdminAccess] = useState(false);

  // Autosave & dirty state tracking
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Generate storage key based on tenant and user
  const storageKey = useMemo(() => {
    const tenantId = session?.user?.companyId || 'default';
    const userId = session?.user?.id || 'anonymous';
    return `addEmployeeModal_draft_${tenantId}_${userId}`;
  }, [session?.user?.companyId, session?.user?.id]);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // Calculate entitlement modal state
  const [fullTimeHours, setFullTimeHours] = useState("40");
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [fullTimeEntitlement, setFullTimeEntitlement] = useState("20");
  const [calculatedEntitlement, setCalculatedEntitlement] = useState(0);

  const [departmentSearch, setDepartmentSearch] = useState("");
  const [jobRoleSearch, setJobRoleSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [contractTypeSearch, setContractTypeSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [taxCodeSearch, setTaxCodeSearch] = useState("");
  const [holidayMonthSearch, setHolidayMonthSearch] = useState("");
  const [workingPatternSearch, setWorkingPatternSearch] = useState("");

  const getEmployeeDisplayName = (emp: EmployeeSummary) =>
    (emp.firstName || emp.lastName)
      ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
      : emp.email ?? "";

  const shouldShowDepartmentSearch = departments.length > 10;
  const departmentOptions = useMemo<Department[]>(
    () =>
      shouldShowDepartmentSearch
        ? filterBySearch(departments, (dept) => dept?.name ?? "", departmentSearch)
        : departments,
    [departments, departmentSearch, shouldShowDepartmentSearch],
  );

  const shouldShowJobRoleSearch = jobRoles.length > 10;
  const jobRoleOptions = useMemo<JobRole[]>(
    () =>
      shouldShowJobRoleSearch
        ? filterBySearch(jobRoles, (role) => role?.name ?? "", jobRoleSearch)
        : jobRoles,
    [jobRoles, jobRoleSearch, shouldShowJobRoleSearch],
  );

  const shouldShowLocationSearch = locations.length > 10;
  const locationOptions = useMemo<Location[]>(
    () =>
      shouldShowLocationSearch
        ? filterBySearch(locations, (location) => location?.name ?? "", locationSearch)
        : locations,
    [locations, locationSearch, shouldShowLocationSearch],
  );

  const shouldShowContractTypeSearch = contractTypes.length > 10;
  const contractTypeOptions = useMemo<ContractType[]>(
    () =>
      shouldShowContractTypeSearch
        ? filterBySearch(contractTypes, (type) => type?.label ?? "", contractTypeSearch)
        : contractTypes,
    [contractTypes, contractTypeSearch, shouldShowContractTypeSearch],
  );

  // Always show search for managers to make it easier to find employees
  const shouldShowManagerSearch = employees.length > 0;
  const managerOptions = useMemo<EmployeeSummary[]>(
    () =>
      shouldShowManagerSearch && managerSearch.trim()
        ? filterBySearch(employees, (emp) => getEmployeeDisplayName(emp), managerSearch)
        : employees,
    [employees, managerSearch, shouldShowManagerSearch],
  );

  const shouldShowWorkingPatternSearch = workingPatterns.length > 10;
  const workingPatternOptions = useMemo<WorkingPattern[]>(
    () =>
      shouldShowWorkingPatternSearch
        ? filterBySearch(workingPatterns, (pattern) => pattern?.name ?? "", workingPatternSearch)
        : workingPatterns,
    [workingPatterns, workingPatternSearch, shouldShowWorkingPatternSearch],
  );

  // Check if selected working pattern is shift-based
  const selectedWorkingPattern = useMemo(
    () => workingPatterns.find((p) => p.id === formData.workingPatternId),
    [workingPatterns, formData.workingPatternId]
  );
  const isShiftBasedPattern = selectedWorkingPattern?.patternType === "SHIFT_BASED";

  const shouldShowTaxCodeSearch = NZ_TAX_CODES.length > 10;
  const taxCodeOptions = useMemo<TaxCodeOption[]>(
    () =>
      shouldShowTaxCodeSearch
        ? filterBySearch(
          NZ_TAX_CODES,
          (code) => `${code.label} ${code.value}`,
          taxCodeSearch,
        )
        : NZ_TAX_CODES,
    [taxCodeSearch, shouldShowTaxCodeSearch],
  );

  const shouldShowHolidayMonthSearch = monthOptions.length > 10;
  const holidayMonthOptions = useMemo(
    () =>
      shouldShowHolidayMonthSearch
        ? filterBySearch(
          monthOptions,
          (option) => `${option.label} ${option.value}`,
          holidayMonthSearch,
        )
        : monthOptions,
    [holidayMonthSearch, shouldShowHolidayMonthSearch],
  );

  const handleDeptOpenChange = (open: boolean) => {
    setIsDeptSelectOpen(open);
    if (!open) setDepartmentSearch("");
  };

  const handleJobRoleOpenChange = (open: boolean) => {
    setIsRoleSelectOpen(open);
    if (!open) setJobRoleSearch("");
  };

  const handleLocationOpenChange = (open: boolean) => {
    setIsLocationSelectOpen(open);
    if (!open) setLocationSearch("");
  };

  const handleContractTypeOpenChange = (open: boolean) => {
    setIsContractTypeSelectOpen(open);
    if (!open) setContractTypeSearch("");
  };

  const handleManagerOpenChange = (open: boolean) => {
    setIsManagerSelectOpen(open);
    if (!open) setManagerSearch("");
  };

  const handleTemplateOpenChange = (open: boolean) => {
    setIsTemplateSelectOpen(open);
    if (!open) setTemplateSearch("");
  };

  const handleTaxCodeOpenChange = (open: boolean) => {
    setIsTaxCodeSelectOpen(open);
    if (!open) setTaxCodeSearch("");
  };

  const handleHolidayMonthOpenChange = (open: boolean) => {
    setIsHolidayMonthSelectOpen(open);
    if (!open) setHolidayMonthSearch("");
  };

  const handleWorkingPatternOpenChange = (open: boolean) => {
    setIsWorkingPatternSelectOpen(open);
    if (!open) setWorkingPatternSearch("");
  };

  // Create Employee record for the current user (admin) if they don't have one
  const handleCreateSelfEmployee = async () => {
    try {
      setIsCreatingSelfEmployee(true);
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      
      const response = await fetch("/api/employees/ensure-self", {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to create employee record");
        return;
      }

      const result = await response.json();
      if (result.created) {
        toast.success("Your employee record has been created! You can now be selected as a manager.");
      } else if (result.activated) {
        toast.success("Your employee record has been activated!");
      } else {
        toast.info("Your employee record already exists.");
      }

      // Refresh the employees list
      modalData.employees.retry();
    } catch (error) {
      console.error("Error creating self employee record:", error);
      toast.error("Failed to create employee record");
    } finally {
      setIsCreatingSelfEmployee(false);
    }
  };

  // Data is now fetched via SWR hook - no manual fetchData needed

  useEffect(() => {
    if (open) {
      // Restore draft from sessionStorage
      try {
        const savedDraft = sessionStorage.getItem(storageKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed);
          setInitialFormData(parsed);
        } else {
          setInitialFormData(formData);
        }
      } catch (error) {
        console.error('Failed to restore draft:', error);
        setInitialFormData(formData);
      }
    }
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) {
      setHolidayStartMonth("");
      setHolidayStartDay("");
      setHolidayYearError(null);
      setShowAllTemplates(false);
      setIsSubmitting(false); // Reset loading state when modal closes
      setError(""); // Clear any errors
      setCurrentStep(1); // Reset to first step
      // Clear validation errors
      setEmailError(null);
      setPhoneError(null);
      setDuplicateEmailError(null);
      setIrdError(null);
      setBankAccountError(null);
      return;
    }

    if (!formData.holidayYear) {
      return;
    }

    const parsed = parseHolidayYearValue(formData.holidayYear);
    if (parsed && holidayStartMonth === "" && holidayStartDay === "") {
      setHolidayStartMonth(parsed.startMonth.toString());
      setHolidayStartDay(parsed.startDay.toString());
    }
  }, [
    open,
    formData.holidayYear,
    holidayStartMonth,
    holidayStartDay,
  ]);

  // Auto-populate holiday year from start date (QOL feature)
  useEffect(() => {
    if (!formData.startDate) return;
    // Only auto-populate if holiday year hasn't been manually set
    if (holidayStartMonth !== "" || holidayStartDay !== "") return;
    
    const startDate = new Date(formData.startDate);
    if (isNaN(startDate.getTime())) return;
    
    const month = (startDate.getMonth() + 1).toString();
    const day = startDate.getDate().toString();
    
    setHolidayStartMonth(month);
    setHolidayStartDay(day);
    updateHolidayYearSelection(month, day);
  }, [formData.startDate]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    let value = e.target.value;
    
    // For entitlement fields, enforce 2 decimal places (NZ HRIS requirement)
    const entitlementFields = ['entitlementDays', 'sickLeaveDays', 'alternativeHolidayDays'];
    if (entitlementFields.includes(e.target.name) && value !== '') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        const decimalPlaces = (value.split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          value = roundToTwoDecimals(num).toString();
        }
      }
    }
    
    setFormData({ ...formData, [e.target.name]: value });
  };

  // Validate NZ IRD number (8 or 9 digits with optional dashes)
  const validateIRD = (ird: string): boolean => {
    if (!ird) return true; // Optional field
    // Remove dashes and spaces
    const cleaned = ird.replace(/[-\s]/g, "");
    // Must be 8 or 9 digits
    if (!/^\d{8,9}$/.test(cleaned)) {
      setIrdError("IRD number must be 8 or 9 digits");
      return false;
    }
    setIrdError(null);
    return true;
  };

  // Validate NZ bank account format (XX-XXXX-XXXXXXX-XXX)
  const validateBankAccount = (account: string): boolean => {
    if (!account) return true; // Optional field
    // Remove dashes and spaces
    const cleaned = account.replace(/[-\s]/g, "");
    // NZ bank account: 15-16 digits
    if (!/^\d{15,16}$/.test(cleaned)) {
      setBankAccountError("Bank account format: XX-XXXX-XXXXXXX-XXX (15-16 digits)");
      return false;
    }
    setBankAccountError(null);
    return true;
  };

  const handleIRDChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, irdNumber: value });
    validateIRD(value);
  };

  const handleBankAccountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, bankAccountNumber: value });
    validateBankAccount(value);
  };

  // Check for duplicate email via API
  const checkDuplicateEmail = useCallback(async (email: string) => {
    if (!email || !email.trim()) {
      setDuplicateEmailError(null);
      setIsCheckingDuplicate(false);
      return;
    }

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setDuplicateEmailError(null);
      setIsCheckingDuplicate(false);
      return;
    }

    try {
      setIsCheckingDuplicate(true);
      const headers: HeadersInit = {};
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const response = await fetch(`/api/employees?email=${encodeURIComponent(email.trim())}`, { headers });

      if (!response.ok) {
        setDuplicateEmailError(null);
        return;
      }

      const result = await response.json();
      // Handle paginated response format
      const employees = result.data || result;

      if (Array.isArray(employees) && employees.length > 0) {
        const existingEmployee = employees.find(
          (emp: any) => emp.email?.toLowerCase() === email.trim().toLowerCase()
        );

        if (existingEmployee) {
          setDuplicateEmailError(
            `This email is already registered to ${existingEmployee.firstName} ${existingEmployee.lastName}`
          );
        } else {
          setDuplicateEmailError(null);
        }
      } else {
        setDuplicateEmailError(null);
      }
    } catch (error) {
      console.error('Error checking duplicate email:', error);
      setDuplicateEmailError(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, []);

  // Handle email change with validation and debounced duplicate check
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });

    // Immediate format validation
    const validation = validateEmail(value);
    setEmailError(validation.error || null);

    // Clear any previous duplicate check
    setDuplicateEmailError(null);

    // Debounce duplicate check
    if (emailCheckTimerRef.current) {
      clearTimeout(emailCheckTimerRef.current);
    }

    if (validation.isValid) {
      emailCheckTimerRef.current = setTimeout(() => {
        checkDuplicateEmail(value);
      }, 600); // 600ms debounce
    }
  };

  // Format phone number with NZ default
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');

    // If starts with 0, convert to +64
    if (cleaned.startsWith('0')) {
      return '+64' + cleaned.substring(1);
    }

    // If no country code and looks like NZ number (8-10 digits), add +64
    if (!cleaned.startsWith('+') && /^\d{8,10}$/.test(cleaned)) {
      return '+64' + cleaned;
    }

    return cleaned;
  };

  // Handle phone change with validation and formatting
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Auto-format on blur or when user pauses typing
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });

    const validation = validatePhone(formatted);
    setPhoneError(validation.error || null);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimerRef.current) {
        clearTimeout(emailCheckTimerRef.current);
      }
    };
  }, []);

  // Autosave to sessionStorage when form data changes
  useEffect(() => {
    if (!open || !initialFormData) return;

    const timeoutId = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to autosave draft:', error);
      }
    }, 1000); // Debounce autosave by 1 second

    return () => clearTimeout(timeoutId);
  }, [formData, open, initialFormData, storageKey]);

  const updateHolidayYearSelection = (
    monthValue: string,
    dayValue: string,
  ) => {
    if (!monthValue) {
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError(null);
      return;
    }

    const month = parseInt(monthValue, 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError("Please choose a valid month.");
      return;
    }

    if (!dayValue) {
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError(null);
      return;
    }

    const day = parseInt(dayValue, 10);
    if (Number.isNaN(day)) {
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError("Day must be a number.");
      return;
    }

    if (day < 1 || day > 31) {
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError("Day must be between 1 and 31.");
      return;
    }

    const maxDay = getDaysInMonth(month);
    if (day > maxDay) {
      const monthName =
        monthOptions.find((option) => option.value === monthValue)?.label ||
        "The selected month";
      setFormData((prev) => ({ ...prev, holidayYear: undefined }));
      setHolidayYearError(
        `${monthName} has only ${maxDay} days. Adjust the day to continue.`,
      );
      return;
    }

    const { endMonth, endDay } = calculateHolidayYearEnd(month, day);
    const payload = JSON.stringify({
      startMonth: month,
      startDay: day,
      endMonth,
      endDay,
    });

    setFormData((prev) => ({ ...prev, holidayYear: payload }));
    setHolidayYearError(null);
  };

  const handleHolidayMonthChange = (value: string) => {
    setHolidayStartMonth(value);
    updateHolidayYearSelection(value, holidayStartDay);
  };

  const handleHolidayDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/[^0-9]/g, "");
    setHolidayStartDay(numericValue);
    updateHolidayYearSelection(holidayStartMonth, numericValue);
  };

  // Calculate prorated entitlement based on NZ requirements
  const calculateEntitlement = () => {
    const fullTimeHoursNum = parseFloat(fullTimeHours);
    const fullTimeEntitlementNum = parseFloat(fullTimeEntitlement || "20");
    const startDate = new Date(formData.startDate);
    const startDateValid = !Number.isNaN(startDate.getTime());

    if (
      !fullTimeHoursNum ||
      !fullTimeEntitlementNum ||
      !startDateValid ||
      !formData.workingPatternId
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Find selected working pattern
    const selectedPattern = workingPatterns.find(
      (p) => p.id === formData.workingPatternId,
    );
    if (!selectedPattern) {
      toast.error("Selected working pattern not found");
      return;
    }

    // Calculate employee days worked per week from pattern
    let employeeDaysPerWeek = 0;
    selectedPattern.weeks.forEach((week) => {
      week.days.forEach((day) => {
        if (day.type === "FULL_DAY") {
          employeeDaysPerWeek += 1;
        } else if (day.type.includes("HALF_DAY")) {
          employeeDaysPerWeek += 0.5;
        }
      });
    });

    // Calculate annual entitlement based on days worked per week
    // Uses configurable fullTimeEntitlement (default 20 days = 4 weeks for NZ)
    const annualEntitlement = (employeeDaysPerWeek / 5) * fullTimeEntitlementNum;

    // NZ compliance: accrual based on 12-month anniversary from start date
    // Calculate the first anniversary date
    const anniversaryDate = new Date(startDate);
    anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);

    // Calculate days remaining from start date to first anniversary
    const totalDaysToAnniversary = 365; // Standard year for proration
    const today = new Date();

    // If start date is in the future or today, use full year calculation
    // Otherwise, calculate days remaining until anniversary
    let daysRemaining: number;
    if (startDate > today) {
      daysRemaining = totalDaysToAnniversary;
    } else if (today >= anniversaryDate) {
      // Past first anniversary - use full entitlement
      daysRemaining = totalDaysToAnniversary;
    } else {
      // Between start date and first anniversary - prorate
      daysRemaining = Math.ceil(
        (anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate pro-rated entitlement
    const proratedEntitlement =
      annualEntitlement * (daysRemaining / totalDaysToAnniversary);

    // Round to nearest half day
    const roundedEntitlement = Math.round(proratedEntitlement * 2) / 2;

    setCalculatedEntitlement(roundedEntitlement);
  };

  const applyCalculatedEntitlement = () => {
    setFormData({
      ...formData,
      entitlementDays: calculatedEntitlement.toString(),
    });
    setIsCalculateModalOpen(false);
  };

  const nextStep = () => {
    // Validate step 1 required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.startDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    // Validate onboarding template selection
    if (!formData.onboardingTemplateId) {
      toast.error("Please select an onboarding template. If onboarding is not required, select 'No Template'.");
      return;
    }
    // Validate email and phone
    if (emailError || duplicateEmailError || phoneError) {
      toast.error("Please fix validation errors before proceeding");
      return;
    }
    // Validate NZ-specific fields
    if (irdError || bankAccountError) {
      toast.error("Please fix validation errors before proceeding");
      return;
    }
    if (formData.irdNumber && !validateIRD(formData.irdNumber)) {
      return;
    }
    if (formData.bankAccountNumber && !validateBankAccount(formData.bankAccountNumber)) {
      return;
    }
    // Validate 90-day trial period acceptance
    if (formData.ninetyDayTrialPeriod && !formData.trialPeriodAccepted) {
      toast.error("Employee must acknowledge 90-day trial period terms before proceeding");
      return;
    }
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  // Handle modal close with unsaved changes check
  const handleClose = () => {
    if (isDirty && !isSubmitting) {
      setShowDiscardDialog(true);
      setPendingClose(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
    setShowDiscardDialog(false);
    setPendingClose(false);
    onClose();
  };

  const cancelDiscard = () => {
    setShowDiscardDialog(false);
    setPendingClose(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Don't submit if already submitting
    if (isSubmitting) return;

    try {
      // Check for validation errors
      if (emailError || duplicateEmailError || phoneError || irdError || bankAccountError) {
        toast.error("Please fix validation errors before submitting");
        return;
      }

      // onboardingTemplateId is required - "none" means skip onboarding workflow

      // Validate step 2 fields
      if (holidayYearError) {
        toast.error(holidayYearError);
        setIsSubmitting(false);
        return;
      }

      if (
        !formData.workingPatternId ||
        formData.workingPatternId === "" ||
        !formData.entitlementDays ||
        formData.entitlementDays === ""
      ) {
        toast.error("Please fill in working pattern and annual leave entitlement");
        setIsSubmitting(false);
        return;
      }

      // Start loading state
      setIsSubmitting(true);
      setError("");

      // Find admin permission profile if admin access is enabled
      const adminProfile = isAdminAccess
        ? permissionProfiles.find(p => p.name?.toLowerCase() === "admin" || p.name?.toLowerCase().includes("administrator"))
        : null;

      console.log("[AddEmployeeModal] Admin toggle:", isAdminAccess, "Admin profile:", adminProfile);

      const basePayload = {
        ...formData,
        // Determine role from Admin toggle. Manager role is based on line manager relationship.
        role: isAdminAccess ? "ADMIN" : "EMPLOYEE",
        companyId: session?.user?.companyId,
        sendInviteNow,
        // Round all entitlement values to 2 decimal places (NZ HRIS requirement)
        entitlementDays: roundToTwoDecimals(parseFloat(formData.entitlementDays)),
        // NZ leave entitlements (rounded to 2 decimal places)
        sickLeaveDays: roundToTwoDecimals(parseFloat(formData.sickLeaveDays || "10")),
        alternativeHolidayDays: roundToTwoDecimals(parseFloat(formData.alternativeHolidayDays || "0")),
        publicHolidayEntitlement: parseFloat(formData.publicHolidayEntitlement || "11"),
        // Convert undefined values to empty strings for backend
        departmentId: formData.departmentId || "",
        jobRoleId: formData.jobRoleId || "",
        managerId: formData.managerId || "",
        contractType: formData.contractType || "",
        locationId: formData.locationId || "",
        // Set permission profile based on admin toggle
        permissionProfileId: adminProfile?.id || "",
        holidayYear: formData.holidayYear || "",
        workingPatternId: formData.workingPatternId || "",
        // NZ-specific onboarding fields (sensitive fields will be encrypted below)
        irdNumber: formData.irdNumber || "",
        taxCode: formData.taxCode || "",
        kiwiSaverEnrolled: formData.kiwiSaverEnrolled,
        kiwiSaverEmployeeRate: formData.kiwiSaverEmployeeRate
          ? parseFloat(formData.kiwiSaverEmployeeRate) / 100
          : undefined,
        bankAccountNumber: formData.bankAccountNumber || "",
        residencyStatus: formData.residencyStatus || "",
        emergencyContactName: formData.emergencyContactName || "",
        emergencyContactPhone: formData.emergencyContactPhone || "",
        emergencyContactRelationship: formData.emergencyContactRelationship || "",
        // Visa & Work Permit fields
        visaExpiryDate: formData.visaExpiryDate || "",
        workPermitType: formData.workPermitType || "",
        // 90-day trial period fields
        ninetyDayTrialPeriod: formData.ninetyDayTrialPeriod,
        trialPeriodAccepted: formData.trialPeriodAccepted,
        trialPeriodAcceptedAt: formData.ninetyDayTrialPeriod && formData.trialPeriodAccepted
          ? new Date().toISOString()
          : "",
        trialNotifyRecipient: formData.ninetyDayTrialPeriod ? formData.trialNotifyRecipient : undefined,
        trialNotifyDaysBefore: formData.ninetyDayTrialPeriod ? parseInt(formData.trialNotifyDaysBefore || "7", 10) : undefined,
        // Public holiday leave booking
        canBookPublicHolidays: formData.canBookPublicHolidays,
        // Rota group assignments for shift-based patterns
        rotaGroupIds: formData.rotaGroupIds.length > 0 ? formData.rotaGroupIds : undefined,
      };

      // Encrypt sensitive NZ payroll and visa data before transmission
      const sensitiveFields = ['irdNumber', 'bankAccountNumber', 'workPermitType'];
      const payload = await prepareSensitiveDataForTransmission(basePayload, sensitiveFields);

      // Use CSRF-protected fetch for security with tenant headers
      const res = await fetchWithCsrf("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, session?.user?.companyId);

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to create employee";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Success! Show beautiful animation
      const employeeName = `${formData.firstName} ${formData.lastName}`.trim();
      setSuccessEmployeeName(employeeName);
      setShowSuccessAnimation(true);

      // Clear the draft from sessionStorage
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Failed to clear draft:', error);
      }

      setError("");
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        startDate: "",
        role: "EMPLOYEE",
        permissionProfileId: undefined,
        departmentId: undefined,
        jobRoleId: undefined,
        siteLocation: undefined,
        locationId: undefined,
        contractType: undefined,
        managerId: undefined,
        onboardingTemplateId: undefined,
        holidayYear: undefined,
        workingPatternId: undefined,
        entitlementDays: "",
        sickLeaveDays: "10",
        alternativeHolidayDays: "0",
        publicHolidayEntitlement: "11",
        // NZ-specific fields
        irdNumber: "",
        taxCode: undefined,
        kiwiSaverEnrolled: false,
        kiwiSaverEmployeeRate: undefined,
        bankAccountNumber: "",
        residencyStatus: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelationship: "",
        // Visa & trial fields
        visaExpiryDate: "",
        workPermitType: "",
        ninetyDayTrialPeriod: false,
        trialPeriodAccepted: false,
        trialNotifyRecipient: "MANAGER" as "MANAGER" | "ADMIN" | "BOTH",
        trialNotifyDaysBefore: "7",
        // Public holiday leave booking
        canBookPublicHolidays: false,
        // Rota groups
        rotaGroupIds: [],
      });
      setIrdError(null);
      setBankAccountError(null);
      setSendInviteNow(true);
      setIsAdminAccess(false);
      setCurrentStep(1);
      setHolidayStartMonth("");
      setHolidayStartDay("");
      setHolidayYearError(null);
      setShowAllTemplates(false);

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating employee:", error);
      const errorMessage = "Network error - please try again";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      // Always stop loading state
      setIsSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setFormData((prev) => ({
      ...prev,
      departmentId: undefined,
      jobRoleId: undefined,
    }));
    setShowAllTemplates(false);
  };

  // Filter templates by chosen department/job role.
  // If neither is selected, show all. Templates with no restrictions always show.
  const filteredTemplates: OnboardingTemplate[] = templates.filter((t) => {
    const matchesDept =
      !!formData.departmentId &&
      !!t.departments?.some((d) => d.id === formData.departmentId);
    const matchesRole =
      !!formData.jobRoleId &&
      !!t.jobRoles?.some((j) => j.id === formData.jobRoleId);
    const unrestricted =
      (!t.departments || t.departments.length === 0) &&
      (!t.jobRoles || t.jobRoles.length === 0);

    if (!formData.departmentId && !formData.jobRoleId) {
      return true; // no filters selected, show all templates
    }
    return unrestricted || matchesDept || matchesRole;
  });

  const hasTemplateFilters = Boolean(
    formData.departmentId || formData.jobRoleId,
  );

  const templatesToDisplay = showAllTemplates ? templates : filteredTemplates;
  const shouldShowTemplateSearch = templatesToDisplay.length > 10;
  const templateOptions = useMemo<OnboardingTemplate[]>(
    () =>
      shouldShowTemplateSearch
        ? filterBySearch(templatesToDisplay, (template) => template?.name ?? "", templateSearch)
        : templatesToDisplay,
    [templatesToDisplay, templateSearch, shouldShowTemplateSearch],
  );

  // Compute form validity for Step 1
  // onboardingTemplateId is required - user must select a template or "No Template"
  const isStep1Valid = useMemo(() => {
    return (
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.email?.trim() &&
      formData.startDate &&
      formData.onboardingTemplateId && // Required - must select template or "No Template"
      !emailError &&
      !duplicateEmailError &&
      !phoneError &&
      !irdError &&
      !bankAccountError &&
      !isCheckingDuplicate
    );
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.startDate,
    formData.onboardingTemplateId,
    emailError,
    duplicateEmailError,
    phoneError,
    irdError,
    bankAccountError,
    isCheckingDuplicate,
  ]);

  // Compute form validity for Step 2
  const isStep2Valid = useMemo(() => {
    return (
      formData.workingPatternId &&
      formData.workingPatternId !== "" &&
      formData.entitlementDays &&
      formData.entitlementDays !== "" &&
      !holidayYearError
    );
  }, [
    formData.workingPatternId,
    formData.entitlementDays,
    holidayYearError,
  ]);

  // Check for critical data loading errors
  const hasCriticalError = criticalErrors.length > 0;
  const hasNonCriticalErrors = nonCriticalErrors.length > 0;

  if (!open) return null;
  return (
    <AddEmployeeModalErrorBoundary onReset={() => {
      modalData.retryAll();
      onClose();
    }}>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent rawContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Add New Employee
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-14">
                    Complete the wizard to onboard your new team member
                  </p>
                </div>
              </div>
              
              {/* Modern Step Indicator */}
              <div className="relative mt-8">
                <div className="flex items-center justify-between">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3 flex-1">
                    <motion.div 
                      className={`relative flex items-center justify-center w-10 h-10 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        currentStep >= 1 
                          ? "bg-primary text-white shadow-lg shadow-primary/30" 
                          : "bg-muted text-muted-foreground"
                      }`}
                      animate={{ scale: currentStep === 1 ? 1.05 : 1 }}
                    >
                      {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                      {currentStep === 1 && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-primary"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ opacity: 0.3 }}
                        />
                      )}
                    </motion.div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${currentStep >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                        Employee Details
                      </p>
                      <p className="text-xs text-muted-foreground">Basic info & compliance</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 mx-4 hidden sm:block">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: currentStep >= 2 ? "100%" : "0%" }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                      />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="hidden sm:block text-right">
                      <p className={`text-sm font-medium ${currentStep >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                        Leave & Working
                      </p>
                      <p className="text-xs text-muted-foreground">Holiday entitlements</p>
                    </div>
                    <motion.div 
                      className={`flex items-center justify-center w-10 h-10 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        currentStep >= 2 
                          ? "bg-primary text-white shadow-lg shadow-primary/30" 
                          : "bg-muted text-muted-foreground"
                      }`}
                      animate={{ scale: currentStep === 2 ? 1.05 : 1 }}
                    >
                      {currentStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8 flex-1 overflow-y-auto">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {hasCriticalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-red-900">
                          Required reference data failed to load
                        </p>
                        <p className="text-sm text-red-800">
                          The modal can’t continue until these datasets succeed:
                        </p>
                      </div>
                      <ul className="list-disc pl-5 text-sm text-red-800">
                        {criticalErrors.map((entry) => (
                          <li key={entry.key}>
                            <span className="font-medium">{entry.label}</span>
                            {": "}
                            {entry.state.error?.message || "Unknown error"}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="flex items-center gap-2"
                          onClick={modalData.retryAll}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry all datasets
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasNonCriticalErrors && (
                <div className="space-y-3" role="status" aria-live="polite">
                  {nonCriticalErrors.map((entry) => (
                    <div
                      key={entry.key}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900">
                            {entry.label} failed to load
                          </p>
                          <p className="text-sm text-amber-800">
                            {entry.state.error?.message || "Unknown error"}
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            {entry.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-w-[96px]"
                          onClick={entry.state.retry}
                          loading={entry.state.isLoading}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <fieldset
                disabled={hasCriticalError}
                className={hasCriticalError ? "pointer-events-none opacity-60" : undefined}
              >
                {currentStep === 1 && (
                  <motion.div 
                    key="step1"
                    custom={1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-5"
                  >
                    {/* Personal Information Section */}
                    <FormSection title="Personal Information" icon={User} accentColor="primary">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-medium text-foreground/80">
                            First Name <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            placeholder="Enter first name"
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-medium text-foreground/80">
                            Last Name <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            placeholder="Enter last name"
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                          Email Address <span className="text-primary">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleEmailChange}
                            required
                            placeholder="employee@company.com"
                            className={`h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 transition-all ${
                              emailError || duplicateEmailError 
                                ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                                : "focus:border-primary focus:ring-primary/20"
                            }`}
                            aria-describedby={emailError || duplicateEmailError ? "email-error" : undefined}
                          />
                          {isCheckingDuplicate && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                              />
                            </div>
                          )}
                        </div>
                        {emailError && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} id="email-error" className="text-xs text-destructive flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3 h-3" />{emailError}
                          </motion.p>
                        )}
                        {!emailError && duplicateEmailError && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} id="email-error" className="text-xs text-destructive flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3 h-3" />{duplicateEmailError}
                          </motion.p>
                        )}
                        {!emailError && !duplicateEmailError && isCheckingDuplicate && (
                          <p className="text-xs text-muted-foreground" aria-live="polite">Verifying email availability...</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-foreground/80">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="+64 21 123 4567"
                          className={`h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 transition-all ${
                            phoneError ? "border-destructive focus:border-destructive" : "focus:border-primary focus:ring-primary/20"
                          }`}
                          aria-describedby="phone-help"
                        />
                        {phoneError ? (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} id="phone-help" className="text-xs text-destructive flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3 h-3" />{phoneError}
                          </motion.p>
                        ) : formData.phone ? (
                          <p id="phone-help" className="text-xs text-muted-foreground">{getPhoneHelperText(formData.phone)}</p>
                        ) : (
                          <p id="phone-help" className="text-xs text-muted-foreground">Auto-formats to +64 (NZ). International numbers accepted.</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground/80">
                            Date of Birth
                          </Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startDate" className="text-sm font-medium text-foreground/80">
                            Start Date <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="startDate"
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            required
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Admin Access Toggle - Premium styled */}
                      <div className="mt-2 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-primary/10 border border-violet-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/20">
                              <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <Label htmlFor="adminAccess" className="text-sm font-medium cursor-pointer">Admin Access</Label>
                              <p className="text-xs text-muted-foreground">Grant system administration privileges</p>
                            </div>
                          </div>
                          <Switch
                            id="adminAccess"
                            checked={isAdminAccess}
                            onChange={(checked: boolean) => setIsAdminAccess(checked)}
                            aria-describedby="admin-access-description"
                          />
                        </div>
                        <p id="admin-access-description" className="sr-only">Grant this employee administrative privileges to manage system settings and other employees</p>
                      </div>
                    </FormSection>

                    {/* Job & Organisation Section */}
                    <FormSection title="Job & Organisation" icon={Briefcase} accentColor="emerald" defaultOpen={true}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Department</Label>
                          <Select
                            open={isDeptSelectOpen}
                            onOpenChange={handleDeptOpenChange}
                            value={formData.departmentId || undefined}
                            onValueChange={(value) => {
                              setShowAllTemplates(false);
                              setFormData({ ...formData, departmentId: value });
                            }}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowDepartmentSearch && (
                                <SelectSearchInput
                                  value={departmentSearch}
                                  onChange={setDepartmentSearch}
                                  placeholder="Search departments..."
                                />
                              )}
                              {departmentOptions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-2 border-t border-muted/30">
                                <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => { setIsDeptSelectOpen(false); setDeptModalOpen(true); }}>
                                  <span className="mr-2">+</span> Add new department
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Job Role</Label>
                          <Select
                            open={isRoleSelectOpen}
                            onOpenChange={handleJobRoleOpenChange}
                            value={formData.jobRoleId || undefined}
                            onValueChange={(value: string) => {
                              setShowAllTemplates(false);
                              setFormData({ ...formData, jobRoleId: value });
                            }}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue placeholder="Select job role" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowJobRoleSearch && (
                                <SelectSearchInput
                                  value={jobRoleSearch}
                                  onChange={setJobRoleSearch}
                                  placeholder="Search job roles..."
                                />
                              )}
                              {jobRoleOptions.map((j) => (
                                <SelectItem key={j.id} value={j.id}>
                                  {j.name}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-2 border-t border-muted/30">
                                <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => { setIsRoleSelectOpen(false); setRoleModalOpen(true); }}>
                                  <span className="mr-2">+</span> Add new job role
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Location</Label>
                          <Select
                            open={isLocationSelectOpen}
                            onOpenChange={handleLocationOpenChange}
                            value={formData.locationId || undefined}
                            onValueChange={(value: string) => setFormData({ ...formData, locationId: value })}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowLocationSearch && (
                                <SelectSearchInput
                                  value={locationSearch}
                                  onChange={setLocationSearch}
                                  placeholder="Search locations..."
                                />
                              )}
                              {locationOptions.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.name}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-2 border-t border-muted/30">
                                <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => { setIsLocationSelectOpen(false); setLocationModalOpen(true); }}>
                                  <span className="mr-2">+</span> Add new location
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Contract Type</Label>
                          <Select
                            open={isContractTypeSelectOpen}
                            onOpenChange={handleContractTypeOpenChange}
                            value={formData.contractType || undefined}
                            onValueChange={(value: string) => setFormData({ ...formData, contractType: value })}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowContractTypeSearch && (
                                <SelectSearchInput
                                  value={contractTypeSearch}
                                  onChange={setContractTypeSearch}
                                  placeholder="Search contract types..."
                                />
                              )}
                              {contractTypeOptions.map((t) => (
                                <SelectItem key={t.id} value={t.label}>
                                  {t.label}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-2 border-t border-muted/30">
                                <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => { setIsContractTypeSelectOpen(false); setContractTypeModalOpen(true); }}>
                                  <span className="mr-2">+</span> Add new contract type
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">Line Manager</Label>
                        <Select
                          open={isManagerSelectOpen}
                          onOpenChange={handleManagerOpenChange}
                          value={formData.managerId || undefined}
                          onValueChange={(value: string) =>
                            setFormData({ ...formData, managerId: value })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                            <SelectValue placeholder="Select line manager (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {shouldShowManagerSearch && (
                              <SelectSearchInput
                                value={managerSearch}
                                onChange={setManagerSearch}
                                placeholder="Search employees..."
                              />
                            )}
                            {modalData.employees.isLoading ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                Loading employees...
                              </div>
                            ) : modalData.employees.error ? (
                              <div className="px-2 py-6 text-center text-sm text-destructive">
                                Error loading employees: {modalData.employees.error.message}
                              </div>
                            ) : managerOptions.length === 0 ? (
                              <div className="px-2 py-4 text-center space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {managerSearch.trim() 
                                    ? "No employees found matching your search" 
                                    : "No employees available yet."}
                                </p>
                                {!managerSearch.trim() && (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                      As an admin, you can add yourself as an employee to be available as a manager.
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateSelfEmployee();
                                      }}
                                      loading={isCreatingSelfEmployee}
                                      className="text-xs"
                                    >
                                      Add myself as employee
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              managerOptions.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {getEmployeeDisplayName(emp)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {employees.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {managerSearch.trim() 
                              ? `Showing ${managerOptions.length} of ${employees.length} employees`
                              : `Showing all ${employees.length} employees`}
                          </p>
                        )}
                      </div>
                    </FormSection>

                    {/* Onboarding Template Section */}
                    <FormSection title="Onboarding" icon={FileText} accentColor="violet" defaultOpen={true}>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">
                          Onboarding Template <span className="text-primary">*</span>
                        </Label>
                        <Select
                          open={isTemplateSelectOpen}
                          onOpenChange={handleTemplateOpenChange}
                          value={formData.onboardingTemplateId || undefined}
                          onValueChange={(value: string) => {
                            if (value === "show_all_templates") {
                              setShowAllTemplates(true);
                              return;
                            }
                            // Keep "none" as a valid string value for backend
                            setFormData({
                              ...formData,
                              onboardingTemplateId: value,
                            });
                            if (value === "none") {
                              setShowAllTemplates(false);
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                            <SelectValue placeholder="Choose onboarding template" />
                          </SelectTrigger>
                          <SelectContent>
                            {shouldShowTemplateSearch && (
                              <SelectSearchInput
                                value={templateSearch}
                                onChange={setTemplateSearch}
                                placeholder="Search templates..."
                              />
                            )}
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No Template - Skip onboarding workflow</span>
                            </SelectItem>
                            {templateOptions.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                            {!showAllTemplates && hasTemplateFilters && (
                              <SelectItem value="show_all_templates">
                                <span className="text-primary">Show all templates</span>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {!formData.onboardingTemplateId && (
                          <p className="text-xs text-muted-foreground">
                            Select a template for the employee's onboarding workflow, or choose "No Template" to skip.
                          </p>
                        )}
                        {!showAllTemplates && filteredTemplates.length === 0 && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800"
                          >
                            No templates match your filters.{" "}
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline"
                              onClick={handleClearFilters}
                            >
                              Clear filters
                            </button>
                            {" "}to see all options.
                          </motion.p>
                        )}
                      </div>
                    </FormSection>

                    {/* NZ Tax & Payroll Section */}
                    <FormSection title="NZ Tax & Payroll" icon={DollarSign} accentColor="amber" defaultOpen={false}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="irdNumber" className="text-sm font-medium text-foreground/80">
                            IRD Number
                          </Label>
                          <Input
                            id="irdNumber"
                            name="irdNumber"
                            placeholder="123-456-785"
                            value={formData.irdNumber}
                            onChange={handleIRDChange}
                            className={`h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 transition-all ${
                              irdError ? "border-destructive" : "focus:border-primary focus:ring-primary/20"
                            }`}
                          />
                          {irdError ? (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />{irdError}
                            </motion.p>
                          ) : (
                            <p className="text-xs text-muted-foreground">8 or 9 digits</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taxCode" className="text-sm font-medium text-foreground/80">
                            Tax Code
                          </Label>
                          <Select
                            open={isTaxCodeSelectOpen}
                            onOpenChange={handleTaxCodeOpenChange}
                            value={formData.taxCode || undefined}
                            onValueChange={(value: string) =>
                              setFormData({ ...formData, taxCode: value })
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue placeholder="Select tax code" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowTaxCodeSearch && (
                                <SelectSearchInput
                                  value={taxCodeSearch}
                                  onChange={setTaxCodeSearch}
                                  placeholder="Search tax codes..."
                                />
                              )}
                              {taxCodeOptions.map((code) => (
                                <SelectItem key={code.value} value={code.value}>
                                  {code.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">IRD tax code for PAYE</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber" className="text-sm font-medium text-foreground/80">
                          Bank Account Number
                        </Label>
                        <Input
                          id="bankAccountNumber"
                          name="bankAccountNumber"
                          placeholder="12-3456-7890123-00"
                          value={formData.bankAccountNumber}
                          onChange={handleBankAccountChange}
                          className={`h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 transition-all ${
                            bankAccountError ? "border-destructive" : "focus:border-primary focus:ring-primary/20"
                          }`}
                        />
                        {bankAccountError ? (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{bankAccountError}
                          </motion.p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Format: XX-XXXX-XXXXXXX-XXX</p>
                        )}
                      </div>

                      {/* KiwiSaver Toggle - Premium styled */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <Label htmlFor="kiwiSaverEnrolled" className="text-sm font-medium cursor-pointer">KiwiSaver Enrolled</Label>
                              <p className="text-xs text-muted-foreground">NZ retirement savings scheme</p>
                            </div>
                          </div>
                          <Switch
                            id="kiwiSaverEnrolled"
                            checked={formData.kiwiSaverEnrolled}
                            onChange={(checked: boolean) =>
                              setFormData({ ...formData, kiwiSaverEnrolled: checked })
                            }
                            aria-describedby="kiwisaver-description"
                          />
                        </div>
                        <p id="kiwisaver-description" className="sr-only">Indicate if employee is enrolled in New Zealand KiwiSaver retirement savings scheme</p>
                        
                        <AnimatePresence>
                          {formData.kiwiSaverEnrolled && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 pt-4 border-t border-emerald-500/20"
                            >
                              <Label htmlFor="kiwiSaverRate" className="text-sm font-medium text-foreground/80">
                                Contribution Rate
                              </Label>
                              <Select
                                value={formData.kiwiSaverEmployeeRate || undefined}
                                onValueChange={(value) =>
                                  setFormData({ ...formData, kiwiSaverEmployeeRate: value })
                                }
                              >
                                <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 mt-2">
                                  <SelectValue placeholder="Select rate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {KIWISAVER_RATES.map((rate) => (
                                    <SelectItem key={rate.value} value={rate.value}>
                                      {rate.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">3% minimum, 10% maximum</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="residencyStatus" className="text-sm font-medium text-foreground/80">
                          Residency Status
                        </Label>
                        <Input
                          id="residencyStatus"
                          name="residencyStatus"
                          placeholder="e.g., NZ Citizen, Permanent Resident"
                          value={formData.residencyStatus}
                          onChange={handleChange}
                          className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="workPermitType" className="text-sm font-medium text-foreground/80">
                            Work Permit Type
                          </Label>
                          <Input
                            id="workPermitType"
                            name="workPermitType"
                            placeholder="e.g., Essential Skills"
                            value={formData.workPermitType}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                          <p className="text-xs text-muted-foreground">For non-residents</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="visaExpiryDate" className="text-sm font-medium text-foreground/80">
                            Visa Expiry Date
                          </Label>
                          <Input
                            id="visaExpiryDate"
                            type="date"
                            name="visaExpiryDate"
                            value={formData.visaExpiryDate}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                          <p className="text-xs text-muted-foreground">Immigration compliance</p>
                        </div>
                      </div>
                    </FormSection>

                    {/* Emergency Contact Section */}
                    <FormSection title="Emergency Contact" icon={Heart} accentColor="rose" defaultOpen={false}>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactName" className="text-sm font-medium text-foreground/80">
                          Contact Name
                        </Label>
                        <Input
                          id="emergencyContactName"
                          name="emergencyContactName"
                          placeholder="Full name"
                          value={formData.emergencyContactName}
                          onChange={handleChange}
                          className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactPhone" className="text-sm font-medium text-foreground/80">
                            Contact Phone
                          </Label>
                          <Input
                            id="emergencyContactPhone"
                            name="emergencyContactPhone"
                            placeholder="+64 21 123 4567"
                            value={formData.emergencyContactPhone}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactRelationship" className="text-sm font-medium text-foreground/80">
                            Relationship
                          </Label>
                          <Input
                            id="emergencyContactRelationship"
                            name="emergencyContactRelationship"
                            placeholder="e.g., Spouse, Parent"
                            value={formData.emergencyContactRelationship}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>
                    </FormSection>

                    {/* 90-Day Trial Period Section */}
                    <FormSection title="Trial Period" icon={Shield} accentColor="primary" defaultOpen={false}>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor="ninetyDayTrial" className="text-sm font-medium cursor-pointer">90-Day Trial Period</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-4 glass-ultra rounded-xl">
                                      <p className="text-sm">
                                        Under the Employment Relations Act 2000, employers with fewer than 20 employees
                                        may include a 90-day trial provision in employment agreements.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="text-xs text-muted-foreground">NZ Employment Relations Act 2000</p>
                            </div>
                          </div>
                          <Switch
                            id="ninetyDayTrial"
                            checked={formData.ninetyDayTrialPeriod}
                            onChange={(checked: boolean) => {
                              setFormData({
                                ...formData,
                                ninetyDayTrialPeriod: checked,
                                trialPeriodAccepted: checked ? formData.trialPeriodAccepted : false
                              });
                            }}
                            aria-describedby="trial-period-description"
                          />
                        </div>
                        <p id="trial-period-description" className="sr-only">Enable 90-day trial period for this employment agreement</p>

                        <AnimatePresence>
                          {formData.ninetyDayTrialPeriod && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 pt-4 border-t border-blue-500/20"
                            >
                              <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors">
                                <input
                                  type="checkbox"
                                  id="trialPeriodAccepted"
                                  checked={formData.trialPeriodAccepted}
                                  onChange={(e) =>
                                    setFormData({ ...formData, trialPeriodAccepted: e.target.checked })
                                  }
                                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary/20"
                                />
                                <div>
                                  <span className="text-sm font-medium text-foreground">
                                    Employee acknowledges 90-day trial terms
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Confirms understanding of trial period clause before employment commences.
                                  </p>
                                </div>
                              </label>

                              {!formData.trialPeriodAccepted && (
                                <motion.p 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Acknowledgement required before proceeding
                                </motion.p>
                              )}

                              {/* Trial Period Notification Settings */}
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="mt-4 p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-blue-200/50 dark:border-blue-800/30 space-y-4"
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Bell className="w-4 h-4 text-blue-500" />
                                  Trial Period Reminder
                                </div>
                                
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                      Who should be notified before the trial ends?
                                    </Label>
                                    <Select
                                      value={formData.trialNotifyRecipient}
                                      onValueChange={(value: "MANAGER" | "ADMIN" | "BOTH") =>
                                        setFormData({ ...formData, trialNotifyRecipient: value })
                                      }
                                    >
                                      <SelectTrigger className="h-10 rounded-xl border-muted/50 bg-white/80 dark:bg-white/10">
                                        <SelectValue placeholder="Select recipient" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="MANAGER">
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-emerald-500" />
                                            <span>Line Manager</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="ADMIN">
                                          <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-violet-500" />
                                            <span>Admin / HR</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="BOTH">
                                          <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-500" />
                                            <span>Both Manager & Admin</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                      Days before trial ends to send reminder
                                    </Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={30}
                                        value={formData.trialNotifyDaysBefore}
                                        onChange={(e) =>
                                          setFormData({ ...formData, trialNotifyDaysBefore: e.target.value })
                                        }
                                        className="h-10 w-20 rounded-xl border-muted/50 bg-white/80 dark:bg-white/10 text-center"
                                      />
                                      <span className="text-sm text-muted-foreground">days before</span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground/80 flex items-start gap-1.5 pt-1">
                                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                  An email reminder will be sent to the selected recipient(s) before the 90-day trial period ends.
                                </p>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </FormSection>

                    {/* Step Navigation */}
                    <motion.div 
                      className="flex justify-end pt-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                        className="h-12 px-8 rounded-2xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
                      >
                        <span>Continue to Leave Settings</span>
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div 
                    key="step2"
                    custom={1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-5"
                  >
                    {/* Holiday Year Section */}
                    <FormSection title="Holiday Year" icon={Calendar} accentColor="primary" defaultOpen={true}>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground/80">
                          Holiday Year Start Date
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Select
                            open={isHolidayMonthSelectOpen}
                            onOpenChange={handleHolidayMonthOpenChange}
                            value={holidayStartMonth || undefined}
                            onValueChange={handleHolidayMonthChange}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 flex-1">
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                              {shouldShowHolidayMonthSearch && (
                                <SelectSearchInput
                                  value={holidayMonthSearch}
                                  onChange={setHolidayMonthSearch}
                                  placeholder="Search months..."
                                />
                              )}
                              {holidayMonthOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={31}
                            placeholder="Day"
                            value={holidayStartDay}
                            onChange={handleHolidayDayChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 w-full sm:w-28 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                        {holidayYearError ? (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{holidayYearError}
                          </motion.p>
                        ) : selectedHolidayRange ? (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-primary/5 border border-primary/10"
                          >
                            <p className="text-sm text-foreground">
                              Holiday year: <span className="font-semibold text-primary">{formatMonthDay(selectedHolidayRange.startMonth, selectedHolidayRange.startDay)}</span>
                              {" "}to{" "}
                              <span className="font-semibold text-primary">{formatMonthDay(selectedHolidayRange.endMonth, selectedHolidayRange.endDay)}</span>
                            </p>
                          </motion.div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Choose the first day of your company holiday year</p>
                        )}
                      </div>
                    </FormSection>

                    {/* Working Pattern Section */}
                    <FormSection title="Working Pattern" icon={Briefcase} accentColor="emerald" defaultOpen={true}>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">
                          Working Pattern <span className="text-primary">*</span>
                        </Label>
                        <Select
                          open={isWorkingPatternSelectOpen}
                          onOpenChange={handleWorkingPatternOpenChange}
                          value={formData.workingPatternId || undefined}
                          onValueChange={(value) =>
                            setFormData({ ...formData, workingPatternId: value })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                            <SelectValue placeholder="Select working pattern" />
                          </SelectTrigger>
                          <SelectContent>
                            {shouldShowWorkingPatternSearch && (
                              <SelectSearchInput
                                value={workingPatternSearch}
                                onChange={setWorkingPatternSearch}
                                placeholder="Search working patterns..."
                              />
                            )}
                            {workingPatternOptions.map((pattern: any) => (
                              <SelectItem key={pattern.id} value={pattern.id}>
                                {pattern.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rota Groups - conditionally shown for shift-based patterns */}
                      <AnimatePresence>
                        {isShiftBasedPattern && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-emerald-500/20"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <Label className="text-sm font-medium text-foreground/80">
                                  Rota Groups (Shift Scheduling)
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Select the teams this employee will be available for shift scheduling.
                              </p>
                              
                              {rotaGroups.length === 0 ? (
                                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
                                  <p className="text-sm text-amber-700 dark:text-amber-300">
                                    No rota groups configured. Create rota groups in the Rota settings to enable shift scheduling.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-muted/50 bg-white/50 dark:bg-white/5 p-2">
                                  {rotaGroups.map((group) => (
                                    <label
                                      key={group.id}
                                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                        formData.rotaGroupIds.includes(group.id)
                                          ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                                          : "hover:bg-muted/50 border border-transparent"
                                      }`}
                                    >
                                      <div className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                                        formData.rotaGroupIds.includes(group.id)
                                          ? "bg-emerald-500 border-emerald-500"
                                          : "border-muted-foreground/30"
                                      }`}>
                                        {formData.rotaGroupIds.includes(group.id) && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={formData.rotaGroupIds.includes(group.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({
                                              ...formData,
                                              rotaGroupIds: [...formData.rotaGroupIds, group.id],
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              rotaGroupIds: formData.rotaGroupIds.filter((id) => id !== group.id),
                                            });
                                          }
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                          {group.name}
                                        </p>
                                        {(group.Location || group.Department) && (
                                          <p className="text-xs text-muted-foreground truncate">
                                            {[group.Location?.name, group.Department?.name].filter(Boolean).join(" • ")}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                              
                              {formData.rotaGroupIds.length > 0 && (
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-xs text-emerald-600 dark:text-emerald-400"
                                >
                                  {formData.rotaGroupIds.length} group{formData.rotaGroupIds.length !== 1 ? "s" : ""} selected
                                </motion.p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </FormSection>

                    {/* Leave Entitlements Section */}
                    <FormSection title="Leave Entitlements" icon={Calendar} accentColor="violet" defaultOpen={true}>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground/80">
                          Annual Leave Entitlement <span className="text-primary">*</span>
                        </Label>
                        <div className="flex gap-3">
                          <Input
                            type="number"
                            step="0.01"
                            name="entitlementDays"
                            placeholder="20"
                            value={formData.entitlementDays}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 flex-1 focus:border-primary focus:ring-primary/20 transition-all"
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCalculateModalOpen(true)}
                            className="h-11 rounded-xl border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Calculate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">NZ: 4 weeks (20 days) after 12 months. Prorated before anniversary.</p>
                      </div>

                      {/* Public Holiday Leave Booking */}
                      <div className="pt-4 border-t border-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="canBookPublicHolidays" className="text-sm font-medium text-foreground cursor-pointer">
                                Allow leave booking on public holidays
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-4 glass-ultra rounded-xl">
                                    <p className="text-sm">
                                      Enable this for contractors or employees who don&apos;t receive public holidays as paid time off.
                                      By default, employees cannot book leave on public holidays (e.g., Christmas Day) as these are already paid days off.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">For contractors without public holiday entitlement</p>
                          </div>
                          <Switch
                            id="canBookPublicHolidays"
                            checked={formData.canBookPublicHolidays}
                            onChange={(checked: boolean) => {
                              setFormData({
                                ...formData,
                                canBookPublicHolidays: checked
                              });
                            }}
                          />
                        </div>
                      </div>
                    </FormSection>

                    {/* Step Navigation */}
                    <motion.div 
                      className="flex justify-between items-center pt-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={prevStep}
                        disabled={isSubmitting}
                        className="h-12 px-6 rounded-2xl text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        loading={isSubmitting}
                        loadingText="Creating Employee..."
                        disabled={isSubmitting || !isStep2Valid}
                        className="h-12 px-8 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Add Employee
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </fieldset>
            </form>
            </div>
        </DialogContent>
      </Dialog>

      {/* Calculate Entitlement Modal */}
      <Dialog
        open={isCalculateModalOpen}
        onOpenChange={setIsCalculateModalOpen}
      >
        <DialogContent title="Calculate Holiday Entitlement">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                Holiday Entitlement Calculator
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-5 h-5 text-gray-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>NZ Full-time entitlement:</strong> 20 days (4 weeks)
                        after 12 months of continuous employment
                      </p>
                      <p>
                        <strong>Part-time calculation:</strong> Days worked per
                        week ÷ 5 × Full-time entitlement
                      </p>
                      <p>
                        <strong>Pro-rata formula:</strong> Annual entitlement ×
                        (Days remaining to anniversary ÷ 365)
                      </p>
                      <p>
                        <strong>Rounding:</strong> To nearest half day
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-400">
              <p className="text-sm text-blue-800">
                <strong>NZ Compliance:</strong> Annual leave accrues as 4 weeks
                (20 days) after 12 months of continuous employment. Part-time
                employees receive pro-rata entitlement based on their working
                pattern. Leave is prorated before the first anniversary.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Full-Time Annual Entitlement (Days)
              </Label>
              <Input
                type="number"
                value={fullTimeEntitlement}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullTimeEntitlement(e.target.value)}
                placeholder="20"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: 20 days (4 weeks) for NZ. Adjust if needed.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Standard Full-Time Weekly Hours (for reference)
              </Label>
              <Input
                type="number"
                value={fullTimeHours}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullTimeHours(e.target.value)}
                placeholder="40"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to validate working pattern calculations
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Calculated Holiday Entitlement:
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {calculatedEntitlement} days
                </p>
                {calculatedEntitlement > 0 && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Based on working pattern and start date</p>
                    <p>Rounded to nearest half day</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCalculateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={calculateEntitlement} className="mr-2">
                Calculate
              </Button>
              <Button
                onClick={applyCalculatedEntitlement}
                disabled={calculatedEntitlement === 0}
              >
                Apply ({calculatedEntitlement} days)
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {isDeptModalOpen && (
        <NewDepartmentModal
          onClose={() => {
            setDeptModalOpen(false);
          }}
          onAdded={(created) => {
            modalData.departments.retry();
            if (!created) return;
            setDeptModalOpen(false);
            setFormData((prev) => ({ ...prev, departmentId: created.id }));
            setIsDeptSelectOpen(false);
          }}
        />
      )}

      {isRoleModalOpen && (
        <NewJobRoleModal
          onClose={() => {
            setRoleModalOpen(false);
          }}
          onAdded={(created) => {
            modalData.jobRoles.retry();
            if (!created) return;
            setRoleModalOpen(false);
            setFormData((prev) => ({ ...prev, jobRoleId: created.id }));
            setIsRoleSelectOpen(false);
          }}
        />
      )}
      {isLocationModalOpen && (
        <NewLocationModal
          onClose={() => {
            setLocationModalOpen(false);
          }}
          onAdded={(created) => {
            modalData.locations.retry();
            if (!created) return;
            setLocationModalOpen(false);
            setFormData((prev) => ({ ...prev, locationId: created.id }));
            setIsLocationSelectOpen(false);
          }}
        />
      )}
      {isContractTypeModalOpen && (
        <NewContractTypeModal
          onClose={() => {
            setContractTypeModalOpen(false);
          }}
          onAdded={(created) => {
            modalData.contractTypes.retry();
            if (!created) return;
            setContractTypeModalOpen(false);
            setFormData((prev) => ({ ...prev, contractType: created.label }));
            setIsContractTypeSelectOpen(false);
          }}
        />
      )}

      {/* Discard Changes Confirmation Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You have unsaved changes in this form. If you close now, your progress will be lost.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Your draft is automatically saved and will be restored when you reopen this form.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDiscard}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={confirmDiscard}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Beautiful Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
          >
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowSuccessAnimation(false);
                onClose();
                if (onSuccess) onSuccess();
              }}
            />

            {/* Floating particles/confetti */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: "50vw",
                    y: "50vh",
                  }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1, 1, 0.5],
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                  className={`absolute w-3 h-3 rounded-full ${
                    i % 5 === 0
                      ? "bg-emerald-400"
                      : i % 5 === 1
                      ? "bg-violet-400"
                      : i % 5 === 2
                      ? "bg-amber-400"
                      : i % 5 === 3
                      ? "bg-rose-400"
                      : "bg-blue-400"
                  }`}
                  style={{
                    boxShadow: `0 0 ${10 + Math.random() * 10}px currentColor`,
                  }}
                />
              ))}
            </div>

            {/* Success Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                delay: 0.1,
              }}
              className="relative z-10 w-full max-w-md mx-4"
            >
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-[2px] shadow-2xl shadow-emerald-500/30">
                <div className="relative rounded-[22px] bg-white dark:bg-slate-900 px-8 py-10 overflow-hidden">
                  {/* Decorative gradient orbs */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-400/30 to-transparent rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-cyan-400/30 to-transparent rounded-full blur-3xl" />

                  {/* Content */}
                  <div className="relative z-10 text-center space-y-6">
                    {/* Animated Check Circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 200,
                        delay: 0.2,
                      }}
                      className="mx-auto"
                    >
                      <div className="relative w-24 h-24 mx-auto">
                        {/* Outer ring animation */}
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.5, 0] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                        />
                        {/* Main circle */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                          <motion.svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <motion.path
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{
                                duration: 0.5,
                                delay: 0.4,
                                ease: "easeOut",
                              }}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        </div>
                      </div>
                    </motion.div>

                    {/* Title */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-2"
                    >
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        Welcome Aboard!
                      </h3>
                      <p className="text-lg text-foreground font-medium">
                        {successEmployeeName}
                      </p>
                    </motion.div>

                    {/* Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3"
                    >
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        has been successfully added to the system.
                        {sendInviteNow && (
                          <>
                            {" "}They&apos;ve received an invitation email and you&apos;ll be notified once they activate their account.
                          </>
                        )}
                      </p>
                    </motion.div>

                    {/* Action indicators */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-center gap-6 pt-2"
                    >
                      {sendInviteNow && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span>Email sent</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                          <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span>Profile created</span>
                      </div>
                    </motion.div>

                    {/* Close button */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Button
                        onClick={() => {
                          setShowSuccessAnimation(false);
                          onClose();
                          if (onSuccess) onSuccess();
                        }}
                        className="mt-4 h-12 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Continue
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AddEmployeeModalErrorBoundary>
  );
}
