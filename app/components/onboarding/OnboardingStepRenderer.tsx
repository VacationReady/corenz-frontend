import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";

type OnboardingStepProps = {
  step: {
    id: string;
    type: string;            // e.g. 'acknowledge-document', 'upload-document', etc.
    label?: string;
    title?: string;
    description?: string;
    instruction?: string;
    formFields?: { label: string; type: string }[];
    document?: {             // ✅ ADD THIS
      id: string;
      name: string;
      url: string;
    };
  };
  onComplete: (data?: any) => void;
  readOnly?: boolean;
};

export default function OnboardingStepRenderer({ step, onComplete, readOnly = false }: OnboardingStepProps) {
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});

  // Normalize step fields from DB -> UI
  const title = step.title || step.label || "Untitled Step";
  const desc = step.description || step.instruction || "";

  // ✅ Document Acknowledge
if (step.type === "acknowledge-document") {
  return (
    <Card className="p-4">
      <div className="mb-2 font-semibold">{title}</div>
      <div className="mb-3 text-sm">{desc}</div>

      {/* ✅ Document link (if attached) */}
      {step.document && (
  <div className="mb-4 border rounded">
    <iframe
      src={step.document.url}
      className="w-full h-96 border-none"
      title={step.document.name}
    />
  </div>
)}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={ack}
          disabled={readOnly}
          onChange={e => setAck(e.target.checked)}
        />
        I have read and acknowledge this document
      </label>

      {!readOnly && (
        <Button
          disabled={!ack || loading}
          onClick={() => {
            setLoading(true);
            onComplete();
          }}
        >
          Mark Complete
        </Button>
      )}
    </Card>
  );
}

  // ✅ Fill Form
  if (step.type === "fill-form" && step.formFields) {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        <form
          onSubmit={e => {
            e.preventDefault();
            setLoading(true);
            onComplete(formValues);
          }}
        >
          {step.formFields.map((f, idx) => (
            <div key={idx} className="mb-2">
              <label>{f.label}</label>
              <Input
                type={f.type === "date" ? "date" : "text"}
                value={formValues[f.label] || ""}
                onChange={e => setFormValues({ ...formValues, [f.label]: e.target.value })}
                disabled={readOnly}
              />
            </div>
          ))}
          {!readOnly && <Button type="submit" disabled={loading}>Submit & Complete</Button>}
        </form>
      </Card>
    );
  }

  // ✅ Instructions
  if (step.type === "instructions") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {!readOnly && <Button onClick={() => onComplete()} disabled={loading}>Next</Button>}
      </Card>
    );
  }

  // 🚨 Fallback for unknown step types
  return (
    <Card className="p-4">
      <div className="text-sm text-destructive">Unknown step type: {step.type}</div>
    </Card>
  );
}
