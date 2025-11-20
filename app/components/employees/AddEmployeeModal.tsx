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
  DatasetState,
} from "@/hooks/useEmployeeModalData";
import { fetchWithCsrf } from "@/lib/csrf";
import { prepareSensitiveDataForTransmission } from "@/lib/crypto";
import { AddEmployeeModalErrorBoundary } from "./AddEmployeeModalErrorBoundary";
import { RefreshCw } from "lucide-react";

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

  const shouldShowManagerSearch = employees.length > 10;
  const managerOptions = useMemo<EmployeeSummary[]>(
    () =>
      shouldShowManagerSearch
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
  }, [open, storageKey, formData]);

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const response = await fetch(`/api/employees?email=${encodeURIComponent(email.trim())}`);

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
    // Validate step 1 fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.startDate ||
      !formData.onboardingTemplateId ||
      formData.onboardingTemplateId === "" ||
      formData.onboardingTemplateId === "none"
    ) {
      toast.error("Please fill in all required fields");
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

      if (!formData.onboardingTemplateId || formData.onboardingTemplateId === "none") {
        toast.error("Please select an onboarding template");
        setIsSubmitting(false);
        return;
      }

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
        entitlementDays: parseFloat(formData.entitlementDays),
        // NZ leave entitlements
        sickLeaveDays: parseFloat(formData.sickLeaveDays || "10"),
        alternativeHolidayDays: parseFloat(formData.alternativeHolidayDays || "0"),
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
      };

      // Encrypt sensitive NZ payroll and visa data before transmission
      const sensitiveFields = ['irdNumber', 'bankAccountNumber', 'workPermitType'];
      const payload = await prepareSensitiveDataForTransmission(basePayload, sensitiveFields);

      // Use CSRF-protected fetch for security
      const res = await fetchWithCsrf("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to create employee";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Success! Show success message
      const employeeName = `${formData.firstName} ${formData.lastName}`.trim();
      toast.success(`Employee ${employeeName} has been created successfully!`);

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
  const isStep1Valid = useMemo(() => {
    return (
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.email?.trim() &&
      formData.startDate &&
      formData.onboardingTemplateId &&
      formData.onboardingTemplateId !== "none" &&
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
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl">
          <Card className="w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Employee</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span
                    className={`px-2 py-1 rounded ${currentStep === 1 ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}
                  >
                    Step 1: Basic Details
                  </span>
                  <span className="text-gray-400">→</span>
                  <span
                    className={`px-2 py-1 rounded ${currentStep === 2 ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}
                  >
                    Step 2: Holiday Settings
                  </span>
                </div>
              </div>
            </div>
            {error && <p className="text-red-600">{error}</p>}

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
                  <div className="space-y-4">
                    <h3 className="text-md font-medium">
                      Basic Employee Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium">
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium">
                          Last Name *
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleEmailChange}
                        required
                        className={`mt-1 ${emailError || duplicateEmailError ? "border-red-500" : ""}`}
                        aria-describedby={emailError || duplicateEmailError ? "email-error" : undefined}
                      />
                      {emailError && (
                        <p id="email-error" className="text-xs text-red-600 mt-1" role="alert">{emailError}</p>
                      )}
                      {!emailError && duplicateEmailError && (
                        <p id="email-error" className="text-xs text-red-600 mt-1" role="alert">{duplicateEmailError}</p>
                      )}
                      {!emailError && !duplicateEmailError && isCheckingDuplicate && (
                        <p className="text-xs text-gray-500 mt-1" aria-live="polite">Checking availability...</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={`mt-1 ${phoneError ? "border-red-500" : ""}`}
                        aria-describedby="phone-help"
                      />
                      {phoneError && (
                        <p id="phone-help" className="text-xs text-red-600 mt-1" role="alert">{phoneError}</p>
                      )}
                      {!phoneError && formData.phone && (
                        <p id="phone-help" className="text-xs text-gray-500 mt-1">{getPhoneHelperText(formData.phone)}</p>
                      )}
                      {!phoneError && !formData.phone && (
                        <p id="phone-help" className="text-xs text-gray-500 mt-1">Automatically formats to +64 (NZ). Accepts international numbers.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date *
                        </label>
                        <Input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="adminAccess"
                        checked={isAdminAccess}
                        onChange={(checked: boolean) => setIsAdminAccess(checked)}
                        aria-describedby="admin-access-description"
                      />
                      <Label htmlFor="adminAccess" className="text-sm">Admin Access?</Label>
                      <p id="admin-access-description" className="sr-only">Grant this employee administrative privileges to manage system settings and other employees</p>
                    </div>

                    <Select
                      open={isDeptSelectOpen}
                      onOpenChange={handleDeptOpenChange}
                      value={formData.departmentId || undefined}
                      onValueChange={(value) => {
                        setShowAllTemplates(false);
                        setFormData({ ...formData, departmentId: value });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Department" />
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
                        <div className="px-2 py-2">
                          <Button type="button" variant="ghost" onClick={() => { setIsDeptSelectOpen(false); setDeptModalOpen(true); }}>
                            + Add new department
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>

                    <Select
                      open={isRoleSelectOpen}
                      onOpenChange={handleJobRoleOpenChange}
                      value={formData.jobRoleId || undefined}
                      onValueChange={(value: string) => {
                        setShowAllTemplates(false);
                        setFormData({ ...formData, jobRoleId: value });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Job Role" />
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
                        <div className="px-2 py-2">
                          <Button type="button" variant="ghost" onClick={() => { setIsRoleSelectOpen(false); setRoleModalOpen(true); }}>
                            + Add new job role
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>

                    <Select
                      open={isLocationSelectOpen}
                      onOpenChange={handleLocationOpenChange}
                      value={formData.locationId || undefined}
                      onValueChange={(value: string) => setFormData({ ...formData, locationId: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Location" />
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
                        <div className="px-2 py-2">
                          <Button type="button" variant="ghost" onClick={() => { setIsLocationSelectOpen(false); setLocationModalOpen(true); }}>
                            + Add new location
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>

                    <Select
                      open={isContractTypeSelectOpen}
                      onOpenChange={handleContractTypeOpenChange}
                      value={formData.contractType || undefined}
                      onValueChange={(value: string) => setFormData({ ...formData, contractType: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Contract Type" />
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
                        <div className="px-2 py-2">
                          <Button type="button" variant="ghost" onClick={() => { setIsContractTypeSelectOpen(false); setContractTypeModalOpen(true); }}>
                            + Add new contract type
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>

                    <Select
                      open={isManagerSelectOpen}
                      onOpenChange={handleManagerOpenChange}
                      value={formData.managerId || undefined}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, managerId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Line Manager (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {shouldShowManagerSearch && (
                          <SelectSearchInput
                            value={managerSearch}
                            onChange={setManagerSearch}
                            placeholder="Search managers..."
                          />
                        )}
                        {managerOptions.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {getEmployeeDisplayName(emp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      open={isTemplateSelectOpen}
                      onOpenChange={handleTemplateOpenChange}
                      value={formData.onboardingTemplateId || undefined}
                      onValueChange={(value: string) => {
                        if (value === "show_all_templates") {
                          setShowAllTemplates(true);
                          return;
                        }

                        // Treat "none" as undefined/null
                        setFormData({
                          ...formData,
                          onboardingTemplateId: value === "none" ? undefined : value,
                        });

                        if (value === "none") {
                          setShowAllTemplates(false);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Onboarding Template *" />
                      </SelectTrigger>
                      <SelectContent>
                        {shouldShowTemplateSearch && (
                          <SelectSearchInput
                            value={templateSearch}
                            onChange={setTemplateSearch}
                            placeholder="Search templates..."
                          />
                        )}
                        {templateOptions.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                        {!showAllTemplates && hasTemplateFilters && (
                          <SelectItem value="show_all_templates">
                            Show all templates
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {!showAllTemplates && filteredTemplates.length === 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No onboarding templates match the selected department or
                        job role. The list filters according to your choices.
                        {" "}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 align-baseline font-medium text-primary underline-offset-2 hover:underline"
                          onClick={handleClearFilters}
                        >
                          Clear filters
                        </Button>
                        {" "}to see everything.
                      </p>
                    )}

                    {/* NZ-specific onboarding fields */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium mb-4">
                        NZ Tax & Payroll Information
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="irdNumber" className="text-sm font-medium">
                            IRD Number
                          </Label>
                          <Input
                            id="irdNumber"
                            name="irdNumber"
                            placeholder="123-456-789"
                            value={formData.irdNumber}
                            onChange={handleIRDChange}
                            className="mt-1"
                          />
                          {irdError && (
                            <p className="text-xs text-red-600 mt-1">{irdError}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            8 or 9 digits (optional dashes)
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="taxCode" className="text-sm font-medium">
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
                            <SelectTrigger className="w-full mt-1">
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
                          <p className="text-xs text-gray-500 mt-1">
                            IRD tax code for PAYE
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label htmlFor="bankAccountNumber" className="text-sm font-medium">
                          Bank Account Number
                        </Label>
                        <Input
                          id="bankAccountNumber"
                          name="bankAccountNumber"
                          placeholder="12-3456-7890123-00"
                          value={formData.bankAccountNumber}
                          onChange={handleBankAccountChange}
                          className="mt-1"
                        />
                        {bankAccountError && (
                          <p className="text-xs text-red-600 mt-1">{bankAccountError}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          NZ bank account format: XX-XXXX-XXXXXXX-XXX
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="kiwiSaverEnrolled"
                            checked={formData.kiwiSaverEnrolled}
                            onChange={(checked: boolean) =>
                              setFormData({ ...formData, kiwiSaverEnrolled: checked })
                            }
                            aria-describedby="kiwisaver-description"
                          />
                          <Label htmlFor="kiwiSaverEnrolled" className="text-sm">KiwiSaver Enrolled?</Label>
                          <p id="kiwisaver-description" className="sr-only">Indicate if employee is enrolled in New Zealand KiwiSaver retirement savings scheme</p>
                        </div>

                        {formData.kiwiSaverEnrolled && (
                          <div>
                            <Label htmlFor="kiwiSaverRate" className="text-sm font-medium">
                              KiwiSaver Employee Contribution Rate
                            </Label>
                            <Select
                              value={formData.kiwiSaverEmployeeRate || undefined}
                              onValueChange={(value) =>
                                setFormData({ ...formData, kiwiSaverEmployeeRate: value })
                              }
                            >
                              <SelectTrigger className="w-full mt-1">
                                <SelectValue placeholder="Select contribution rate" />
                              </SelectTrigger>
                              <SelectContent>
                                {KIWISAVER_RATES.map((rate) => (
                                  <SelectItem key={rate.value} value={rate.value}>
                                    {rate.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              Minimum 3%, maximum 10%
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <Label htmlFor="residencyStatus" className="text-sm font-medium">
                          Residency Status
                        </Label>
                        <Input
                          id="residencyStatus"
                          name="residencyStatus"
                          placeholder="e.g., NZ Citizen, Permanent Resident, Work Visa"
                          value={formData.residencyStatus}
                          onChange={handleChange}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          For compliance and reporting
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor="workPermitType" className="text-sm font-medium">
                            Work Permit Type
                          </Label>
                          <Input
                            id="workPermitType"
                            name="workPermitType"
                            placeholder="e.g., Essential Skills, Partnership"
                            value={formData.workPermitType}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Required for non-residents/non-citizens
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="visaExpiryDate" className="text-sm font-medium">
                            Visa/Permit Expiry Date
                          </Label>
                          <Input
                            id="visaExpiryDate"
                            type="date"
                            name="visaExpiryDate"
                            value={formData.visaExpiryDate}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Immigration Act 2009 compliance
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact Information */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium mb-4">
                        Emergency Contact
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="emergencyContactName" className="text-sm font-medium">
                            Contact Name
                          </Label>
                          <Input
                            id="emergencyContactName"
                            name="emergencyContactName"
                            placeholder="Full name"
                            value={formData.emergencyContactName}
                            onChange={handleChange}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="emergencyContactPhone" className="text-sm font-medium">
                              Contact Phone
                            </Label>
                            <Input
                              id="emergencyContactPhone"
                              name="emergencyContactPhone"
                              placeholder="Phone number"
                              value={formData.emergencyContactPhone}
                              onChange={handleChange}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="emergencyContactRelationship" className="text-sm font-medium">
                              Relationship
                            </Label>
                            <Input
                              id="emergencyContactRelationship"
                              name="emergencyContactRelationship"
                              placeholder="e.g., Spouse, Parent"
                              value={formData.emergencyContactRelationship}
                              onChange={handleChange}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 90-Day Trial Period Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium mb-4">
                        Trial Period (NZ Employment Relations Act 2000)
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
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
                          <Label htmlFor="ninetyDayTrial" className="text-sm font-medium">
                            90-Day Trial Period
                          </Label>
                          <p id="trial-period-description" className="sr-only">Enable 90-day trial period for this employment agreement as allowed under Employment Relations Act 2000 for employers with fewer than 20 employees</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  Under the Employment Relations Act 2000, employers with fewer than 20 employees
                                  may include a 90-day trial provision in employment agreements. During this period,
                                  the employer may dismiss the employee without risk of personal grievance claims.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {formData.ninetyDayTrialPeriod && (
                          <div className="ml-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id="trialPeriodAccepted"
                                checked={formData.trialPeriodAccepted}
                                onChange={(e) =>
                                  setFormData({ ...formData, trialPeriodAccepted: e.target.checked })
                                }
                                className="mt-1"
                              />
                              <div>
                                <Label htmlFor="trialPeriodAccepted" className="text-sm font-medium cursor-pointer">
                                  Employee acknowledges and accepts 90-day trial period terms
                                </Label>
                                <p className="text-xs text-gray-600 mt-1">
                                  By checking this box, the employee confirms they have received and understood the
                                  trial period clause in their employment agreement. This must be clearly communicated
                                  before employment commences.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.ninetyDayTrialPeriod && !formData.trialPeriodAccepted && (
                          <p className="text-xs text-amber-700 mt-2">
                            ⚠️ Employee must acknowledge trial period terms before proceeding
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-md font-medium">
                      Holiday & Working Pattern Settings
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Holiday Year Start
                        </Label>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select
                            open={isHolidayMonthSelectOpen}
                            onOpenChange={handleHolidayMonthOpenChange}
                            value={holidayStartMonth || undefined}
                            onValueChange={handleHolidayMonthChange}
                          >
                            <SelectTrigger className="w-full sm:w-48">
                              <SelectValue placeholder="Month" />
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
                            className="w-full sm:w-24"
                          />
                        </div>
                        {holidayYearError ? (
                          <p className="text-xs text-red-600 mt-2">
                            {holidayYearError}
                          </p>
                        ) : selectedHolidayRange ? (
                          <p className="text-xs text-gray-500 mt-2">
                            Holiday year runs from{" "}
                            <span className="font-medium">
                              {formatMonthDay(
                                selectedHolidayRange.startMonth,
                                selectedHolidayRange.startDay,
                              )}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {formatMonthDay(
                                selectedHolidayRange.endMonth,
                                selectedHolidayRange.endDay,
                              )}
                            </span>
                            .
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-2">
                            Choose the first day of your company holiday year.
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Working Pattern
                        </Label>
                        <Select
                          open={isWorkingPatternSelectOpen}
                          onOpenChange={handleWorkingPatternOpenChange}
                          value={formData.workingPatternId || undefined}
                          onValueChange={(value) =>
                            setFormData({ ...formData, workingPatternId: value })
                          }
                        >
                          <SelectTrigger className="w-full mt-1">
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

                      <div>
                        <Label className="text-sm font-medium">
                          Annual Leave Entitlement (Days)
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            name="entitlementDays"
                            placeholder="20"
                            value={formData.entitlementDays}
                            onChange={handleChange}
                            className="flex-1"
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCalculateModalOpen(true)}
                          >
                            Calculate
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          NZ: 4 weeks (20 days) after 12 months. Prorated before anniversary.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Sick Leave (Days/Year)
                          </Label>
                          <Input
                            type="number"
                            step="0.5"
                            name="sickLeaveDays"
                            placeholder="10"
                            value={formData.sickLeaveDays}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            NZ minimum: 10 days after 6 months
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Alternative Holidays
                          </Label>
                          <Input
                            type="number"
                            step="0.5"
                            name="alternativeHolidayDays"
                            placeholder="0"
                            value={formData.alternativeHolidayDays}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Days owed for working public holidays
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Public Holidays/Year
                          </Label>
                          <Input
                            type="number"
                            step="1"
                            name="publicHolidayEntitlement"
                            placeholder="11"
                            value={formData.publicHolidayEntitlement}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            NZ: 11 national + regional holidays
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={prevStep}
                        disabled={isSubmitting}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        loading={isSubmitting}
                        loadingText="Creating Employee..."
                        disabled={isSubmitting || !isStep2Valid}
                      >
                        Add Employee
                      </Button>
                    </div>
                  </div>
                )}
              </fieldset>
            </form>
          </Card>
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
          onAdded={() => {
            modalData.contractTypes.retry();
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
    </AddEmployeeModalErrorBoundary>
  );
}
