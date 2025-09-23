"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Checkbox from "@/components/ui/Checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "@/components/audit/ChangeReasonModal";

interface DynamicFormRendererProps {
  formId: string;
  employeeId?: string;
  onSubmitSuccess?: (data: any) => void;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export function DynamicFormRenderer({
  formId,
  employeeId,
  onSubmitSuccess,
}: DynamicFormRendererProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingData, setPendingData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        console.log("✅ Loaded form schema:", data.schema);
        setFields(data.schema || []);
      } catch (err) {
        console.error("❌ Failed to load form:", err);
        toast.error("Failed to load form");
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId]);

  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "checkbox") {
        shape[f.id] = f.required
          ? z.array(z.string()).min(1, `${f.label} is required`)
          : z.array(z.string()).optional();
      } else if (f.type === "file") {
        shape[f.id] = f.required
          ? z
              .any()
              .refine((files) => files?.length > 0, `${f.label} is required`)
          : z.any().optional();
      } else {
        shape[f.id] = f.required
          ? z.string().min(1, `${f.label} is required`)
          : z.string().optional();
      }
    });
    return z.object(shape);
  };

  const formSchema = buildValidationSchema();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(formSchema) });

  const submitForm = async (data: Record<string, any>, reasons?: Record<string, string>) => {
    try {
      const processedData = { ...data };
      for (const field of fields) {
        if (
          field.type === "file" &&
          data[field.id] &&
          data[field.id].length > 0
        ) {
          const file = data[field.id][0];
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("employeeId", employeeId || "");
            formData.append("name", field.label || file.name);
            formData.append("category", formId);

            const res = await fetch("/api/documents/upload-employee", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              toast.error(`Failed to upload ${field.label}`);
              return;
            }

            const uploaded = await res.json();
            processedData[field.id] = uploaded;
          } catch {
            toast.error(`Failed to upload ${field.label}`);
            return;
          }
        }
      }
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, data: processedData, reasons: reasons || {} }),
      });
      if (res.ok) {
        toast.success("Form submitted successfully");
        onSubmitSuccess?.(processedData);
      } else {
        toast.error("Failed to submit form");
      }
    } catch {
      toast.error("Failed to submit form");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <PageLoader text="Loading form..." />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const changes: ChangeInfo[] = Object.entries(data).map(([k, v]) => ({
          field: k,
          oldValue: "",
          newValue: JSON.stringify(v ?? ""),
        }));

        if (changes.some(changeRequiresReason)) {
          setPendingData(data);
          setPendingChanges(changes);
          setIsReasonOpen(true);
          return;
        }

        await submitForm(data, {});
      })}
      className="space-y-6 bg-white p-6 rounded-lg shadow-md"
    >
      {fields.map((field) => {
        console.log("📦 Rendering field:", field);
        return (
          <div key={field.id} className="flex flex-col gap-2">
            <label className="font-medium text-sm text-gray-700">
              {field.label || "Untitled Field"}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field, register)}
            {errors[field.id] && (
              <p className="text-red-500 text-xs mt-1">
                {errors[field.id]?.message as string}
              </p>
            )}
          </div>
        );
      })}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>

      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingData(null);
        }}
        changes={pendingChanges}
        onSubmit={async (reasons) => {
          if (!pendingData) return;
          await submitForm(pendingData, reasons);
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingData(null);
        }}
      />
    </form>
  );
}

function renderField(field: FormField, register: any) {
  console.log("🧪 renderField received:", field);

  const baseInput =
    "w-full rounded-2xl glass-subtle border-glass px-4 py-2.5 text-sm transition-glass placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 focus:glass-strong disabled:cursor-not-allowed disabled:opacity-50";

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "date":
      return (
        <Input
          type={field.type}
          placeholder={field.placeholder}
          {...register(field.id)}
        />
      );
    case "textarea":
      return (
        <Textarea
          placeholder={field.placeholder}
          className="min-h-[80px]"
          {...register(field.id)}
        />
      );
    case "select":
      return (
        <select className={baseInput} defaultValue="" {...register(field.id)}>
          <option value="" disabled>
            {field.placeholder || "Select an option"}
          </option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-4">
          {field.options?.map((opt, i) => (
            <label
              key={i}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                type="radio"
                value={opt}
                {...register(field.id)}
                className="accent-primary focus:ring-primary/50"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt, i) => (
            <label
              key={i}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox id={`${field.id}-${i}`} {...register(field.id)} /> {opt}
            </label>
          ))}
        </div>
      );
    case "file":
      console.log("✅ Rendering file input for field:", field.label);
      return (
        <>
          <p className="text-blue-500 text-xs italic">[File input active]</p>
          <input
            type="file"
            {...register(field.id)}
            className={`${baseInput} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20`}
          />
        </>
      );
    default:
      console.warn("⚠️ Unknown field type:", field.type);
      return null;
  }
}
