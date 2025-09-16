"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";

export default function BankPayrollPage({ params }: { params: { id: string } }) {
  const [form, setForm] = useState({
    bankAccountNumber: "",
    taxCode: "",
    kiwiSaverEnrolled: "",
    kiwiSaverContribution: "",
  });
  const [initialValues, setInitialValues] = useState({
    bankAccountNumber: null,
    taxCode: null,
    kiwiSaverEnrolled: null,
    kiwiSaverContribution: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/employees/${params.id}/bank-payroll`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Store initial values for audit comparison
        setInitialValues({
          bankAccountNumber: data.bankAccountNumber,
          taxCode: data.taxCode,
          kiwiSaverEnrolled: data.kiwiSaverEnrolled,
          kiwiSaverContribution: data.kiwiSaverContribution,
        });
        
        setForm({
          bankAccountNumber: data.bankAccountNumber ?? "",
          taxCode: data.taxCode ?? "",
          kiwiSaverEnrolled: data.kiwiSaverEnrolled ? "yes" : "no",
          kiwiSaverContribution: data.kiwiSaverContribution?.toString() ?? "",
        });
      } catch {}
    })();
  }, [params.id]);

  // Convert form values to API format
  const getCurrentValues = () => ({
    bankAccountNumber: form.bankAccountNumber || null,
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
      <HeaderWithHistory 
        title="Bank & Payroll" 
        employeeId={params.id} 
        section="bank-payroll" 
      />

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Payroll details</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Bank account</label>
            <Input
              value={form.bankAccountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tax code</label>
            <Input
              value={form.taxCode}
              onChange={(e) => setForm((f) => ({ ...f, taxCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">KiwiSaver enrolled</label>
            <select
              className="block w-full border rounded-md h-9 px-3"
              value={form.kiwiSaverEnrolled}
              onChange={(e) =>
                setForm((f) => ({ ...f, kiwiSaverEnrolled: e.target.value }))
              }
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">KiwiSaver contribution (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.kiwiSaverContribution}
              onChange={(e) =>
                setForm((f) => ({ ...f, kiwiSaverContribution: e.target.value }))
              }
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Link
          href={`/employees/${params.id}/documents`}
          className="text-sm underline"
        >
          View payslip history
        </Link>
        <EmployeeSaveButton
          employeeId={params.id}
          endpoint="bank-payroll"
          initialValues={initialValues}
          currentValues={getCurrentValues()}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
    </div>
  );
}


