"use client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
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
import { HelpCircle } from "lucide-react";

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
  const [permissionProfiles, setPermissionProfiles] = useState<any[]>([]);
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

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);

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
    managerId: undefined as string | undefined,
    onboardingTemplateId: undefined as string | undefined,
    // Step 2 fields
    holidayYear: undefined as string | undefined,
    workingPatternId: undefined as string | undefined,
    entitlementDays: "",
  });

  // Toggle
  const [sendInviteNow, setSendInviteNow] = useState(true);

  // Calculate entitlement modal state
  const [fullTimeHours, setFullTimeHours] = useState("40");
  const [fullTimeEntitlement, setFullTimeEntitlement] = useState("25");
  const [calculatedEntitlement, setCalculatedEntitlement] = useState(0);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, roleRes, profilesRes, templateRes, patternsRes] =
        await Promise.all([
          fetch("/api/employees").then((r) => r.json()),
          fetch("/api/departments").then((r) => r.json()),
          fetch("/api/job-roles").then((r) => r.json()),
          fetch("/api/permissions").then((r) => r.json()),
          fetch("/api/onboarding/templates").then((r) => r.json()),
          fetch("/api/working-patterns").then((r) => r.json()),
        ]);

      // API returns flattened employees with id, firstName, lastName, etc.
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setDepartments(
        Array.isArray(deptRes) ? deptRes : deptRes.departments || [],
      );
      setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
      setPermissionProfiles(
        Array.isArray(profilesRes.profiles) ? profilesRes.profiles : [],
      );
      setTemplates(
        Array.isArray(templateRes)
          ? (templateRes as OnboardingTemplate[])
          : (templateRes.templates as OnboardingTemplate[]) || [],
      );
      setWorkingPatterns(patternsRes);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calculate prorated entitlement
  const calculateEntitlement = () => {
    const fullTimeHoursNum = parseFloat(fullTimeHours);
    const fullTimeEntitlementNum = parseFloat(fullTimeEntitlement);
    const startDate = new Date(formData.startDate);
    const holidayYear = formData.holidayYear;

    if (
      !fullTimeHoursNum ||
      !fullTimeEntitlementNum ||
      !startDate ||
      !holidayYear ||
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

    // Full-time entitlement is 28 days per holiday year (5.6 weeks)
    const FULL_TIME_ENTITLEMENT = 28;

    // Calculate annual entitlement based on days worked per week
    const annualEntitlement = (employeeDaysPerWeek / 5) * FULL_TIME_ENTITLEMENT;

    // Calculate holiday year dates
    const [startMonth, endMonth] = holidayYear
      .split("-")
      .map((m) => parseInt(m) - 1);
    const currentYear = startDate.getFullYear();
    let holidayYearStart = new Date(currentYear, startMonth, 1);
    let holidayYearEnd = new Date(currentYear, endMonth + 1, 0); // Last day of end month

    // If start date is before holiday year start, use previous year's holiday year
    if (startDate < holidayYearStart) {
      holidayYearStart.setFullYear(currentYear - 1);
      holidayYearEnd.setFullYear(currentYear - 1);
    }

    // Calculate total days in holiday year
    const totalDaysInHolidayYear =
      Math.ceil(
        (holidayYearEnd.getTime() - holidayYearStart.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    // Calculate days remaining from start date to end of holiday year
    const daysRemaining =
      Math.ceil(
        (holidayYearEnd.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    // Calculate pro-rated entitlement
    const proratedEntitlement =
      annualEntitlement * (daysRemaining / totalDaysInHolidayYear);

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
    try {
      if (!formData.onboardingTemplateId) {
        toast.error("Need to select onboarding template");
        return;
      }

      // Validate step 2 fields
      if (
        !formData.holidayYear ||
        formData.holidayYear === "" ||
        !formData.workingPatternId ||
        formData.workingPatternId === "" ||
        !formData.entitlementDays ||
        formData.entitlementDays === ""
      ) {
        toast.error("Please fill in all holiday settings");
        return;
      }

      const payload = {
        ...formData,
        companyId: session?.user?.companyId,
        sendInviteNow,
        entitlementDays: parseFloat(formData.entitlementDays),
        // Convert undefined values to empty strings for backend
        departmentId: formData.departmentId || "",
        jobRoleId: formData.jobRoleId || "",
        managerId: formData.managerId || "",
        permissionProfileId: formData.permissionProfileId || "",
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
        setError(data.error || "Failed to create employee");
        return;
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
        managerId: undefined,
        onboardingTemplateId: undefined,
        holidayYear: undefined,
        workingPatternId: undefined,
        entitlementDays: "",
      });
      setSendInviteNow(true);
      setCurrentStep(1);

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      setError("Network error");
    }
  };

  if (!open) return null;

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

  // Holiday year options
  const holidayYearOptions = [
    { value: "1-12", label: "Jan-Dec" },
    { value: "4-3", label: "Apr-Mar" },
    { value: "7-6", label: "Jul-Jun" },
    { value: "10-9", label: "Oct-Sep" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Employee</h2>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permission Profile *
                  </label>
                  <Select
                    value={formData.permissionProfileId || undefined}
                    onValueChange={(value) => {
                      const profile = permissionProfiles.find(
                        (p) => p.id === value,
                      );
                      const role =
                        profile?.name === "Admin"
                          ? "ADMIN"
                          : profile?.name === "Manager"
                            ? "MANAGER"
                            : "EMPLOYEE";
                      setFormData({
                        ...formData,
                        permissionProfileId: value,
                        role: role,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Permission Profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionProfiles
                        .sort((a, b) => {
                          // Sort built-in profiles first
                          if (a.builtIn && !b.builtIn) return -1;
                          if (!a.builtIn && b.builtIn) return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name} {profile.builtIn ? "(Built-in)" : ""}{" "}
                            - {profile.description || "No description"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select
                  value={formData.departmentId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value })
                  }
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
                      <Button type="button" variant="ghost" onClick={() => setDeptModalOpen(true)}>
                        + Add new department
                      </Button>
                    </div>
                  </SelectContent>
                </Select>

                <Select
                  value={formData.jobRoleId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jobRoleId: value })
                  }
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
                      <Button type="button" variant="ghost" onClick={() => setRoleModalOpen(true)}>
                        + Add new job role
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, onboardingTemplateId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Onboarding Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
                    <Label className="text-sm font-medium">Holiday Year</Label>
                    <Select
                      value={formData.holidayYear || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, holidayYear: value })
                      }
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select holiday year period" />
                      </SelectTrigger>
                      <SelectContent>
                        {holidayYearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      Holiday Entitlement (Days)
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        name="entitlementDays"
                        placeholder="25"
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
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="submit">Add Employee</Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>

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
                        <strong>Full-time entitlement:</strong> 28 days per
                        holiday year
                      </p>
                      <p>
                        <strong>Part-time calculation:</strong> Days worked per
                        week × 5.6
                      </p>
                      <p>
                        <strong>Pro-rata formula:</strong> Annual entitlement ×
                        (Days remaining in holiday year ÷ Total days in holiday
                        year)
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
                <strong>Note:</strong> Full-time employees are entitled to 28
                days of holiday per year (equivalent to 5.6 weeks). Part-time
                employees receive pro-rata entitlement based on their working
                pattern.
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
        />
      )}

      {isRoleModalOpen && (
        <NewJobRoleModal
          onClose={() => {
            setRoleModalOpen(false);
            fetchData();
          }}
        />
      )}
    </>
  );
}
