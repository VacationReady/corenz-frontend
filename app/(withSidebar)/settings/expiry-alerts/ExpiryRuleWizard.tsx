"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { toast } from "sonner";

type DateFieldOption = {
  id: string;
  entity: string;
  field: string;
  label: string;
  supportsFilters?: string[];
};

type Option = { value: string; label: string };

export function ExpiryRuleWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<DateFieldOption[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [thresholdText, setThresholdText] = useState<string>("30");
  const thresholds = useMemo(
    () => thresholdText.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)),
    [thresholdText],
  );

  // Filters and recipients
  const [departments, setDepartments] = useState<Option[]>([]);
  const [jobRoles, setJobRoles] = useState<Option[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);
  const [typeOfCheck, setTypeOfCheck] = useState<string[]>([]);

  // Channels and recipients
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [recipientType, setRecipientType] = useState<string>("employee");

  // Preview
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    fetch("/api/expiry-rules/fields")
      .then((r) => r.json())
      .then(setFields)
      .catch(() => setFields([]));

    Promise.all([
      fetch("/api/departments").then((r) => r.ok ? r.json() : []),
      fetch("/api/job-roles").then((r) => r.ok ? r.json() : []),
      fetch("/api/employment-checks/types").then((r) => r.ok ? r.json() : []),
    ])
      .then(([deps, roles, types]) => {
        setDepartments((deps || []).map((d: any) => ({ value: d.id, label: d.name })));
        const jr = Array.isArray(roles) ? roles : roles?.jobRoles || [];
        setJobRoles(jr.map((r: any) => ({ value: r.id, label: r.name })));
        // For typeOfCheck we keep strings directly
      })
      .catch(() => {
        /* soft fail */
      });
  }, [open]);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId],
  );

  const canCreateAutomation = selectedField?.id === "EmploymentCheck.expiryDate";

  const runPreview = async () => {
    if (!selectedField) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/expiry-rules/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: selectedField.id,
          thresholds,
          filters: canCreateAutomation && typeOfCheck.length > 0 ? { typeOfCheck } : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.count ?? null);
      } else {
        setPreviewCount(null);
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const createAsAutomation = async () => {
    if (!canCreateAutomation) {
      toast("Create as Automation is currently available for Employment Checks only");
      return;
    }
    if (!thresholds.length) {
      toast("Add at least one threshold");
      return;
    }

    setSubmitting(true);
    try {
      const created: string[] = [];
      for (const t of thresholds) {
        const body = {
          name: `${selectedField?.label || "Expiry"} – ${t} days`,
          description: "Auto-generated from Expiry Alerts wizard",
          isActive: true,
          triggerType: "DOCUMENT_EXPIRING",
          triggerConfig: {
            daysBefore: t,
            documentTypes: typeOfCheck,
          },
          conditions: [
            ...(selectedDepartments.length
              ? [{ type: "department", config: { operator: "in", value: selectedDepartments } }]
              : []),
            ...(selectedJobRoles.length
              ? [{ type: "jobRole", config: { operator: "in", value: selectedJobRoles } }]
              : []),
          ],
          actions: [
            {
              type: "send_notification",
              config: {
                channels,
                recipientType,
                subject: "Expiry approaching",
                message: "An item is nearing its expiry date.",
              },
            },
          ],
        } as any;

        const res = await fetch("/api/automation-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const j = await res.json();
          created.push(j.id);
        } else {
          const e = await res.json().catch(() => ({} as any));
          toast(e?.error || "Failed to create automation rule");
          break;
        }
      }

      if (created.length === thresholds.length) {
        toast("Automation rules created");
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Build Custom Expiry Workflow" description="Create reminders and actions around any expiry date field" className="max-w-3xl">
        <div className="space-y-4">
          {/* Stepper */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-white" : "bg-gray-200"}`}>1</span>
            <span>Pick date field</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-white" : "bg-gray-200"}`}>2</span>
            <span>Thresholds</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 3 ? "bg-primary text-white" : "bg-gray-200"}`}>3</span>
            <span>Filters</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 4 ? "bg-primary text-white" : "bg-gray-200"}`}>4</span>
            <span>Recipients & Channels</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 5 ? "bg-primary text-white" : "bg-gray-200"}`}>5</span>
            <span>Preview</span>
          </div>

          {/* Step content */}
          {step === 1 && (
            <div className="space-y-2">
              <Label className="text-xs">Date field</Label>
              <select
                className="border rounded px-2 py-2 w-full"
                value={selectedFieldId}
                onChange={(e) => setSelectedFieldId(e.target.value)}
              >
                <option value="" disabled>Select date field…</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label className="text-xs">Thresholds (comma-separated). Negative values send after expiry.</Label>
              <Input value={thresholdText} onChange={(e) => setThresholdText(e.target.value)} placeholder="e.g., 90,60,30,-7" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Departments (optional)</Label>
                <MultiSelect value={selectedDepartments} onValueChange={setSelectedDepartments} options={departments} placeholder="All departments" />
              </div>
              <div>
                <Label className="text-xs">Job Roles (optional)</Label>
                <MultiSelect value={selectedJobRoles} onValueChange={setSelectedJobRoles} options={jobRoles} placeholder="All roles" />
              </div>
              {selectedField?.id === "EmploymentCheck.expiryDate" && (
                <div>
                  <Label className="text-xs">Employment check types (optional)</Label>
                  <MultiSelect value={typeOfCheck} onValueChange={setTypeOfCheck} options={([] as string[]).map((t) => ({ value: t, label: t }))} placeholder="All types" />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Channels</Label>
                <div className="flex gap-3 text-sm">
                  {(["email", "slack", "teams"]) as string[]).map((c) => (
                    <label key={c} className="flex items-center gap-1">
                      <input type="checkbox" checked={channels.includes(c)} onChange={(e) => {
                        setChannels((prev) => e.target.checked ? Array.from(new Set([...prev, c])) : prev.filter((x) => x !== c));
                      }} /> {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Recipients</Label>
                <select className="border rounded px-2 py-2 w-full" value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
                  <option value="employee">Employee (subject)</option>
                  <option value="manager">Employee's Manager</option>
                  <option value="hr">HR Team</option>
                </select>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={runPreview} disabled={loadingPreview}>Preview matches</Button>
                {previewCount !== null && <span className="text-sm text-muted-foreground">Estimated matches: {previewCount}</span>}
              </div>
              <div className="text-xs text-muted-foreground">Create as Automation is available for Employment Checks now; other fields will use upcoming triggers.</div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">Step {step} of 5</div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              )}
              {step < 5 && (
                <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedFieldId}>Next</Button>
              )}
              {step === 5 && (
                <Button onClick={createAsAutomation} disabled={submitting || !canCreateAutomation}>Create as Automation</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


