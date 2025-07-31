import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";

type OnboardingStepProps = {
  step: {
    id: string;
    type: string;
    label?: string;
    title?: string;
    description?: string;
    instruction?: string;
    formFields?: { label: string; type: string }[];
    document?: { id: string; name: string; url: string };
    category?: string;
  };
  onComplete: (data?: any) => void;
  readOnly?: boolean;
  employeeId?: string;
  companyId?: string;
};

export default function OnboardingStepRenderer({ step, onComplete, readOnly = false, employeeId, companyId }: OnboardingStepProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});

  const title = step.title || step.label || "Untitled Step";
  const desc = step.description || step.instruction || "";

  // ✅ Document Acknowledge
  if (step.type === "acknowledge-document") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {step.document && (
          <div className="mb-4 border rounded">
            <iframe src={step.document.url} className="w-full h-96 border-none" title={step.document.name} />
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ack} disabled={readOnly} onChange={e => setAck(e.target.checked)} />
          I have read and acknowledge this document
        </label>
        {!readOnly && (
          <Button disabled={!ack || loading} onClick={() => { setLoading(true); onComplete(); }}>
            Mark Complete
          </Button>
        )}
      </Card>
    );
  }

  // ✅ Upload Document
  if (step.type === "upload-document") {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        {step.document?.url ? (
          <a href={step.document.url} target="_blank" className="text-blue-600 underline">View Uploaded Document</a>
        ) : (
          <>
            <input type="file" accept=".pdf,.jpg,.png" disabled={readOnly} onChange={e => setFile(e.target.files?.[0] || null)} />
            {!readOnly && (
              <Button
                disabled={!file || loading}
                onClick={async () => {
                  if (!file || !session?.user) return;
                  setLoading(true);
                  // Upload file to Supabase
                  const { data, error } = await supabase.storage.from("employee-documents").upload(`${employeeId}/${file.name}`, file);
                  if (error) return console.error(error);
                  const { data: pub } = supabase.storage.from("employee-documents").getPublicUrl(data.path);
                  // Insert Document record
                  const doc = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: file.name,
                      category: step.category || "Onboarding",
                      description: `Onboarding upload for ${title}`,
                      path: data.path,
                      size: file.size,
                      type: file.type,
                      url: pub.publicUrl,
                      employeeId,
                      companyId,
                      uploaderId: session.user.id
                    }),
                  }).then(r => r.json());
                  // Complete step with documentId
                  onComplete({ documentId: doc.id });
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
  if (step.type === "fill-form" && step.formFields) {
    return (
      <Card className="p-4">
        <div className="mb-2 font-semibold">{title}</div>
        <div className="mb-3 text-sm">{desc}</div>
        <form
          onSubmit={e => { e.preventDefault(); setLoading(true); onComplete(formValues); }}
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

  // 🚨 Fallback
  return (
    <Card className="p-4">
      <div className="text-sm text-destructive">Unknown step type: {step.type}</div>
    </Card>
  );
}
