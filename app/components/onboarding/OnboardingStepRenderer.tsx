"use client";

import { useEffect, useState } from "react";
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
  const metadata = (step as any).metadata ?? {};

  const parseChecklist = (items: any) =>
    Array.isArray(items)
      ? items.map((item: any) => ({
          id:
            typeof item.id === "string"
              ? item.id
              : typeof item.label === "string"
                ? item.label
                : Math.random().toString(36).slice(2),
          label: String(item.label ?? item.name ?? "Item"),
          completed: Boolean(item.completed ?? item.granted ?? false),
          notes: item.notes ? String(item.notes) : undefined,
          url: item.url ? String(item.url) : undefined,
          required: Boolean(item.required ?? false),
        }))
      : [];

  const parseTimeline = (timeline: any) =>
    Array.isArray(timeline)
      ? timeline.map((entry: any) => ({
          id:
            typeof entry.id === "string"
              ? entry.id
              : typeof entry.label === "string"
                ? entry.label
                : Math.random().toString(36).slice(2),
          label: String(entry.label ?? "Check-in"),
          scheduledAt: entry.scheduledAt ?? "",
        }))
      : [];

  const parseGoals = (goals: any) =>
    Array.isArray(goals)
      ? goals.map((goal: any) => ({
          id:
            typeof goal.id === "string"
              ? goal.id
              : typeof goal.title === "string"
                ? goal.title
                : Math.random().toString(36).slice(2),
          title: String(goal.title ?? "Goal"),
          completed: Boolean(goal.completed),
          notes: goal.notes ? String(goal.notes) : "",
        }))
      : [];

  const payrollFieldDefaults = () => {
    const fields: string[] = Array.isArray(metadata.requiredFields)
      ? metadata.requiredFields.filter((field: unknown): field is string => typeof field === "string")
      : [];

    return fields.reduce((acc: Record<string, string>, field) => {
      acc[field] = metadata.defaults?.[field] ? String(metadata.defaults[field]) : "";
      return acc;
    }, {});
  };

  const [equipmentChecklist, setEquipmentChecklist] = useState(() => parseChecklist(metadata.items));
  const [systemAccess, setSystemAccess] = useState(() => parseChecklist(metadata.systems));
  const [trainingModules, setTrainingModules] = useState(() => parseChecklist(metadata.modules ?? metadata.courses));
  const [complianceCourses, setComplianceCourses] = useState(() => parseChecklist(metadata.courses));
  const [managerCheckins, setManagerCheckins] = useState(() => parseTimeline(metadata.timeline));
  const [buddyNotes, setBuddyNotes] = useState(() => String(metadata.notes ?? ""));
  const [payrollValues, setPayrollValues] = useState<Record<string, string>>(payrollFieldDefaults);
  const [benefitLinks, setBenefitLinks] = useState(() => parseChecklist(metadata.links));
  const [probationGoals, setProbationGoals] = useState(() => parseGoals(metadata.milestones));
  const [journeyAutomation, setJourneyAutomation] = useState(() => ({
    journeyTemplateId: metadata.journeyTemplateId ?? "",
    trigger: metadata.trigger ?? "on_start",
    notes: metadata.notes ?? "",
  }));

  useEffect(() => {
    setEquipmentChecklist(parseChecklist(metadata.items));
    setSystemAccess(parseChecklist(metadata.systems));
    setTrainingModules(parseChecklist(metadata.modules ?? metadata.courses));
    setComplianceCourses(parseChecklist(metadata.courses));
    setManagerCheckins(parseTimeline(metadata.timeline));
    setBuddyNotes(() => String(metadata.notes ?? ""));
    setPayrollValues(payrollFieldDefaults);
    setBenefitLinks(parseChecklist(metadata.links));
    setProbationGoals(parseGoals(metadata.milestones));
    setJourneyAutomation({
      journeyTemplateId: metadata.journeyTemplateId ?? "",
      trigger: metadata.trigger ?? "on_start",
      notes: metadata.notes ?? "",
    });
  }, [step.id]);

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
  if (step.type === "acknowledge-document") {
    const acknowledgeCheckboxId = `acknowledge-${step.id}`;
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
          I have read and acknowledge this document
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
  if (step.type === "upload-document") {
    const uploadInputId = `document-upload-${step.id}`;
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
                accept=".pdf,.jpg,.png"
                disabled={readOnly || loading}
                readOnly={readOnly}
                aria-readonly={readOnly}
                className="cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, JPG, PNG.
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
                  formData.append("category", step.category || "Onboarding");
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

  if (step.type === "collect-document") {
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
  if (step.type === "fill-form" || step.type === "form_fill") {
    if (step.formId) {
      // Editor preview without employee context: show a neutral placeholder, not an error
      if (!employeeId) {
        return (
          <Card className="p-4">
            <div className="mb-2 font-semibold">{title}</div>
            <div className="mb-3 text-sm">{desc}</div>
            <div className="text-sm text-gray-500">Selected form will be displayed here during onboarding.</div>
          </Card>
        );
      }
      if (!formType) {
        return (
          <Card className="p-4">
            <div className="mb-2 font-semibold">{title}</div>
            <div className="mb-3 text-sm">{desc}</div>
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
  if (step.type === "instructions") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {!readOnly && (
          <Button onClick={() => onComplete()} disabled={loading || isCompleting}>
            Next
          </Button>
        )}
      </Card>
    );
  }

  if (step.type === "training-assignment") {
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
              {module.label}
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

  if (step.type === "equipment-checklist") {
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
              {item.label}
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

  if (step.type === "system-access") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc || "Track access provisioning."}</div>
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
              {system.label}
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

  if (step.type === "manager-checkin") {
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

  if (step.type === "buddy-introduction") {
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

  if (step.type === "compliance-training") {
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
              {course.label}
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

  if (step.type === "payroll-setup") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">
          {title || "Payroll Setup"}
        </div>
        <div className="text-sm text-muted-foreground">{desc || "Collect payroll details."}</div>
        <div className="grid gap-3">
          {Object.keys(payrollValues).map((field) => (
            <div key={field} className="space-y-1">
              <Label className="capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
              <Input
                value={payrollValues[field]}
                disabled={readOnly}
                onChange={(e) =>
                  setPayrollValues((prev) => ({
                    ...prev,
                    [field]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
          {!Object.keys(payrollValues).length && (
            <div className="text-sm text-muted-foreground">Payroll fields not configured.</div>
          )}
        </div>
        {!readOnly && (
          <Button
            disabled={loading || isCompleting}
            onClick={async () => {
              if (loading || isCompleting) return;
              try {
                setLoading(true);
                await onComplete({ payrollValues });
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

  if (step.type === "benefits-enrollment") {
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
              <span className="text-sm">{link.label}</span>
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

  if (step.type === "probation-goals") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Probation Goals"}</div>
        <div className="text-sm text-muted-foreground">{desc || "Manage probation goals and progress."}</div>
        <div className="space-y-3">
          {probationGoals.map((goal, index) => (
            <div key={goal.id} className="space-y-1">
              <Label>{goal.title}</Label>
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

  if (step.type === "welcome-survey") {
    return (
      <Card className="p-4 space-y-4">
        <div className="text-lg font-semibold">{title || "Welcome Survey"}</div>
        <div className="text-sm text-muted-foreground">{desc || "Gather feedback from the new hire."}</div>
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

  if (step.type === "journey-automation") {
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
        Unknown step type: {step.type}
      </div>
      <p className="text-xs text-muted-foreground">
        This step type isn&apos;t supported yet. Please contact your administrator for assistance.
      </p>
    </Card>
  );
}
