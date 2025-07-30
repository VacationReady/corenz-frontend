import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export default function OnboardingStepRenderer({ step, onComplete }: { step: any, onComplete: (data?: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});

  // Document Acknowledge
  if (step.type === "acknowledge-document") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{step.title || "Acknowledge Document"}</div>
        <div className="mb-3 text-sm">{step.description}</div>
        {/* TODO: Embed document viewer if required, or link to doc */}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
          I have read and acknowledge this document
        </label>
        <Button disabled={!ack || loading} onClick={() => { setLoading(true); onComplete(); }}>
          Mark Complete
        </Button>
      </Card>
    );
  }

  // Upload Document
  if (step.type === "upload-document") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{step.title || "Upload Document"}</div>
        <div className="mb-3 text-sm">{step.description}</div>
        <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={!file || loading} onClick={() => { setLoading(true); onComplete({ file }); }}>
          Upload & Complete
        </Button>
      </Card>
    );
  }

  // Fill Form
  if (step.type === "fill-form" && step.formFields) {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{step.title || "Complete Form"}</div>
        <div className="mb-3 text-sm">{step.description}</div>
        <form onSubmit={e => { e.preventDefault(); setLoading(true); onComplete(formValues); }}>
          {step.formFields.map((f: any, idx: number) => (
            <div key={idx} className="mb-2">
              <label>{f.label}</label>
              <Input
                type={f.type === "date" ? "date" : "text"}
                value={formValues[f.label] || ""}
                onChange={e => setFormValues({ ...formValues, [f.label]: e.target.value })}
              />
            </div>
          ))}
          <Button type="submit" disabled={loading}>Submit & Complete</Button>
        </form>
      </Card>
    );
  }

  // Instructions/Welcome
  if (step.type === "instructions") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{step.title || "Instructions"}</div>
        <div className="mb-3 text-sm">{step.description}</div>
        <Button onClick={() => onComplete()} disabled={loading}>Next</Button>
      </Card>
    );
  }

  // Fallback
  return (
    <Card className="p-4">
      Unknown step type.
    </Card>
  );
}
