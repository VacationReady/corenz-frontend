"use client";
import { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import NewLocationModal from "@/components/shared/NewLocationModal";
import NewContractTypeModal from "@/components/shared/NewContractTypeModal";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
import { HelpCircle, X } from "lucide-react";

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
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [contractTypes, setContractTypes] = useState<Array<{ id: string; label: string }>>([]);
  interface OnboardingTemplate {
    id: string;
    name: string;
    departments?: { id: string }[];
    jobRoles?: { id: string }[];
  }
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [workingPatterns, setWorkingPatterns] = useState<any[]>([]);
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
  });

  const selectedHolidayRange = useMemo(
    () => parseHolidayYearValue(formData.holidayYear),
    [formData.holidayYear],
  );

  // Toggle
  const [sendInviteNow, setSendInviteNow] = useState(true);
  const [isAdminAccess, setIsAdminAccess] = useState(false);

  // Calculate entitlement modal state
  const [fullTimeHours, setFullTimeHours] = useState("40");
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [fullTimeEntitlement, setFullTimeEntitlement] = useState("20");
  const [calculatedEntitlement, setCalculatedEntitlement] = useState(0);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, roleRes, templateRes, patternsRes, locationsRes, contractTypeRes] =
        await Promise.all([
          fetch("/api/employees").then((r) => r.json()),
          fetch("/api/departments").then((r) => r.json()),
          fetch("/api/job-roles").then((r) => r.json()),
          fetch("/api/onboarding/templates").then((r) => r.json()),
          fetch("/api/working-patterns").then((r) => r.json()),
          fetch("/api/locations").then((r) => r.json()),
          fetch("/api/contract-type-options").then((r) => r.json()),
        ]);

      // API returns flattened employees with id, firstName, lastName, etc.
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setDepartments(
        Array.isArray(deptRes) ? deptRes : deptRes.departments || [],
      );
      setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
      const rawTemplates = Array.isArray(templateRes)
        ? (templateRes as any[])
        : (templateRes.templates as any[]) || [];

      // Normalize possible API shapes -> ensure departments/jobRoles keys exist
      const normalizedTemplates: OnboardingTemplate[] = rawTemplates.map((t: any) => ({
        id: t.id,
        name: t.name,
        departments: (t.departments || t.Department || []).map((d: any) => ({ id: d.id })),
        jobRoles: (t.jobRoles || t.JobRole || []).map((j: any) => ({ id: j.id })),
      }));

      setTemplates(normalizedTemplates);
      setWorkingPatterns(patternsRes);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setContractTypes(Array.isArray(contractTypeRes) ? contractTypeRes : []);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHolidayStartMonth("");
      setHolidayStartDay("");
      setHolidayYearError(null);
      setShowAllTemplates(false);
      setIsSubmitting(false); // Reset loading state when modal closes
      setError(""); // Clear any errors
      setCurrentStep(1); // Reset to first step
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
    selectedPattern.weeks.forEach((week: any) => {
      week.days.forEach((day: any) => {
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
      formData.onboardingTemplateId === ""
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Don't submit if already submitting
    if (isSubmitting) return;
    
    try {
      if (!formData.onboardingTemplateId) {
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

      const payload = {
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
        // No profile picker; allow backend defaults
        permissionProfileId: "",
        holidayYear: formData.holidayYear || "",
        workingPatternId: formData.workingPatternId || "",
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
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
      });
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

  if (!open) return null;

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
  const filteredTemplates = templates.filter((t: OnboardingTemplate) => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
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
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">
                  Basic Employee Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Input
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
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
                    checked={isAdminAccess}
                    onChange={(checked: boolean) => setIsAdminAccess(checked)}
                  />
                  <Label className="text-sm">Admin Access?</Label>
                </div>

                <Select
                  open={isDeptSelectOpen}
                  onOpenChange={setIsDeptSelectOpen}
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
                    {departments.map((d) => (
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
                  onOpenChange={setIsRoleSelectOpen}
                  value={formData.jobRoleId || undefined}
                  onValueChange={(value) => {
                    setShowAllTemplates(false);
                    setFormData({ ...formData, jobRoleId: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Job Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map((j) => (
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
                  onOpenChange={setIsLocationSelectOpen}
                  value={formData.locationId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
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
                  onOpenChange={setIsContractTypeSelectOpen}
                  value={formData.contractType || undefined}
                  onValueChange={(value) => setFormData({ ...formData, contractType: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Contract Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((t) => (
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
                  value={formData.managerId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, managerId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Line Manager (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {(emp.firstName || emp.lastName)
                          ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
                          : emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={sendInviteNow}
                    onChange={(checked: boolean) => setSendInviteNow(checked)}
                  />
                  <Label className="text-sm">Send login invite now</Label>
                </div>

                <Select
                  value={formData.onboardingTemplateId || undefined}
                  onValueChange={(value) => {
                    if (value === "show_all_templates") {
                      setShowAllTemplates(true);
                      return;
                    }

                    if (value === "none") {
                      setShowAllTemplates(false);
                    }

                    setFormData({
                      ...formData,
                      onboardingTemplateId: value,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Onboarding Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {templatesToDisplay.map((t) => (
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

                <div className="flex justify-end">
                  <Button type="button" onClick={nextStep}>
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
                        value={holidayStartMonth || undefined}
                        onValueChange={handleHolidayMonthChange}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((option) => (
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
                      value={formData.workingPatternId || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, workingPatternId: value })
                      }
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select working pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        {workingPatterns.map((pattern) => (
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
                    disabled={isSubmitting}
                  >
                    Add Employee
                  </Button>
                </div>
              </div>
            )}
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
                onChange={(e) => setFullTimeEntitlement(e.target.value)}
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
                onChange={(e) => setFullTimeHours(e.target.value)}
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
            fetchData();
          }}
      onAdded={(created) => {
        if (!created) return;
            setDeptModalOpen(false);
            // Ensure list includes the created dept then select it
            setDepartments((prev) => {
              const exists = prev.some((d: any) => d.id === created.id);
              return exists ? prev : [...prev, created];
            });
            setFormData((prev) => ({ ...prev, departmentId: created.id }));
            setIsDeptSelectOpen(false);
          }}
        />
      )}

      {isRoleModalOpen && (
        <NewJobRoleModal
          onClose={() => {
            setRoleModalOpen(false);
            fetchData();
          }}
      onAdded={(created) => {
        if (!created) return;
            setRoleModalOpen(false);
            setJobRoles((prev) => {
              const exists = prev.some((j: any) => j.id === created.id);
              return exists ? prev : [...prev, created];
            });
            setFormData((prev) => ({ ...prev, jobRoleId: created.id }));
            setIsRoleSelectOpen(false);
          }}
        />
      )}
      {isLocationModalOpen && (
        <NewLocationModal
          onClose={() => {
            setLocationModalOpen(false);
            fetchData();
          }}
      onAdded={(created) => {
        if (!created) return;
            setLocationModalOpen(false);
            setLocations((prev) => {
              const exists = prev.some((l: any) => l.id === created.id);
              return exists ? prev : [...prev, created];
            });
            setFormData((prev) => ({ ...prev, locationId: created.id }));
            setIsLocationSelectOpen(false);
          }}
        />
      )}
      {isContractTypeModalOpen && (
        <NewContractTypeModal
          onClose={() => {
            setContractTypeModalOpen(false);
            fetchData();
          }}
        />
      )}
    </>
  );
}
