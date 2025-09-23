import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
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
    form?: { formType: "SUBMISSION" | "DATA_SCREEN" };
    document?: { id: string; name: string; url: string };
    category?: string;
  };
  onComplete: (data?: any) => void;
  readOnly?: boolean;
  employeeId?: string;
  companyId?: string;
};

export default function OnboardingStepRenderer({
  step,
  onComplete,
  readOnly = false,
  employeeId,
  _companyId,
}: OnboardingStepProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});
  const [formType, setFormType] = useState<"SUBMISSION" | "DATA_SCREEN" | null>(
    step.form?.formType || null,
  );

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
            disabled={!ack || loading}
            onClick={async () => {
              if (!ack || loading) return;
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
                disabled={!file || loading}
                onClick={async () => {
                  if (!file || !session?.user) return;
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
                      toast("Failed to upload document");
                      setLoading(false);
                      return;
                    }

                    toast("Document uploaded");
                    // ✅ Auto-refresh onboarding UI and employee docs
                    await onComplete();
                    window.dispatchEvent(
                      new CustomEvent("employee-documents-updated", {
                        detail: { employeeId },
                      }),
                    );
                  } catch (err) {
                    console.error(err);
                    toast("Failed to upload document");
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

  // ✅ Fill Form
  if (step.type === "fill-form" || step.type === "form_fill") {
    if (step.formId) {
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
    if (step.formFields) {
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
            {step.formFields.map((f, idx) => (
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
              <Button type="submit" disabled={loading}>
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
          <Button onClick={() => onComplete()} disabled={loading}>
            Next
          </Button>
        )}
      </Card>
    );
  }

  // 🚨 Fallback
  return (
    <Card className="p-4">
      <div className="text-sm text-destructive">
        Unknown step type: {step.type}
      </div>
    </Card>
  );
}
