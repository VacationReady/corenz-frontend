"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";
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
import { Info } from "lucide-react";
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
  });
  const [errors, setErrors] = useState<{ bankAccountNumber?: string; irdNumber?: string }>({});
  const [touched, setTouched] = useState<{ bankAccountNumber: boolean; irdNumber: boolean }>(
    { bankAccountNumber: false, irdNumber: false },
  );
  const [forbidden, setForbidden] = useState(false);

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
        });
        setErrors({});
        setTouched({ bankAccountNumber: false, irdNumber: false });
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

  const normalizedBankAccount = normalizeBankAccountNumber(form.bankAccountNumber);
  const normalizedIrd = normalizeIrdNumber(form.irdNumber);
  const isBankInvalid =
    normalizedBankAccount.length > 0 && !isValidNzBankAccountNumber(normalizedBankAccount);
  const isIrdInvalid = normalizedIrd.length > 0 && !isValidIrdNumber(normalizedIrd);
  
  // For employees, only validate bank account since they can only edit that field.
  // IRD number validation should not block saves for employees as they can't edit it.
  // For admins/managers, validate both bank account and IRD number since they can edit both.
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
    };

    // For employees, only include bankAccountNumber (other fields match initialValues to prevent changes)
    if (isEmployee && !isPrivileged) {
      return {
        bankAccountNumber: values.bankAccountNumber,
        // Keep other fields matching initialValues so they're not detected as changed
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
      };
    }

    return values;
  };

  const handleSaveSuccess = () => {
    const currentValues = getCurrentValues();
    setInitialValues(currentValues);
  };

  if (forbidden) {
    return (
      <UnauthorizedAccess
        title="Access restricted"
        description="Bank & payroll details can only be viewed by administrators or the employee themselves."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6 px-8">
      <HeaderWithHistory
        title="Bank & Payroll"
        employeeId={employeeId}
        section="bank-payroll"
      />

      <TooltipProvider>
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Payroll details</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="bankAccount">
                Bank account
              </label>
              <Input
                id="bankAccount"
                value={form.bankAccountNumber}
                onChange={(e) => handleBankAccountChange(e.target.value)}
                onBlur={handleBankAccountBlur}
                aria-invalid={Boolean(errors.bankAccountNumber)}
                className={cn(
                  errors.bankAccountNumber
                    ? "border-destructive focus:border-destructive focus:ring-destructive/50"
                    : "",
                )}
                placeholder="00-0000-0000000-000"
                inputMode="numeric"
              />
              {errors.bankAccountNumber && (
                <p className="mt-1 text-sm text-destructive">{errors.bankAccountNumber}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="irdNumber">
                  IRD number
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="IRD number guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    IRD numbers include a check digit. We&apos;ll validate them against Inland Revenue rules.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="irdNumber"
                value={form.irdNumber}
                onChange={(e) => handleIrdChange(e.target.value)}
                onBlur={handleIrdBlur}
                aria-invalid={Boolean(errors.irdNumber)}
                className={cn(
                  errors.irdNumber
                    ? "border-destructive focus:border-destructive focus:ring-destructive/50"
                    : "",
                )}
                placeholder="123-456-789"
                inputMode="numeric"
                maxLength={11}
                disabled={isEmployee && !isPrivileged}
              />
              {errors.irdNumber && (
                <p className="mt-1 text-sm text-destructive">{errors.irdNumber}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Format: 12-345-678 or 123-456-789.{" "}
                <a
                  href="https://www.ird.govt.nz/tasks/find-your-ird-number"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Find IRD guidance
                </a>
                .
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="taxCode">
                  Tax code
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Tax code guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Choose from the standard Inland Revenue tax codes.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={form.taxCode || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, taxCode: value as TaxCodeFormValue }))
                }
                disabled={isEmployee && !isPrivileged}
              >
                <SelectTrigger id="taxCode">
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
              <p className="mt-1 text-xs text-muted-foreground">
                <a
                  href="https://www.ird.govt.nz/employing-staff/paye-tax/tax-codes"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Inland Revenue explains each code
                </a>
                .
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="kiwiSaverEnrolled">
                KiwiSaver enrolled
              </label>
              <select
                id="kiwiSaverEnrolled"
                className="block w-full border rounded-md h-9 px-3 disabled:bg-muted disabled:cursor-not-allowed"
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
              {isEmployee && !isPrivileged && (
                <p className="mt-1 text-xs text-muted-foreground">Read-only for employees</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="kiwiSaverContribution">
                KiwiSaver contribution (%)
              </label>
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
              />
              <p className="mt-1 text-xs text-muted-foreground">Legacy field - use employee/employer rates below instead</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="kiwiSaverEmployeeRate">
                  KiwiSaver employee rate (%)
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="KiwiSaver employee rate guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Valid rates: 3%, 4%, 6%, 8%, or 10%. Must be enrolled in KiwiSaver.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={form.kiwiSaverEmployeeRate || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, kiwiSaverEmployeeRate: value }))
                }
                disabled={(form.kiwiSaverEnrolled !== "yes") || (isEmployee && !isPrivileged)}
              >
                <SelectTrigger id="kiwiSaverEmployeeRate">
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
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="kiwiSaverEmployerRate">
                  KiwiSaver employer rate (%)
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="KiwiSaver employer rate guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Minimum 3% required by law. Can be higher as benefit.
                  </TooltipContent>
                </Tooltip>
              </div>
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="hasStudentLoan">
                Has student loan?
              </label>
              <select
                id="hasStudentLoan"
                className="block w-full border rounded-md h-9 px-3 disabled:bg-muted disabled:cursor-not-allowed"
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
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="studentLoanRate">
                  Student loan rate (%)
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Student loan rate guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Standard rate is 12%. Automatically deducted from pay.
                  </TooltipContent>
                </Tooltip>
              </div>
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
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium" htmlFor="specialTaxRate">
                  Special tax rate (%) - Optional
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Special tax rate guidance"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    For non-standard tax situations. Must provide reason below.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                />
                <Input
                  id="taxExemptionReason"
                  value={form.taxExemptionReason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, taxExemptionReason: e.target.value }))
                  }
                  disabled={isEmployee && !isPrivileged}
                  placeholder="Reason for special rate (required if rate set)"
                />
              </div>
            </div>
          </div>
        </Card>
      </TooltipProvider>

      <div className="flex items-center justify-between">
        <Link
          href={`/employees/${employeeId}/documents`}
          className="text-sm underline"
        >
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
      </div>
    </div>
  );
}


