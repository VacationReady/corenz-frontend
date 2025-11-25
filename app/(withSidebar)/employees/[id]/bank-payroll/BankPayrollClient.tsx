"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";
import UnsavedChangesGuard from "@/components/ui/UnsavedChangesGuard";
import EmployeeFormCard, { FormSection, FormField } from "@/components/employees/EmployeeFormCard";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import UnauthorizedAccess from "@/components/ui/UnauthorizedAccess";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CreditCard,
  Banknote,
  FileText,
  GraduationCap,
  Calculator,
  Info,
  DollarSign,
  Percent,
  ExternalLink,
} from "lucide-react";
import {
  NZ_TAX_CODE_OPTIONS,
  cn,
  formatBankAccountNumber,
  formatIrdNumber,
  isValidIrdNumber,
  isValidNzBankAccountNumber,
  normalizeBankAccountNumber,
  normalizeIrdNumber,
} from "@/lib/utils";
import type { NzTaxCodeValue } from "@/lib/utils";

type TaxCodeFormValue = "" | NzTaxCodeValue;

interface FormState {
  bankAccountNumber: string;
  irdNumber: string;
  taxCode: TaxCodeFormValue;
  kiwiSaverEnrolled: "" | "yes" | "no";
  kiwiSaverContribution: string;
  kiwiSaverEmployeeRate: string;
  kiwiSaverEmployerRate: string;
  hasStudentLoan: "" | "yes" | "no";
  studentLoanRate: string;
  specialTaxRate: string;
  taxExemptionReason: string;
  salaryAmount: string;
  hourlyRate: string;
}

interface InitialValuesState {
  bankAccountNumber: string | null;
  irdNumber: string | null;
  taxCode: NzTaxCodeValue | null;
  kiwiSaverEnrolled: boolean | null;
  kiwiSaverContribution: number | null;
  kiwiSaverEmployeeRate: number | null;
  kiwiSaverEmployerRate: number | null;
  hasStudentLoan: boolean | null;
  studentLoanRate: number | null;
  specialTaxRate: number | null;
  taxExemptionReason: string | null;
  salaryAmount: number | null;
  hourlyRate: number | null;
}

// Info tooltip component
function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="More info"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export default function BankPayrollClient({ employeeId }: { employeeId: string }) {
  const tenantFetch = useTenantFetch();
  const { data: session } = useSession();
  const userRole = session?.user?.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" | undefined;
  const isEmployee = userRole === "EMPLOYEE";
  const isPrivileged = userRole === "ADMIN" || userRole === "MANAGER" || userRole === "SUPER_ADMIN";
  const [form, setForm] = useState<FormState>({
    bankAccountNumber: "",
    irdNumber: "",
    taxCode: "",
    kiwiSaverEnrolled: "",
    kiwiSaverContribution: "",
    kiwiSaverEmployeeRate: "",
    kiwiSaverEmployerRate: "",
    hasStudentLoan: "",
    studentLoanRate: "",
    specialTaxRate: "",
    taxExemptionReason: "",
    salaryAmount: "",
    hourlyRate: "",
  });
  const [initialValues, setInitialValues] = useState<InitialValuesState>({
    bankAccountNumber: null,
    irdNumber: null,
    taxCode: null,
    kiwiSaverEnrolled: null,
    kiwiSaverContribution: null,
    kiwiSaverEmployeeRate: null,
    kiwiSaverEmployerRate: null,
    hasStudentLoan: null,
    studentLoanRate: null,
    specialTaxRate: null,
    taxExemptionReason: null,
    salaryAmount: null,
    hourlyRate: null,
  });
  const [errors, setErrors] = useState<{ bankAccountNumber?: string; irdNumber?: string }>({});
  const [touched, setTouched] = useState<{ bankAccountNumber: boolean; irdNumber: boolean }>(
    { bankAccountNumber: false, irdNumber: false },
  );
  const [forbidden, setForbidden] = useState(false);
  const [workingPattern, setWorkingPattern] = useState<any>(null);
  const [calculatedSalary, setCalculatedSalary] = useState<number | null>(null);
  const [calculatedHourlyRate, setCalculatedHourlyRate] = useState<number | null>(null);
  const [salaryMessage, setSalaryMessage] = useState<string>("");
  const [hourlyRateMessage, setHourlyRateMessage] = useState<string>("");
  const [hasManuallyEditedSalary, setHasManuallyEditedSalary] = useState(false);
  const [hasManuallyEditedHourlyRate, setHasManuallyEditedHourlyRate] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<'hourly' | 'salary' | null>(null);

  const validateBankAccount = (value: string) => {
    const normalized = normalizeBankAccountNumber(value);
    if (!normalized) return undefined;
    if (normalized.length < 15 || normalized.length > 16) {
      return "Bank account numbers must be 15 or 16 digits.";
    }
    if (!isValidNzBankAccountNumber(normalized)) {
      return "Enter a valid New Zealand bank account number.";
    }
    return undefined;
  };

  const validateIrd = (value: string) => {
    const normalized = normalizeIrdNumber(value);
    if (!normalized) return undefined;
    if (normalized.length < 8 || normalized.length > 9) {
      return "IRD numbers must be 8 or 9 digits.";
    }
    if (!isValidIrdNumber(normalized)) {
      return "Enter a valid IRD number.";
    }
    return undefined;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await tenantFetch(`/api/employees/${employeeId}/bank-payroll`);
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();

        setInitialValues({
          bankAccountNumber: data.bankAccountNumber,
          irdNumber: data.irdNumber,
          taxCode: data.taxCode,
          kiwiSaverEnrolled: data.kiwiSaverEnrolled,
          kiwiSaverContribution: data.kiwiSaverContribution,
          kiwiSaverEmployeeRate: data.kiwiSaverEmployeeRate,
          kiwiSaverEmployerRate: data.kiwiSaverEmployerRate,
          hasStudentLoan: data.hasStudentLoan,
          studentLoanRate: data.studentLoanRate,
          specialTaxRate: data.specialTaxRate,
          taxExemptionReason: data.taxExemptionReason,
          salaryAmount: data.salaryAmount,
          hourlyRate: data.hourlyRate,
        });

        setForm({
          bankAccountNumber: formatBankAccountNumber(data.bankAccountNumber ?? ""),
          irdNumber: formatIrdNumber(data.irdNumber ?? ""),
          taxCode: data.taxCode ?? "",
          kiwiSaverEnrolled:
            data.kiwiSaverEnrolled === true
              ? "yes"
              : data.kiwiSaverEnrolled === false
              ? "no"
              : "",
          kiwiSaverContribution: data.kiwiSaverContribution?.toString() ?? "",
          kiwiSaverEmployeeRate: data.kiwiSaverEmployeeRate ? (data.kiwiSaverEmployeeRate * 100).toString() : "",
          kiwiSaverEmployerRate: data.kiwiSaverEmployerRate ? (data.kiwiSaverEmployerRate * 100).toString() : "",
          hasStudentLoan:
            data.hasStudentLoan === true
              ? "yes"
              : data.hasStudentLoan === false
              ? "no"
              : "",
          studentLoanRate: data.studentLoanRate ? (data.studentLoanRate * 100).toString() : "",
          specialTaxRate: data.specialTaxRate ? (data.specialTaxRate * 100).toString() : "",
          taxExemptionReason: data.taxExemptionReason ?? "",
          salaryAmount: data.salaryAmount?.toString() ?? "",
          hourlyRate: data.hourlyRate?.toString() ?? "",
        });
        setErrors({});
        setTouched({ bankAccountNumber: false, irdNumber: false });

        // Fetch working pattern with full details
        try {
          const patternRes = await tenantFetch(`/api/employees/${employeeId}/working-pattern-assignment`);
          if (patternRes.ok) {
            const patterns = await patternRes.json();
            if (patterns && patterns.length > 0 && patterns[0].WorkingPattern) {
              const pattern = patterns[0].WorkingPattern;
              setWorkingPattern(pattern);
            } else {
              setWorkingPattern(null);
            }
          }
        } catch (err) {
          console.error("Failed to fetch working pattern", err);
          setWorkingPattern(null);
        }
      } catch {}
    })();
  }, [employeeId, tenantFetch]);

  const handleBankAccountChange = (value: string) => {
    const formatted = formatBankAccountNumber(value);
    setForm((prev) => ({ ...prev, bankAccountNumber: formatted }));

    const normalized = normalizeBankAccountNumber(formatted);
    if (!normalized) {
      setErrors((prev) => ({ ...prev, bankAccountNumber: undefined }));
      return;
    }

    if (touched.bankAccountNumber || normalized.length >= 15) {
      setErrors((prev) => ({
        ...prev,
        bankAccountNumber: validateBankAccount(formatted),
      }));
    }
  };

  const handleBankAccountBlur = () => {
    setTouched((prev) => ({ ...prev, bankAccountNumber: true }));
    setErrors((prev) => ({
      ...prev,
      bankAccountNumber: validateBankAccount(form.bankAccountNumber),
    }));
  };

  const handleIrdChange = (value: string) => {
    const formatted = formatIrdNumber(value);
    setForm((prev) => ({ ...prev, irdNumber: formatted }));

    const normalized = normalizeIrdNumber(formatted);
    if (!normalized) {
      setErrors((prev) => ({ ...prev, irdNumber: undefined }));
      return;
    }

    if (touched.irdNumber || normalized.length >= 8) {
      setErrors((prev) => ({
        ...prev,
        irdNumber: validateIrd(formatted),
      }));
    }
  };

  const handleIrdBlur = () => {
    setTouched((prev) => ({ ...prev, irdNumber: true }));
    setErrors((prev) => ({ ...prev, irdNumber: validateIrd(form.irdNumber) }));
  };

  // Calculate hours per week from working pattern (helper function)
  const getHoursPerWeek = () => {
    if (!workingPattern) return null;

    // Try to use contractedHoursPerWeek if available (for SHIFT_BASED patterns)
    if (workingPattern.contractedHoursPerWeek) {
      return parseFloat(workingPattern.contractedHoursPerWeek.toString());
    }

    // Otherwise calculate from WorkingPatternWeek structure
    if (!workingPattern.WorkingPatternWeek || workingPattern.WorkingPatternWeek.length === 0) {
      return null;
    }

    // Calculate total hours per week from working pattern
    let totalHours = 0;
    let weekCount = 0;

    for (const week of workingPattern.WorkingPatternWeek) {
      if (!week.WorkingPatternDay || week.WorkingPatternDay.length === 0) continue;
      weekCount++;
      
      for (const day of week.WorkingPatternDay) {
        if (day.type === 'FULL_DAY') {
          totalHours += day.hoursPerDay ? parseFloat(day.hoursPerDay.toString()) : 8;
        } else if (day.type.includes('HALF_DAY')) {
          totalHours += day.hoursPerDay ? parseFloat(day.hoursPerDay.toString()) / 2 : 4;
        }
      }
    }

    if (weekCount === 0 || totalHours === 0) return null;
    
    return totalHours / weekCount;
  };

  // Auto-calculate annual salary from hourly rate
  useEffect(() => {
    if (lastEditedField !== 'hourly' && lastEditedField !== null) return;

    const hourlyRateNum = parseFloat(form.hourlyRate);
    
    if (!hourlyRateNum || isNaN(hourlyRateNum)) {
      setCalculatedSalary(null);
      setSalaryMessage("");
      return;
    }

    const hoursPerWeek = getHoursPerWeek();
    
    if (!hoursPerWeek) {
      setCalculatedSalary(null);
      setSalaryMessage("Can't calculate - no working pattern");
      return;
    }

    const weeksPerYear = 52;
    const annualSalary = hourlyRateNum * hoursPerWeek * weeksPerYear;
    
    setCalculatedSalary(annualSalary);
    setSalaryMessage("");
    
    if (isPrivileged && !hasManuallyEditedSalary && lastEditedField === 'hourly') {
      setForm((prev) => ({ ...prev, salaryAmount: annualSalary.toFixed(2) }));
    }
  }, [form.hourlyRate, workingPattern, isPrivileged, hasManuallyEditedSalary, lastEditedField]);

  // Auto-calculate hourly rate from annual salary
  useEffect(() => {
    if (lastEditedField !== 'salary' && lastEditedField !== null) return;

    const salaryNum = parseFloat(form.salaryAmount);
    
    if (!salaryNum || isNaN(salaryNum)) {
      setCalculatedHourlyRate(null);
      setHourlyRateMessage("");
      return;
    }

    const hoursPerWeek = getHoursPerWeek();
    
    if (!hoursPerWeek) {
      setCalculatedHourlyRate(null);
      setHourlyRateMessage("Can't calculate - no working pattern");
      return;
    }

    const weeksPerYear = 52;
    const hourlyRate = salaryNum / (hoursPerWeek * weeksPerYear);
    
    setCalculatedHourlyRate(hourlyRate);
    setHourlyRateMessage("");
    
    if (isPrivileged && !hasManuallyEditedHourlyRate && lastEditedField === 'salary') {
      setForm((prev) => ({ ...prev, hourlyRate: hourlyRate.toFixed(2) }));
    }
  }, [form.salaryAmount, workingPattern, isPrivileged, hasManuallyEditedHourlyRate, lastEditedField]);

  const normalizedBankAccount = normalizeBankAccountNumber(form.bankAccountNumber);
  const normalizedIrd = normalizeIrdNumber(form.irdNumber);
  const isBankInvalid =
    normalizedBankAccount.length > 0 && !isValidNzBankAccountNumber(normalizedBankAccount);
  
  const irdHasChanged = normalizedIrd !== normalizeIrdNumber(formatIrdNumber(initialValues.irdNumber ?? ""));
  const isIrdInvalid = normalizedIrd.length > 0 && irdHasChanged && !isValidIrdNumber(normalizedIrd);
  
  const disableSave = isEmployee && !isPrivileged 
    ? isBankInvalid 
    : (isBankInvalid || isIrdInvalid);

  const getCurrentValues = () => {
    const values: any = {
      bankAccountNumber: normalizedBankAccount
        ? formatBankAccountNumber(normalizedBankAccount)
        : null,
      irdNumber: normalizedIrd ? normalizedIrd : null,
      taxCode: form.taxCode || null,
      kiwiSaverEnrolled:
        form.kiwiSaverEnrolled === "yes"
          ? true
          : form.kiwiSaverEnrolled === "no"
          ? false
          : null,
      kiwiSaverContribution: form.kiwiSaverContribution
        ? Number(form.kiwiSaverContribution)
        : null,
      kiwiSaverEmployeeRate: form.kiwiSaverEmployeeRate
        ? Number(form.kiwiSaverEmployeeRate) / 100
        : null,
      kiwiSaverEmployerRate: form.kiwiSaverEmployerRate
        ? Number(form.kiwiSaverEmployerRate) / 100
        : null,
      hasStudentLoan:
        form.hasStudentLoan === "yes"
          ? true
          : form.hasStudentLoan === "no"
          ? false
          : null,
      studentLoanRate: form.studentLoanRate
        ? Number(form.studentLoanRate) / 100
        : null,
      specialTaxRate: form.specialTaxRate
        ? Number(form.specialTaxRate) / 100
        : null,
      taxExemptionReason: form.taxExemptionReason || null,
      salaryAmount: form.salaryAmount && form.salaryAmount.trim() !== "" ? Number(form.salaryAmount) : null,
      hourlyRate: form.hourlyRate && form.hourlyRate.trim() !== "" ? Number(form.hourlyRate) : null,
    };

    if (isEmployee && !isPrivileged) {
      return {
        bankAccountNumber: values.bankAccountNumber,
        irdNumber: initialValues.irdNumber,
        taxCode: initialValues.taxCode,
        kiwiSaverEnrolled: initialValues.kiwiSaverEnrolled,
        kiwiSaverContribution: initialValues.kiwiSaverContribution,
        kiwiSaverEmployeeRate: initialValues.kiwiSaverEmployeeRate,
        kiwiSaverEmployerRate: initialValues.kiwiSaverEmployerRate,
        hasStudentLoan: initialValues.hasStudentLoan,
        studentLoanRate: initialValues.studentLoanRate,
        specialTaxRate: initialValues.specialTaxRate,
        taxExemptionReason: initialValues.taxExemptionReason,
        salaryAmount: initialValues.salaryAmount,
        hourlyRate: initialValues.hourlyRate,
      };
    }

    return values;
  };

  const handleSaveSuccess = () => {
    const currentValues = getCurrentValues();
    setInitialValues(currentValues);
  };

  // Reset manual edit flags when working pattern changes
  useEffect(() => {
    if (workingPattern) {
      setHasManuallyEditedSalary(false);
      setHasManuallyEditedHourlyRate(false);
      setLastEditedField(null);
    }
  }, [workingPattern]);

  if (forbidden) {
    return (
      <UnauthorizedAccess
        title="Access restricted"
        description="Bank & payroll details can only be viewed by administrators or the employee themselves."
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
        <HeaderWithHistory
          title="Bank & Payroll"
          employeeId={employeeId}
          section="bank-payroll"
          description="Manage banking, tax, and compensation information"
        />

        <UnsavedChangesGuard>
          {/* Banking & Tax Details */}
          <EmployeeFormCard
            title="Banking & Tax Details"
            description="IRD, bank account, and tax code information"
            icon={Banknote}
            iconColor="from-sky-500/20 to-blue-500/20"
            delay={0.1}
          >
            <FormSection columns={2}>
              {/* Bank Account */}
              <div className="md:col-span-2">
                <FormField
                  label="Bank account"
                  htmlFor="bankAccount"
                  error={errors.bankAccountNumber}
                  hint="Format: 00-0000-0000000-000"
                >
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="bankAccount"
                      value={form.bankAccountNumber}
                      onChange={(e) => handleBankAccountChange(e.target.value)}
                      onBlur={handleBankAccountBlur}
                      aria-invalid={Boolean(errors.bankAccountNumber)}
                      className={cn(
                        "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                        errors.bankAccountNumber && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                      placeholder="00-0000-0000000-000"
                      inputMode="numeric"
                    />
                  </div>
                </FormField>
              </div>

              {/* IRD Number */}
              <FormField
                label="IRD number"
                htmlFor="irdNumber"
                error={errors.irdNumber}
                action={<InfoTooltip content="IRD numbers include a check digit. We'll validate them against Inland Revenue rules." />}
              >
                <Input
                  id="irdNumber"
                  value={form.irdNumber}
                  onChange={(e) => handleIrdChange(e.target.value)}
                  onBlur={handleIrdBlur}
                  aria-invalid={Boolean(errors.irdNumber)}
                  className={cn(
                    "h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                    errors.irdNumber && "border-destructive focus:border-destructive focus:ring-destructive/20",
                    (isEmployee && !isPrivileged) && "bg-muted/30"
                  )}
                  placeholder="123-456-789"
                  inputMode="numeric"
                  maxLength={11}
                  disabled={isEmployee && !isPrivileged}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <a
                    href="https://www.ird.govt.nz/tasks/find-your-ird-number"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Find IRD guidance <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </FormField>

              {/* Tax Code */}
              <FormField
                label="Tax code"
                htmlFor="taxCode"
                action={<InfoTooltip content="Choose from the standard Inland Revenue tax codes." />}
              >
                <Select
                  value={form.taxCode || undefined}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, taxCode: value as TaxCodeFormValue }))
                  }
                  disabled={isEmployee && !isPrivileged}
                >
                  <SelectTrigger 
                    id="taxCode" 
                    className={cn(
                      "h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      (isEmployee && !isPrivileged) && "bg-muted/30"
                    )}
                  >
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
                  <SelectContent>
                    {NZ_TAX_CODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  <a
                    href="https://www.ird.govt.nz/employing-staff/paye-tax/tax-codes"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Inland Revenue tax code guide <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </FormField>
            </FormSection>
          </EmployeeFormCard>

          {/* KiwiSaver Details */}
          <EmployeeFormCard
            title="KiwiSaver"
            description="Retirement savings contribution details"
            icon={GraduationCap}
            iconColor="from-primary/20 to-blue-500/20"
            delay={0.2}
          >
            <FormSection columns={2}>
              {/* KiwiSaver Enrolled */}
              <FormField label="KiwiSaver enrolled" htmlFor="kiwiSaverEnrolled">
                <select
                  id="kiwiSaverEnrolled"
                  className={cn(
                    "flex h-11 w-full rounded-xl border px-3 py-2 text-sm transition-colors",
                    "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-2",
                    (isEmployee && !isPrivileged) && "bg-muted/30 cursor-not-allowed"
                  )}
                  value={form.kiwiSaverEnrolled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      kiwiSaverEnrolled: e.target.value as FormState["kiwiSaverEnrolled"],
                    }))
                  }
                  disabled={isEmployee && !isPrivileged}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>

              {/* Legacy Contribution */}
              <FormField 
                label="KiwiSaver contribution (%)" 
                htmlFor="kiwiSaverContribution"
                hint="Legacy field - use employee/employer rates below"
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="kiwiSaverContribution"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.kiwiSaverContribution}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, kiwiSaverContribution: e.target.value }))
                    }
                    disabled={isEmployee && !isPrivileged}
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      (isEmployee && !isPrivileged) && "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Employee Rate */}
              <FormField
                label="Employee rate (%)"
                htmlFor="kiwiSaverEmployeeRate"
                action={<InfoTooltip content="Valid rates: 3%, 4%, 6%, 8%, or 10%. Must be enrolled in KiwiSaver." />}
              >
                <Select
                  value={form.kiwiSaverEmployeeRate || undefined}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, kiwiSaverEmployeeRate: value }))
                  }
                  disabled={(form.kiwiSaverEnrolled !== "yes") || (isEmployee && !isPrivileged)}
                >
                  <SelectTrigger 
                    id="kiwiSaverEmployeeRate"
                    className={cn(
                      "h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      ((form.kiwiSaverEnrolled !== "yes") || (isEmployee && !isPrivileged)) && "bg-muted/30"
                    )}
                  >
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3%</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {/* Employer Rate */}
              <FormField
                label="Employer rate (%)"
                htmlFor="kiwiSaverEmployerRate"
                action={<InfoTooltip content="Minimum 3% required by law. Can be higher as benefit." />}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="kiwiSaverEmployerRate"
                    type="number"
                    min="3"
                    max="100"
                    step="0.5"
                    value={form.kiwiSaverEmployerRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, kiwiSaverEmployerRate: e.target.value }))
                    }
                    disabled={(form.kiwiSaverEnrolled !== "yes") || (isEmployee && !isPrivileged)}
                    placeholder="3"
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      ((form.kiwiSaverEnrolled !== "yes") || (isEmployee && !isPrivileged)) && "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>
            </FormSection>
          </EmployeeFormCard>

          {/* Student Loan & Special Tax */}
          <EmployeeFormCard
            title="Student Loan & Special Tax"
            description="Student loan and special tax rate information"
            icon={Calculator}
            iconColor="from-blue-500/20 to-indigo-500/20"
            delay={0.3}
          >
            <FormSection columns={2}>
              {/* Has Student Loan */}
              <FormField label="Has student loan?" htmlFor="hasStudentLoan">
                <select
                  id="hasStudentLoan"
                  className={cn(
                    "flex h-11 w-full rounded-xl border px-3 py-2 text-sm transition-colors",
                    "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-2",
                    (isEmployee && !isPrivileged) && "bg-muted/30 cursor-not-allowed"
                  )}
                  value={form.hasStudentLoan}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      hasStudentLoan: e.target.value as FormState["hasStudentLoan"],
                    }))
                  }
                  disabled={isEmployee && !isPrivileged}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>

              {/* Student Loan Rate */}
              <FormField
                label="Student loan rate (%)"
                htmlFor="studentLoanRate"
                action={<InfoTooltip content="Standard rate is 12%. Automatically deducted from pay." />}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="studentLoanRate"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={form.studentLoanRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, studentLoanRate: e.target.value }))
                    }
                    disabled={(form.hasStudentLoan !== "yes") || (isEmployee && !isPrivileged)}
                    placeholder="12"
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      ((form.hasStudentLoan !== "yes") || (isEmployee && !isPrivileged)) && "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Special Tax Rate */}
              <FormField
                label="Special tax rate (%) - Optional"
                htmlFor="specialTaxRate"
                action={<InfoTooltip content="For non-standard tax situations. Must provide reason." />}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="specialTaxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.specialTaxRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, specialTaxRate: e.target.value }))
                    }
                    disabled={isEmployee && !isPrivileged}
                    placeholder="e.g., 17.5"
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      (isEmployee && !isPrivileged) && "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Tax Exemption Reason */}
              <FormField label="Reason for special rate" htmlFor="taxExemptionReason">
                <Input
                  id="taxExemptionReason"
                  value={form.taxExemptionReason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, taxExemptionReason: e.target.value }))
                  }
                  disabled={isEmployee && !isPrivileged}
                  placeholder="Required if special rate is set"
                  className={cn(
                    "h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                    (isEmployee && !isPrivileged) && "bg-muted/30"
                  )}
                />
              </FormField>
            </FormSection>
          </EmployeeFormCard>

          {/* Compensation */}
          <EmployeeFormCard
            title="Compensation"
            description="Salary and hourly rate information"
            icon={DollarSign}
            iconColor="from-indigo-500/20 to-violet-500/20"
            delay={0.4}
          >
            <FormSection columns={2}>
              {/* Hourly Rate */}
              <FormField
                label="Hourly rate"
                htmlFor="hourlyRate"
                hint={workingPattern ? `Working pattern: ${workingPattern.name}` : undefined}
                action={<InfoTooltip content="Enter the hourly rate. Annual salary will auto-calculate based on working pattern." />}
              >
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, hourlyRate: e.target.value }));
                      setLastEditedField('hourly');
                      setHasManuallyEditedHourlyRate(false);
                    }}
                    disabled={isEmployee && !isPrivileged}
                    placeholder="0.00"
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      (isEmployee && !isPrivileged) && "bg-muted/30"
                    )}
                  />
                </div>
                {hourlyRateMessage && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{hourlyRateMessage}</p>
                )}
                {calculatedHourlyRate && !hourlyRateMessage && lastEditedField === 'salary' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Calculated: ${calculatedHourlyRate.toFixed(2)}/hr
                  </p>
                )}
              </FormField>

              {/* Annual Salary */}
              <FormField label="Annual salary" htmlFor="salaryAmount">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="salaryAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salaryAmount}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, salaryAmount: e.target.value }));
                      setLastEditedField('salary');
                      setHasManuallyEditedSalary(false);
                    }}
                    disabled={isEmployee && !isPrivileged}
                    placeholder="0.00"
                    className={cn(
                      "h-11 pl-10 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20",
                      (isEmployee && !isPrivileged) && "bg-muted/30"
                    )}
                  />
                </div>
                {salaryMessage && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{salaryMessage}</p>
                )}
                {calculatedSalary && !salaryMessage && lastEditedField === 'hourly' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Calculated: ${calculatedSalary.toFixed(2)}/year
                  </p>
                )}
              </FormField>
            </FormSection>
          </EmployeeFormCard>

          {/* Footer Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-between pt-4"
          >
            <Link
              href={`/employees/${employeeId}/documents`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="w-4 h-4" />
              View payslip history
            </Link>
            <EmployeeSaveButton
              employeeId={employeeId}
              endpoint="bank-payroll"
              initialValues={initialValues}
              currentValues={getCurrentValues()}
              onSaveSuccess={handleSaveSuccess}
              disabled={disableSave}
            />
          </motion.div>
        </UnsavedChangesGuard>
      </div>
    </TooltipProvider>
  );
}
