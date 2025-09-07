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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEmployeeModal({ open, onClose, onSuccess }: AddEmployeeModalProps) {
  const { data: session } = useSession();
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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
    startDate: "",
    role: "EMPLOYEE",
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
      const [empRes, deptRes, roleRes, templateRes, patternsRes] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
        fetch("/api/job-roles").then((r) => r.json()),
        fetch("/api/onboarding/templates").then((r) => r.json()),
        fetch("/api/working-patterns").then((r) => r.json()),
      ]);

      setEmployees(empRes.filter((emp: any) => emp.user));
      setDepartments(Array.isArray(deptRes) ? deptRes : deptRes.departments || []);
      setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
      setTemplates(
        Array.isArray(templateRes)
          ? (templateRes as OnboardingTemplate[])
          : ((templateRes.templates as OnboardingTemplate[]) || [])
      );
      setWorkingPatterns(patternsRes);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calculate prorated entitlement
  const calculateEntitlement = () => {
    const fullTimeHoursNum = parseFloat(fullTimeHours);
    const fullTimeEntitlementNum = parseFloat(fullTimeEntitlement);
    const startDate = new Date(formData.startDate);
    const holidayYear = formData.holidayYear;

    if (!fullTimeHoursNum || !fullTimeEntitlementNum || !startDate || !holidayYear || !formData.workingPatternId) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Find selected working pattern
    const selectedPattern = workingPatterns.find(p => p.id === formData.workingPatternId);
    if (!selectedPattern) {
      toast.error("Selected working pattern not found");
      return;
    }

    // Calculate employee weekly hours from pattern
    let employeeWeeklyHours = 0;
    selectedPattern.weeks.forEach((week: any) => {
      week.days.forEach((day: any) => {
        if (day.type === "FULL_DAY") {
          employeeWeeklyHours += 8; // Assuming 8 hours per full day
        } else if (day.type.includes("HALF_DAY")) {
          employeeWeeklyHours += 4; // Assuming 4 hours per half day
        }
      });
    });

    // Calculate prorated entitlement
    const partTime = fullTimeEntitlementNum * (employeeWeeklyHours / fullTimeHoursNum);

    // Calculate days remaining in holiday year
    const [startMonth, endMonth] = holidayYear.split('-').map(m => parseInt(m) - 1);
    const currentYear = startDate.getFullYear();
    const holidayYearStart = new Date(currentYear, startMonth, 1);
    const holidayYearEnd = new Date(currentYear, endMonth, 31);

    if (startDate < holidayYearStart) {
      holidayYearStart.setFullYear(currentYear - 1);
      holidayYearEnd.setFullYear(currentYear - 1);
    }

    const totalDaysInYear = Math.ceil((holidayYearEnd.getTime() - holidayYearStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((holidayYearEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const prorated = partTime * (daysRemaining / totalDaysInYear);
    const finalEntitlement = Math.round(prorated * 100) / 100; // Round to 2 decimal places

    setCalculatedEntitlement(finalEntitlement);
  };

  const applyCalculatedEntitlement = () => {
    setFormData({ ...formData, entitlementDays: calculatedEntitlement.toString() });
    setIsCalculateModalOpen(false);
  };

  const nextStep = () => {
    // Validate step 1 fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.startDate || !formData.onboardingTemplateId || formData.onboardingTemplateId === "") {
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
      if (!formData.holidayYear || formData.holidayYear === "" || !formData.workingPatternId || formData.workingPatternId === "" || !formData.entitlementDays || formData.entitlementDays === "") {
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
        startDate: "",
        role: "EMPLOYEE",
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
      !!formData.departmentId && !!t.departments?.some((d) => d.id === formData.departmentId);
    const matchesRole =
      !!formData.jobRoleId && !!t.jobRoles?.some((j) => j.id === formData.jobRoleId);
    const unrestricted =
      (!t.departments || t.departments.length === 0) && (!t.jobRoles || t.jobRoles.length === 0);

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
              <span className={`px-2 py-1 rounded ${currentStep === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                Step 1: Basic Details
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded ${currentStep === 2 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                Step 2: Holiday Settings
              </span>
            </div>
          </div>
          {error && <p className="text-red-600">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Basic Employee Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                  <Input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
                </div>
                <Input name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                <Input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
                <Input type="date" name="startDate" placeholder="Start Date" value={formData.startDate} onChange={handleChange} required />

                <Select value={formData.role || undefined} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex space-x-2">
                  <Select value={formData.departmentId || undefined} onValueChange={(value) => setFormData({ ...formData, departmentId: value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={() => setDeptModalOpen(true)}>+ New</Button>
                </div>

                <div className="flex space-x-2">
                  <Select value={formData.jobRoleId || undefined} onValueChange={(value) => setFormData({ ...formData, jobRoleId: value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Job Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobRoles.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={() => setRoleModalOpen(true)}>+ New</Button>
                </div>

                <Select value={formData.managerId || undefined} onValueChange={(value) => setFormData({ ...formData, managerId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Line Manager (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) =>
                      emp.user && (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.user.firstName} {emp.user.lastName} ({emp.role})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch checked={sendInviteNow} onChange={(checked: boolean) => setSendInviteNow(checked)} />
                  <Label className="text-sm">Send login invite now</Label>
                </div>

                <Select value={formData.onboardingTemplateId || undefined} onValueChange={(value) => setFormData({ ...formData, onboardingTemplateId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Onboarding Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex justify-end">
                  <Button type="button" onClick={nextStep}>Next</Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Holiday & Working Pattern Settings</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Holiday Year</Label>
                    <Select value={formData.holidayYear || undefined} onValueChange={(value) => setFormData({ ...formData, holidayYear: value })}>
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
                    <Label className="text-sm font-medium">Working Pattern</Label>
                    <Select value={formData.workingPatternId || undefined} onValueChange={(value) => setFormData({ ...formData, workingPatternId: value })}>
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
                    <Label className="text-sm font-medium">Holiday Entitlement (Days)</Label>
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
                      <Button type="button" variant="outline" onClick={() => setIsCalculateModalOpen(true)}>
                        Calculate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={prevStep}>Back</Button>
                  <Button type="submit">Add Employee</Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* Calculate Entitlement Modal */}
      <Dialog open={isCalculateModalOpen} onOpenChange={setIsCalculateModalOpen}>
        <DialogContent title="Calculate Prorated Entitlement">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Standard Full-Time Weekly Hours</Label>
              <Input
                type="number"
                value={fullTimeHours}
                onChange={(e) => setFullTimeHours(e.target.value)}
                placeholder="40"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Standard Full-Time Entitlement (Days)</Label>
              <Input
                type="number"
                value={fullTimeEntitlement}
                onChange={(e) => setFullTimeEntitlement(e.target.value)}
                placeholder="25"
                className="mt-1"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Calculated Entitlement:</p>
              <p className="text-lg font-semibold">{calculatedEntitlement.toFixed(2)} days</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCalculateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={calculateEntitlement} className="mr-2">
                Calculate
              </Button>
              <Button onClick={applyCalculatedEntitlement}>
                Apply
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
