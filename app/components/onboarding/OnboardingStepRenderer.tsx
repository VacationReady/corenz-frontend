"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { EnhancedFormRenderer } from "@/components/forms/EnhancedFormRenderer";
import { GlassSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  normalizeStepMetadata,
  PAYROLL_FIELD_TYPES,
  DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS,
  DEFAULT_KIWISAVER_STATUS_OPTIONS,
  type PayrollFieldType,
} from "@/lib/onboarding/stepMetadata";
import { validateIRDNumber } from "@/lib/payroll/validators";
import { mapDbStepTypeToUi } from "@/lib/onboarding/stepTypeMapping";

type OnboardingStepProps = {
  step: {
    id: string;
    type: string;
    label?: string;
    title?: string;
    description?: string;
    instruction?: string;
    formFields?: { label: string; type: string }[];
    formId?: string; // ID of reusable form schema
    form?: { formType: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN" };
    document?: { id: string; name: string; url: string };
    category?: string;
  };
  onComplete: (data?: any) => void;
  readOnly?: boolean;
  employeeId?: string;
  __companyId?: string;
  isCompleting?: boolean;
};

export default function OnboardingStepRenderer({
  step,
  onComplete,
  readOnly = false,
  employeeId,
  __companyId,
  isCompleting = false,
}: OnboardingStepProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});
  const [formType, setFormType] = useState<"SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN" | null>(
    step.form?.formType || null,
  );
  const stepType = useMemo(() => {
    const providedType =
      (step && typeof step === "object" && (step as any).uiType)
        ? (step as any).uiType
        : step.type;
    const mapped = mapDbStepTypeToUi(providedType);
    if (mapped) {
      return mapped;
    }
    if (typeof providedType === "string") {
      return providedType.toLowerCase().replace(/_/g, "-");
    }
    if (typeof step.type === "string") {
      return step.type.toLowerCase().replace(/_/g, "-");
    }
    return "";
  }, [step]);

  const metadata = useMemo(
    () => normalizeStepMetadata(stepType, (step as any).metadata),
    [stepType, (step as any).metadata],
  );

  const parseChecklist = (items: any) =>
    Array.isArray(items)
      ? items.map((item: any, index: number) => ({
          id:
            typeof item.id === "string" && item.id.trim().length
              ? item.id
              : typeof item.label === "string" && item.label.trim().length
                ? item.label
                : `item-${index + 1}`,
          label: String(item.label ?? item.name ?? "Item"),
          completed: Boolean(item.completed ?? item.granted ?? false),
          notes: item.notes ? String(item.notes) : undefined,
          url: item.url ? String(item.url) : undefined,
          required: Boolean(item.required ?? false),
        }))
      : [];

  const parseTimeline = (timeline: any) =>
    Array.isArray(timeline)
      ? timeline.map((entry: any, index: number) => ({
          id:
            typeof entry.id === "string" && entry.id.trim().length
              ? entry.id
              : typeof entry.label === "string" && entry.label.trim().length
                ? entry.label
                : `checkin-${index + 1}`,
          label: String(entry.label ?? "Check-in"),
          scheduledAt: entry.scheduledAt ? String(entry.scheduledAt) : "",
        }))
      : [];

  const parseGoals = (goals: any) =>
    Array.isArray(goals)
      ? goals.map((goal: any, index: number) => {
          const title =
            typeof goal.title === "string" && goal.title.trim().length
              ? goal.title
              : typeof goal.label === "string" && goal.label.trim().length
                ? goal.label
                : `Goal ${index + 1}`;
          return {
            id:
              typeof goal.id === "string" && goal.id.trim().length
                ? goal.id
                : title,
            title: String(title),
            completed: Boolean(goal.completed),
            notes: goal.notes ? String(goal.notes) : "",
            required: goal.required === undefined ? true : Boolean(goal.required),
          };
        })
      : [];

  const parsePayrollFieldType = (value: unknown): PayrollFieldType => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if ((PAYROLL_FIELD_TYPES as readonly string[]).includes(trimmed)) {
        return trimmed as PayrollFieldType;
      }
    }
    return "text";
  };

  const normalizeOptionsForType = (
    fieldType: PayrollFieldType,
    supplied: unknown,
  ): string[] => {
    if (fieldType === "kiwiSaverEmployeeRate") {
      return Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS);
    }
    if (fieldType === "kiwiSaverStatus") {
      return Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS);
    }
    if (fieldType === "select" && Array.isArray(supplied)) {
      return supplied
        .map((option) =>
          typeof option === "string"
            ? option.trim()
            : option != null
              ? String(option).trim()
              : "",
        )
        .filter(Boolean);
    }
    return [];
  };

  const kiwiSaverStatusLabels: Record<string, string> = {
    enrolled: "Enrolled",
    opted_out: "Opted out",
    contributions_holiday: "Contributions holiday",
  };

  const toTitleCase = (value: string) =>
    value
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatPayrollOptionLabel = (
    option: string,
    type: PayrollFieldType,
  ) => {
    if (type === "kiwiSaverEmployeeRate") {
      const numeric = Number(option);
      if (Number.isFinite(numeric)) {
        return `${(numeric * 100).toFixed(numeric * 100 % 1 === 0 ? 0 : 1)}%`;
      }
    }
    if (type === "kiwiSaverStatus") {
      return kiwiSaverStatusLabels[option] ?? toTitleCase(option);
    }
    return option;
  };

  const parseKiwiSaverRate = (value: string) => {
    if (!value) return null;
    const cleaned = value.replace(/%/g, "").trim();
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return value.includes("%") ? numeric / 100 : numeric;
  };

  type PayrollFieldDefinition = {
    id: string;
    label: string;
    defaultValue: string;
    required: boolean;
    placeholder?: string;
    fieldType: PayrollFieldType;
    options: string[];
  };

  const parsePayrollFields = (meta: any): PayrollFieldDefinition[] => {
    if (Array.isArray(meta?.fields)) {
      return meta.fields.map((field: any, index: number) => {
        const id =
          typeof field?.id === "string" && field.id.trim().length
            ? field.id.trim()
            : `payroll-${index + 1}`;
        const label =
          typeof field?.label === "string" && field.label.trim().length
            ? field.label.trim()
            : id;
        const fieldType = parsePayrollFieldType(field?.fieldType ?? field?.type);
        const options = normalizeOptionsForType(fieldType, field?.options);
        const defaultValue =
          typeof field?.defaultValue === "string"
            ? field.defaultValue
            : field?.defaultValue != null
              ? String(field.defaultValue)
              : options[0] ?? "";
        const placeholder =
          typeof field?.placeholder === "string" ? field.placeholder : "";
        return {
          id,
          label,
          defaultValue,
          placeholder,
          required: Boolean(field?.required ?? true),
          fieldType,
          options,
        };
      });
    }

    const requiredFields = Array.isArray(meta?.requiredFields)
      ? meta.requiredFields
      : [];
    const defaults =
      meta?.defaults && typeof meta.defaults === "object"
        ? (meta.defaults as Record<string, unknown>)
        : {};

    return requiredFields.map((field: any, index: number) => {
      const id =
        typeof field === "string" && field.trim().length
          ? field.trim()
          : `payroll-${index + 1}`;
      const value = (defaults as Record<string, unknown>)[field as string];
      return {
        id,
        label: id,
        defaultValue:
          typeof value === "string"
            ? value
            : value != null
              ? String(value)
              : "",
        placeholder: "",
        required: true,
        fieldType: "text",
        options: [],
      };
    });
  };

  const buildPayrollDefaults = (fields: PayrollFieldDefinition[]) =>
    fields.reduce((acc: Record<string, string>, field) => {
      const fallback = field.options[0] ?? "";
      acc[field.id] = field.defaultValue ?? fallback;
      return acc;
    }, {} as Record<string, string>);

  const [equipmentChecklist, setEquipmentChecklist] = useState(() => parseChecklist(metadata.items));
  const [systemAccess, setSystemAccess] = useState(() => parseChecklist(metadata.systems));
  const [trainingModules, setTrainingModules] = useState(() => parseChecklist(metadata.modules ?? metadata.courses));
  const [complianceCourses, setComplianceCourses] = useState(() => parseChecklist(metadata.courses));
  const [managerCheckins, setManagerCheckins] = useState(() => parseTimeline(metadata.timeline));
  const [buddyNotes, setBuddyNotes] = useState(() => String(metadata.notes ?? ""));
  const initialPayrollFields = parsePayrollFields(metadata);
  const [payrollFields, setPayrollFields] = useState<PayrollFieldDefinition[]>(initialPayrollFields);
  const [payrollValues, setPayrollValues] = useState<Record<string, string>>(() =>
    buildPayrollDefaults(initialPayrollFields),
  );
  const [benefitLinks, setBenefitLinks] = useState(() => parseChecklist(metadata.links));
  const [probationGoals, setProbationGoals] = useState(() => parseGoals(metadata.milestones));
  const [journeyAutomation, setJourneyAutomation] = useState(() => ({
    journeyTemplateId: metadata.journeyTemplateId ? String(metadata.journeyTemplateId) : "",
    trigger: ["on_start", "on_completion", "manual"].includes(metadata.trigger)
      ? metadata.trigger
      : "on_start",
    notes: typeof metadata.notes === "string" ? metadata.notes : "",
  }));

  useEffect(() => {
    setEquipmentChecklist(parseChecklist(metadata.items));
    setSystemAccess(parseChecklist(metadata.systems));
    setTrainingModules(parseChecklist(metadata.modules ?? metadata.courses));
    setComplianceCourses(parseChecklist(metadata.courses));
    setManagerCheckins(parseTimeline(metadata.timeline));
    setBuddyNotes(() => String(metadata.notes ?? ""));
    const payrollDefs = parsePayrollFields(metadata);
    setPayrollFields(payrollDefs);
    setPayrollValues(buildPayrollDefaults(payrollDefs));
    setBenefitLinks(parseChecklist(metadata.links));
    setProbationGoals(parseGoals(metadata.milestones));
    setJourneyAutomation({
      journeyTemplateId: metadata.journeyTemplateId ? String(metadata.journeyTemplateId) : "",
      trigger: ["on_start", "on_completion", "manual"].includes(metadata.trigger)
        ? metadata.trigger
        : "on_start",
      notes: typeof metadata.notes === "string" ? metadata.notes : "",
    });
  }, [metadata, step.id]);

  useEffect(() => {
    if (!formType && step.formId) {
      fetch(`/api/forms/${step.formId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.formType) setFormType(data.formType);
        })
        .catch(() => {});
    }
  }, [formType, step.formId]);

  const title = step.title || step.label || "Untitled Step";
  const desc = step.description || step.instruction || "";

  // ✅ Acknowledge Document
  if (stepType === "acknowledge-document") {
    const acknowledgeCheckboxId = `acknowledge-${step.id}`;
    const acknowledgementText =
      typeof metadata.acknowledgementText === "string" && metadata.acknowledgementText.trim().length
        ? metadata.acknowledgementText.trim()
        : "I have read and acknowledge this document";
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {step.document && (
          <div className="mb-4 border rounded">
            <iframe
              src={step.document.url}
              className="w-full h-96 border-none"
              title={step.document.name}
            />
          </div>
        )}
        {step.document?.url && (
          <div className="mb-4">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="gap-2"
              aria-label={`Download ${step.document?.name ?? "document"}`}
            >
              <a
                href={step.document.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download</span>
              </a>
            </Button>
          </div>
        )}
        <Label
          htmlFor={acknowledgeCheckboxId}
          className="flex items-center gap-2"
        >
          <Checkbox
            id={acknowledgeCheckboxId}
            checked={ack}
            disabled={readOnly || loading}
            aria-readonly={readOnly}
            onCheckedChange={(checked) => setAck(checked === true)}
          />
          {acknowledgementText}
        </Label>
        {!readOnly && (
          <Button
            disabled={!ack || loading || isCompleting}
            onClick={async () => {
              if (!ack || loading || isCompleting) return;
              try {
                setLoading(true);
                if (step.document?.id) {
                  const res = await fetch("/api/documents/acknowledge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: step.document.id }),
                  });
                  if (!res.ok) throw new Error("Failed to acknowledge");
                  window.dispatchEvent(
                    new CustomEvent("employee-documents-updated", {
                      detail: { employeeId },
                    }),
                  );
                }
                await onComplete();
              } catch (err) {
                console.error(err);
                toast("Failed to acknowledge document");
              } finally {
                setLoading(false);
              }
            }}
          >
            Mark Complete
          </Button>
        )}
      </Card>
    );
  }

  // ✅ Upload Document
  if (stepType === "upload-document") {
    const uploadInputId = `document-upload-${step.id}`;
    const acceptedTypes = Array.isArray(metadata.allowedFileTypes) && metadata.allowedFileTypes.length
      ? metadata.allowedFileTypes.join(",")
      : ".pdf,.jpg,.png";
    const helperText =
      typeof metadata.instructions === "string" && metadata.instructions.trim().length
        ? metadata.instructions.trim()
        : "Upload a PDF, JPG, or PNG copy of the document.";
    const uploadCategory =
      typeof metadata.category === "string" && metadata.category.trim().length
        ? metadata.category.trim()
        : step.category || "Onboarding";
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {step.document?.url ? (
          <a
            href={step.document.url}
            target="_blank"
            className="text-blue-600 underline"
          >
            View Uploaded Document
          </a>
        ) : (
          <>
            <div className="mb-4 space-y-2">
              <Label
                htmlFor={uploadInputId}
                className="text-sm font-medium text-foreground"
              >
                Upload document
              </Label>
              <Input
                id={uploadInputId}
                type="file"
                accept={acceptedTypes}
                disabled={readOnly || loading}
                readOnly={readOnly}
                aria-readonly={readOnly}
                className="cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                {helperText}
              </p>
            </div>
            {!readOnly && (
              <Button
                disabled={!file || loading || isCompleting}
                onClick={async () => {
                  if (!file || !session?.user || isCompleting) return;
                  setLoading(true);

                  // ✅ Build FormData for upload-employee API
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("name", file.name);
                  formData.append("category", uploadCategory);
                  formData.append("employeeId", employeeId || "");
                  formData.append("canViewAdmin", "true");
                  formData.append("canViewManager", "false");
                  formData.append("canViewEmployee", "true");
                  formData.append("requiresAck", "false");

                  try {
                    const res = await fetch("/api/documents/upload-employee", {
                      method: "POST",
                      body: formData,
                    });
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}));
                      toast.error(payload?.error || "Failed to upload document");
                      setLoading(false);
                      return;
                    }

                    toast.success("Document uploaded");
                    // ✅ Auto-refresh onboarding UI and employee docs
                    await onComplete();
                    window.dispatchEvent(
                      new CustomEvent("employee-documents-updated", {
                        detail: { employeeId },
                      }),
                    );
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to upload document");
                    setLoading(false);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Upload & Complete
              </Button>
            )}
          </>
        )}
      </Card>
    );
  }

  if (stepType === "collect-document") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">
          {desc || metadata.instructions || "Please confirm the employee has provided the required document."}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ collected: true });
              } finally {
                setLoading(false);
              }
            }}
          >
            Mark Collected
          </Button>
        )}
      </Card>
    );
  }

  // ✅ Fill Form
  if (stepType === "fill-form") {
    const guidanceText =
      typeof metadata.guidance === "string" && metadata.guidance.trim().length
        ? metadata.guidance.trim()
        : "";
    if (step.formId) {
      // Editor preview without employee context: show a neutral placeholder, not an error
      if (!employeeId) {
        return (
          <Card className="p-4">
            <div className="mb-2 font-semibold">{title}</div>
            <div className="mb-3 text-sm">{desc}</div>
            {guidanceText && (
              <div className="mb-3 text-xs text-muted-foreground">{guidanceText}</div>
            )}
            <div className="text-sm text-gray-500">Selected form will be displayed here during onboarding.</div>
          </Card>
        );
      }
      if (!formType) {
        return (
          <Card className="p-4">
            <div className="mb-2 font-semibold">{title}</div>
            <div className="mb-3 text-sm">{desc}</div>
            {guidanceText && (
              <div className="mb-3 text-xs text-muted-foreground">{guidanceText}</div>
            )}
            <div className="flex justify-center py-6">
              <GlassSpinner showText text="Loading form…" />
            </div>
          </Card>
        );
      }

      const handleComplete = (data: any) => {
        setLoading(true);
        onComplete({ formResponse: data });
        window.dispatchEvent(
          new CustomEvent("employee-documents-updated", {
            detail: { employeeId },
          }),
        );
      };

      return (
        <Card className="p-4">
          <div className="mb-2 font-semibold">{title}</div>
          <div className="mb-3 text-sm">{desc}</div>
          {formType === "DATA_SCREEN" ? (
            <EnhancedFormRenderer
              formId={step.formId}
              employeeId={employeeId || ""}
              onDataChange={handleComplete}
            />
          ) : (
            <DynamicFormRenderer
              formId={step.formId}
              employeeId={employeeId}
              onSubmitSuccess={handleComplete}
            />
          )}
        </Card>
      );
    }

    // Fallback for inline fields
    if (Array.isArray(step.formFields)) {
      return (
        <Card className="p-4">
          <div className="mb-2 font-semibold">{title}</div>
          <div className="mb-3 text-sm">{desc}</div>
          {guidanceText && (
            <div className="mb-3 text-xs text-muted-foreground">{guidanceText}</div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              onComplete({ formResponse: formValues });
            }}
          >
            {(step.formFields || []).map((f, idx) => (
              <div key={idx} className="mb-2">
                <label>{f.label}</label>
                <Input
                  type={f.type === "date" ? "date" : "text"}
                  value={formValues[f.label] || ""}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [f.label]: e.target.value })
                  }
                  disabled={readOnly}
                />
              </div>
            ))}
            {!readOnly && (
              <Button type="submit" disabled={loading || isCompleting}>
                Submit & Complete
              </Button>
            )}
          </form>
        </Card>
      );
    }
  }

  // ✅ Instructions
  if (stepType === "instructions") {
    const buttonLabel =
      typeof metadata.buttonLabel === "string" && metadata.buttonLabel.trim().length
        ? metadata.buttonLabel.trim()
        : "Next";
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {!readOnly && (
          <Button onClick={() => onComplete()} disabled={loading || isCompleting}>
            {buttonLabel}
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "training-assignment") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || "Review the required training modules."}</div>
        <div className="space-y-2">
          {trainingModules.map((module) => (
            <label key={module.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={module.completed}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setTrainingModules((prev) =>
                    prev.map((item) =>
                      item.id === module.id ? { ...item, completed: checked === true } : item,
                    ),
                  )
                }
              />
              <span className="flex flex-col">
                <span>{module.label}</span>
                {module.url && (
                  <a
                    href={module.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    View resource
                  </a>
                )}
              </span>
            </label>
          ))}
          {!trainingModules.length && (
            <div className="text-sm text-muted-foreground">No training linked yet.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ trainingModules });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Progress
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "equipment-checklist") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || "Confirm equipment issued."}</div>
        <div className="space-y-2">
          {equipmentChecklist.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.completed}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setEquipmentChecklist((prev) =>
                    prev.map((entry) =>
                      entry.id === item.id ? { ...entry, completed: checked === true } : entry,
                    ),
                  )
                }
              />
              <span className="flex flex-col">
                <span>{item.label}</span>
                {item.notes && (
                  <span className="text-xs text-muted-foreground">{item.notes}</span>
                )}
              </span>
            </label>
          ))}
          {!equipmentChecklist.length && (
            <div className="text-sm text-muted-foreground">No checklist items configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ equipmentChecklist });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Checklist
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "system-access") {
    const systemInstructions =
      typeof metadata.instructions === "string" && metadata.instructions.trim().length
        ? metadata.instructions.trim()
        : "Track access provisioning.";
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || systemInstructions}</div>
        <div className="space-y-2">
          {systemAccess.map((system) => (
            <label key={system.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={system.completed}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setSystemAccess((prev) =>
                    prev.map((entry) =>
                      entry.id === system.id ? { ...entry, completed: checked === true } : entry,
                    ),
                  )
                }
              />
              <span className="flex flex-col">
                <span>{system.label}</span>
                {system.url && (
                  <a
                    href={system.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Access link
                  </a>
                )}
                {system.notes && (
                  <span className="text-xs text-muted-foreground">{system.notes}</span>
                )}
              </span>
            </label>
          ))}
          {!systemAccess.length && (
            <div className="text-sm text-muted-foreground">No systems listed.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ systemAccess });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Access
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "manager-checkin") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || metadata.template || "Schedule regular manager check-ins."}</div>
        <div className="space-y-3">
          {managerCheckins.map((checkin, index) => (
            <div key={checkin.id} className="space-y-1">
              <Label>{checkin.label}</Label>
              <Input
                type="date"
                value={checkin.scheduledAt}
                disabled={readOnly}
                onChange={(e) =>
                  setManagerCheckins((prev) =>
                    prev.map((entry, idx) =>
                      idx === index ? { ...entry, scheduledAt: e.target.value } : entry,
                    ),
                  )
                }
              />
            </div>
          ))}
          {!managerCheckins.length && (
            <div className="text-sm text-muted-foreground">No checkpoints configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ managerCheckins });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Schedule
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "buddy-introduction") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || "Share notes from the buddy introduction."}</div>
        <Textarea
          value={buddyNotes}
          rows={4}
          disabled={readOnly}
          onChange={(e) => setBuddyNotes(e.target.value)}
        />
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ buddyNotes });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Notes
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "compliance-training") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || "Track compliance coursework completion."}</div>
        <div className="space-y-2">
          {complianceCourses.map((course) => (
            <label key={course.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={course.completed}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setComplianceCourses((prev) =>
                    prev.map((entry) =>
                      entry.id === course.id ? { ...entry, completed: checked === true } : entry,
                    ),
                  )
                }
              />
              <span className="flex flex-col">
                <span>{course.label}</span>
                {course.url && (
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    View course
                  </a>
                )}
              </span>
            </label>
          ))}
          {!complianceCourses.length && (
            <div className="text-sm text-muted-foreground">No courses configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ complianceCourses });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Compliance Log
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "payroll-setup") {
    const payrollInstructions =
      typeof metadata.instructions === "string" && metadata.instructions.trim().length
        ? metadata.instructions.trim()
        : "Collect payroll details.";
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">
          {title || "Payroll Setup"}
        </div>
        <div className="text-sm text-muted-foreground">{desc || payrollInstructions}</div>
        <div className="grid gap-3">
          {payrollFields.map((field) => {
            const value = payrollValues[field.id] ?? "";
            const setValue = (next: string) =>
              setPayrollValues((prev) => ({
                ...prev,
                [field.id]: next,
              }));

            return (
              <div key={field.id} className="space-y-1">
                <Label>{field.label}</Label>
                {field.fieldType === "select" ||
                field.fieldType === "kiwiSaverStatus" ||
                field.fieldType === "kiwiSaverEmployeeRate" ? (
                  <select
                    className="w-full rounded-md border p-2 text-sm"
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => setValue(e.target.value)}
                  >
                    <option value="">Select an option</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {formatPayrollOptionLabel(option, field.fieldType)}
                      </option>
                    ))}
                  </select>
                ) : field.fieldType === "kiwiSaverEmployerRate" ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={field.placeholder}
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => setValue(e.target.value)}
                  />
                ) : field.fieldType === "number" ? (
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => setValue(e.target.value)}
                  />
                ) : field.fieldType === "irdNumber" ? (
                  <Input
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => setValue(e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => setValue(e.target.value)}
                  />
                )}
                {field.fieldType === "irdNumber" && (
                  <p className="text-xs text-muted-foreground">
                    NZ IRD numbers must be 8–9 digits. We'll validate the format automatically.
                  </p>
                )}
                {field.fieldType === "kiwiSaverEmployeeRate" && (
                  <p className="text-xs text-muted-foreground">
                    Supported employee rates: {DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS.map((rate) =>
                      `${Number(rate) * 100}%`,
                    ).join(", ")}.
                  </p>
                )}
                {field.fieldType === "kiwiSaverEmployerRate" && (
                  <p className="text-xs text-muted-foreground">
                    Employer contributions must be at least 3% when the employee is enrolled in KiwiSaver.
                  </p>
                )}
                {field.fieldType === "kiwiSaverStatus" && (
                  <p className="text-xs text-muted-foreground">
                    Track whether the employee is enrolled, opted out, or on a contributions holiday.
                  </p>
                )}
              </div>
            );
          })}
          {!payrollFields.length && (
            <div className="text-sm text-muted-foreground">Payroll fields not configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              const validationErrors: string[] = [];
              const sanitizedValues: Record<string, string> = { ...payrollValues };
              const kiwiStatusField = payrollFields.find((f) => f.fieldType === "kiwiSaverStatus");
              const kiwiStatusValue = kiwiStatusField
                ? (sanitizedValues[kiwiStatusField.id] ?? "")
                : "";
              const kiwiEnrolled = kiwiStatusValue === "enrolled";

              for (const field of payrollFields) {
                const rawValue = sanitizedValues[field.id] ?? "";
                const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
                if (field.required && !trimmed) {
                  validationErrors.push(`${field.label}: required field`);
                  continue;
                }

                if (field.fieldType === "irdNumber" && trimmed) {
                  const result = validateIRDNumber(trimmed);
                  if (!result.isValid) {
                    validationErrors.push(`${field.label}: ${result.error ?? "invalid IRD number"}`);
                  } else if (result.formatted) {
                    sanitizedValues[field.id] = result.formatted;
                  }
                }

                if ((field.fieldType === "select" || field.fieldType === "kiwiSaverStatus" || field.fieldType === "kiwiSaverEmployeeRate") && trimmed) {
                  if (!field.options.includes(trimmed)) {
                    validationErrors.push(`${field.label}: select a valid option`);
                  }
                }

                if (field.fieldType === "kiwiSaverEmployeeRate") {
                  if (!trimmed) {
                    if (kiwiEnrolled) {
                      validationErrors.push(`${field.label}: select a KiwiSaver rate`);
                    } else {
                      sanitizedValues[field.id] = "";
                    }
                    continue;
                  }

                  const rate = parseKiwiSaverRate(trimmed);
                  if (kiwiEnrolled) {
                    if (rate === null) {
                      validationErrors.push(`${field.label}: select a KiwiSaver rate`);
                    } else {
                      const normalized = rate.toFixed(2) as (typeof DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS)[number];
                      if (!DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS.includes(normalized)) {
                        validationErrors.push(
                          `${field.label}: rate must be one of ${DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS.map((v) => `${Number(v) * 100}%`).join(", ")}`,
                        );
                      } else {
                        sanitizedValues[field.id] = normalized;
                      }
                    }
                  } else if (rate !== null && rate > 0) {
                    validationErrors.push(`${field.label}: should be blank when not enrolled`);
                  } else if (rate === 0) {
                    sanitizedValues[field.id] = rate.toFixed(2);
                  } else {
                    sanitizedValues[field.id] = "";
                  }
                }

                if (field.fieldType === "kiwiSaverEmployerRate") {
                  if (!trimmed) {
                    if (kiwiEnrolled) {
                      validationErrors.push(`${field.label}: enter the employer contribution rate`);
                    } else {
                      sanitizedValues[field.id] = "";
                    }
                    continue;
                  }

                  const rate = parseKiwiSaverRate(trimmed);
                  if (kiwiEnrolled) {
                    if (rate === null) {
                      validationErrors.push(`${field.label}: enter the employer contribution rate`);
                    } else if (rate < 0.03) {
                      validationErrors.push(`${field.label}: employer rate must be at least 3%`);
                    } else {
                      sanitizedValues[field.id] = rate.toFixed(2);
                    }
                  } else if (rate !== null && rate > 0) {
                    validationErrors.push(`${field.label}: should be 0 when employee is not enrolled`);
                  } else {
                    sanitizedValues[field.id] = rate !== null ? rate.toFixed(2) : "";
                  }
                }
              }

              if (validationErrors.length) {
                toast.error(
                  `Unable to save payroll details: ${validationErrors.join("; ")}`,
                );
                return;
              }

              try {
                setLoading(true);
                setPayrollValues(sanitizedValues);
                await onComplete({ payrollValues: sanitizedValues });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Payroll Details
          </Button>
        )}
      </Card>
    );
  }
  if (stepType === "benefits-enrollment") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Benefits Enrollment"}</div>
        <div className="text-sm text-muted-foreground">{desc || "Track benefits enrollment links and status."}</div>
        <div className="space-y-3">
          {benefitLinks.map((link) => (
            <div key={link.id} className="flex items-center gap-2">
              <Checkbox
                checked={link.completed}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setBenefitLinks((prev) =>
                    prev.map((entry) =>
                      entry.id === link.id ? { ...entry, completed: checked === true } : entry,
                    ),
                  )
                }
              />
              <span className="text-sm">
                <span className="block">{link.label}</span>
                {link.url && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Open link
                  </a>
                )}
              </span>
            </div>
          ))}
          {!benefitLinks.length && (
            <div className="text-sm text-muted-foreground">Benefit enrollment links not configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ benefitLinks });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Enrollment Status
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "probation-goals") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Probation Goals"}</div>
        <div className="text-sm text-muted-foreground">{desc || "Manage probation goals and progress."}</div>
        <div className="space-y-3">
          {probationGoals.map((goal, index) => (
            <div key={goal.id} className="space-y-1">
              <Label>
                {goal.title}
                {!goal.required && (
                  <span className="ml-2 text-xs text-muted-foreground">(Optional)</span>
                )}
              </Label>
              <Textarea
                value={goal.notes}
                rows={3}
                disabled={readOnly}
                onChange={(e) =>
                  setProbationGoals((prev) =>
                    prev.map((entry, idx) =>
                      idx === index ? { ...entry, notes: e.target.value } : entry,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={goal.completed}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    setProbationGoals((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, completed: checked === true } : entry,
                      ),
                    )
                  }
                />
                Mark complete
              </label>
            </div>
          ))}
          {!probationGoals.length && (
            <div className="text-sm text-muted-foreground">No probation goals configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ probationGoals });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Goals
          </Button>
        )}
      </Card>
    );
  }

  if (stepType === "welcome-survey") {
    const surveyInstructions =
      typeof metadata.instructions === "string" && metadata.instructions.trim().length
        ? metadata.instructions.trim()
        : "Gather feedback from the new hire.";
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Welcome Survey"}</div>
        <div className="text-sm text-muted-foreground">{desc || surveyInstructions}</div>
        {step.formId ? (
          <DynamicFormRenderer
            formId={step.formId}
            employeeId={employeeId}
            onSubmitSuccess={async (data) => {
              setLoading(true);
              await onComplete({ surveyResponse: data, questionSet: metadata.questionSet });
            }}
          />
        ) : (
          <div className="text-sm text-muted-foreground">No survey form linked.</div>
        )}
      </Card>
    );
  }

  if (stepType === "journey-automation") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Journey Automation"}</div>
        <div className="text-sm text-muted-foreground">
          {desc || "Trigger a follow-on employee experience journey."}
        </div>
        <div className="space-y-2">
          <Label>Journey template</Label>
          <Input
            value={journeyAutomation.journeyTemplateId}
            disabled={readOnly}
            onChange={(e) =>
              setJourneyAutomation((prev) => ({
                ...prev,
                journeyTemplateId: e.target.value,
              }))
            }
          />
          <Label>Trigger</Label>
          <select
            className="border rounded-md p-2"
            value={journeyAutomation.trigger}
            disabled={readOnly}
            onChange={(e) =>
              setJourneyAutomation((prev) => ({
                ...prev,
                trigger: e.target.value,
              }))
            }
          >
            <option value="on_start">On start</option>
            <option value="on_completion">On completion</option>
            <option value="manual">Manual</option>
          </select>
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={journeyAutomation.notes}
            disabled={readOnly}
            onChange={(e) =>
              setJourneyAutomation((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ journeyAutomation });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Automation
          </Button>
        )}
      </Card>
    );
  }

  // 🚨 Fallback
  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-semibold text-destructive">
        Unknown step type: {stepType}
      </div>
      <p className="text-xs text-muted-foreground">
        This step type isn&apos;t supported yet. Please contact your administrator for assistance.
      </p>
    </Card>
  );
}
