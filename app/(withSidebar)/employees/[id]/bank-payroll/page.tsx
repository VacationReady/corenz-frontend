"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";
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
}

interface InitialValuesState {
  bankAccountNumber: string | null;
  irdNumber: string | null;
  taxCode: NzTaxCodeValue | null;
  kiwiSaverEnrolled: boolean | null;
  kiwiSaverContribution: number | null;
}

export default function BankPayrollPage() {
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<FormState>({
    bankAccountNumber: "",
    irdNumber: "",
    taxCode: "",
    kiwiSaverEnrolled: "",
    kiwiSaverContribution: "",
  });
  const [initialValues, setInitialValues] = useState<InitialValuesState>({
    bankAccountNumber: null,
    irdNumber: null,
    taxCode: null,
    kiwiSaverEnrolled: null,
    kiwiSaverContribution: null,
  });
  const [errors, setErrors] = useState<{ bankAccountNumber?: string; irdNumber?: string }>({});
  const [touched, setTouched] = useState<{ bankAccountNumber: boolean; irdNumber: boolean }>({
    bankAccountNumber: false,
    irdNumber: false,
  });

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
        const res = await fetch(`/api/employees/${id}/bank-payroll`);
        if (!res.ok) return;
        const data = await res.json();

        // Store initial values for audit comparison
        setInitialValues({
          bankAccountNumber: data.bankAccountNumber,
          irdNumber: data.irdNumber,
          taxCode: data.taxCode,
          kiwiSaverEnrolled: data.kiwiSaverEnrolled,
          kiwiSaverContribution: data.kiwiSaverContribution,
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
        });
        setErrors({});
        setTouched({ bankAccountNumber: false, irdNumber: false });
      } catch {}
    })();
  }, [id]);

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
  const disableSave = isBankInvalid || isIrdInvalid;

  // Convert form values to API format
  const getCurrentValues = () => ({
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
  });

  const handleSaveSuccess = () => {
    // Update initial values to current values after successful save
    const currentValues = getCurrentValues();
    setInitialValues(currentValues);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory title="Bank & Payroll" employeeId={id} section="bank-payroll" />

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
                    : ""
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
                    IRD numbers include a check digit. We'll validate them against Inland Revenue
                    rules.
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
                    : ""
                )}
                placeholder="123-456-789"
                inputMode="numeric"
                maxLength={11}
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
                className="block w-full border rounded-md h-9 px-3"
                value={form.kiwiSaverEnrolled}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    kiwiSaverEnrolled: e.target.value as FormState["kiwiSaverEnrolled"],
                  }))
                }
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
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
                onChange={(e) => setForm((f) => ({ ...f, kiwiSaverContribution: e.target.value }))}
              />
            </div>
          </div>
        </Card>
      </TooltipProvider>

      <div className="flex items-center justify-between">
        <Link href={`/employees/${id}/documents`} className="text-sm underline">
          View payslip history
        </Link>
        <EmployeeSaveButton
          employeeId={id}
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
