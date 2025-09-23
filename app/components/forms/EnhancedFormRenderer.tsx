"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FileDropzone, { FileDropzoneItem, UploadHelpers } from "@/components/ui/FileDropzone";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { FormField, TableColumn, AnyFormSchema, normalizeToPages, FormPage } from "@/api/forms/[id]/types";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import HistoryButton from "@/components/audit/HistoryButton";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";

const isSerializableValue = (value: unknown) => {
  if (value === undefined) return false;
  if (typeof value === "function" || typeof value === "symbol") return false;
  if (typeof File !== "undefined" && value instanceof File) return false;
  if (typeof FileList !== "undefined" && value instanceof FileList) return false;
  return true;
};

const isMeaningfulValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return true;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

const serialiseDraftValues = (values: Record<string, any>) => {
  const serialised: Record<string, any> = {};
  Object.entries(values || {}).forEach(([key, value]) => {
    if (!isSerializableValue(value)) return;
    serialised[key] = value;
  });
  return serialised;
};

interface EnhancedFormRendererProps {
  formId: string;
  employeeId: string;
  onDataChange?: (data: any) => void;
}

interface FormDataShape {
  form: {
    id: string;
    name: string;
    formType: "SUBMISSION" | "DATA_SCREEN";
    schema: AnyFormSchema;
  };
  data: Record<string, any>;
  lastUpdated: string | null;
  readOnly?: boolean;
}

export function EnhancedFormRenderer({
  formId,
  employeeId,
  onDataChange,
}: EnhancedFormRendererProps) {
  const [formData, setFormData] = useState<FormDataShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingAction, setPendingAction] = useState<"data" | "submit" | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, any> | null>(null);

  const { register, handleSubmit, setValue, watch, reset } = useForm();
  const { data: session } = useSession();
  const watchedValues = watch();
  const latestValuesRef = useRef<Record<string, any>>({});
  const [draftChecked, setDraftChecked] = useState(false);
  const isDataScreen = formData?.form?.formType === "DATA_SCREEN";
  const draftStorageKey =
    session?.user && isDataScreen
      ? `form:draft:${session.user.companyId}:${session.user.id}:${formId}:${employeeId}`
      : null;
  const isReadOnly = Boolean(formData?.readOnly);

  const evaluateCondition = (cond: any): boolean => {
    if (!cond) return true;
    const left = watch(cond.fieldId);
    const op = cond.operator as string;
    const right = cond.value;
    switch (op) {
      case "equals":
        return left === right;
      case "notEquals":
        return left !== right;
      case "contains":
        return Array.isArray(left) ? left.includes(right) : String(left || "").includes(String(right ?? ""));
      case "notContains":
        return Array.isArray(left) ? !left.includes(right) : !String(left || "").includes(String(right ?? ""));
      case "greaterThan":
        return Number(left) > Number(right);
      case "greaterOrEqual":
        return Number(left) >= Number(right);
      case "lessThan":
        return Number(left) < Number(right);
      case "lessOrEqual":
        return Number(left) <= Number(right);
      case "isEmpty":
        return left === undefined || left === null || left === "" || (Array.isArray(left) && left.length === 0);
      case "isNotEmpty":
        return !(left === undefined || left === null || left === "" || (Array.isArray(left) && left.length === 0));
      default:
        return true;
    }
  };

  const evaluateGroup = (group: any): boolean => {
    if (!group) return true;
    const ands = (group.all || []) as any[];
    const ors = (group.any || []) as any[];
    const andOk = ands.length ? ands.every(evaluateCondition) : true;
    const orOk = ors.length ? ors.some(evaluateCondition) : true;
    return andOk && orOk;
  };

  const clearFormDraftStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!draftStorageKey) return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (error) {
      console.error("Failed to clear form draft", error);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    const loadFormData = async () => {
      if (!formId || !employeeId) {
        setError("Missing form or employee context");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/forms/${formId}/data?employeeId=${employeeId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFormData(data);
          if (data.data)
            Object.keys(data.data).forEach((k) => setValue(k, data.data[k]));
        } else setError("Failed to load form data");
      } catch {
        setError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };
    loadFormData();
  }, [formId, employeeId, setValue]);

  useEffect(() => {
    if (!isDataScreen) {
      latestValuesRef.current = {};
      return;
    }
    latestValuesRef.current = serialiseDraftValues(watchedValues || {});
  }, [watchedValues, isDataScreen]);

  useEffect(() => {
    setDraftChecked(false);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !isDataScreen || isReadOnly) return;
    if (typeof window === "undefined") return;

    const interval = window.setInterval(() => {
      const values = latestValuesRef.current || {};
      const hasContent =
        Object.keys(values).length > 0 && Object.values(values).some(isMeaningfulValue);
      if (!hasContent) {
        try {
          window.localStorage.removeItem(draftStorageKey);
        } catch (error) {
          console.error("Failed to prune empty form draft", error);
        }
        return;
      }

      try {
        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            values,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error("Failed to persist form draft", error);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [draftStorageKey, isDataScreen, isReadOnly]);

  useEffect(() => {
    if (!draftStorageKey || !isDataScreen) return;
    const existingData = formData?.data;
    if (existingData && Object.keys(existingData || {}).length > 0) {
      clearFormDraftStorage();
    }
  }, [draftStorageKey, formData, isDataScreen, clearFormDraftStorage]);

  useEffect(() => {
    if (draftChecked) return;
    if (!draftStorageKey || !isDataScreen) return;
    if (loading) return;
    if (!formData) return;
    if (formData.data && Object.keys(formData.data || {}).length > 0) {
      setDraftChecked(true);
      return;
    }
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) {
      setDraftChecked(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        values?: Record<string, any>;
        updatedAt?: string;
      };
      const serialised = serialiseDraftValues(parsed?.values || {});
      const hasContent =
        Object.keys(serialised).length > 0 &&
        Object.values(serialised).some(isMeaningfulValue);
      if (!hasContent) {
        window.localStorage.removeItem(draftStorageKey);
      } else {
        reset(serialised);
        toast.info(
          parsed?.updatedAt
            ? `Restored a local draft from ${new Date(parsed.updatedAt).toLocaleString()}.`
            : "Restored a local draft from this device.",
        );
      }
    } catch (error) {
      console.error("Failed to restore form draft", error);
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftChecked(true);
    }
  }, [draftChecked, draftStorageKey, formData, isDataScreen, loading, reset]);

  const saveData = async (data: Record<string, any>, reasons?: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, data, reasons: reasons || {} }),
      });
      if (res.ok) {
        toast.success("Data saved successfully");
        clearFormDraftStorage();
        onDataChange?.(data);
        const r = await fetch(
          `/api/forms/${formId}/data?employeeId=${employeeId}`,
        );
        if (r.ok) setFormData(await r.json());
      } else {
        const errText = await res.text().catch(() => "");
        toast.error(errText || "Failed to save data");
      }
    } catch {
      toast.error("Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async (data: Record<string, any>, reasons?: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, data, reasons: reasons || {} }),
      });
      if (res.ok) {
        toast.success("Form submitted successfully");
        reset();
        clearFormDraftStorage();
        onDataChange?.(data);
      } else {
        const errText = await res.text().catch(() => "");
        toast.error(errText || "Failed to submit form");
      }
    } catch {
      toast.error("Failed to submit form");
    } finally {
      setSaving(false);
    }
  };

  const toFile = (v: unknown): File | undefined => {
    if (!v) return undefined;
    if (v instanceof File) return v;
    if (typeof FileList !== "undefined" && v instanceof FileList)
      return v.length ? v[0] : undefined;
    // fallback for RHF quirks
    const anyV = v as any;
    if (anyV?.item) return anyV.item(0) ?? undefined;
    return undefined;
  };

  const onSubmit = async (rawData: Record<string, any>) => {
    if (formData?.readOnly) {
      toast.error("This screen is read-only.");
      return;
    }
    const data = { ...rawData };

    const allFields = normalizeToPages(formData!.form.schema as any)
      .flatMap((p) => p.sections || [])
      .flatMap((s) => s.fields);
    for (const field of allFields) {
      if (field.type === "file") {
        const value = rawData[field.id];
        const file = toFile(value);
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("name", file.name);
          fd.append("employeeId", String(employeeId));
          fd.append("category", String(formData!.form.name || ""));
          fd.append("canViewAdmin", "true");
          fd.append("canViewManager", "true");
          fd.append("canViewEmployee", "true");
          fd.append("requiresAck", "false");
          try {
            const uploadRes = await fetch("/api/documents/upload-employee", {
              method: "POST",
              body: fd,
            });
            if (!uploadRes.ok) {
              toast.error(
                `Failed to upload file for ${field.label}: ${await uploadRes.text()}`,
              );
              return;
            }
            const uploadResult = await uploadRes.json();
            const payload = uploadResult?.document || uploadResult?.Document;
            if (!payload) {
              toast.error(`Failed to upload file for ${field.label}`);
              return;
            }
            data[field.id] = payload;
          } catch {
            toast.error(`Upload error: ${field.label}`);
            return;
          }
        } else if (value?.document || value?.Document) {
          data[field.id] = value.document || value.Document;
        } else if (value?.url || value?.path) {
          data[field.id] = value;
        } else if (!value) {
          data[field.id] = null;
        }
      }
    }

    // Build diffs for reason capture
    if (formData?.form.formType === "DATA_SCREEN") {
      const before = formData?.data || {};
      const changes: ChangeInfo[] = [];
      for (const [k, v] of Object.entries(data)) {
        const oldVal = before[k];
        if (JSON.stringify(oldVal) !== JSON.stringify(v)) {
          changes.push({ field: k, oldValue: JSON.stringify(oldVal ?? ""), newValue: JSON.stringify(v ?? "") });
        }
      }
      if (changes.length > 0) {
        setPendingAction("data");
        setPendingChanges(changes);
        setPendingPayload({ data });
        setIsReasonOpen(true);
        return;
      }
      if (!formData?.readOnly) {
        saveData(data);
      } else {
        toast.error("This screen is read-only.");
      }
    } else {
      // Treat as changes from empty -> value
      const changes: ChangeInfo[] = Object.entries(data).map(([k, v]) => ({ field: k, oldValue: "", newValue: JSON.stringify(v ?? "") }));
      setPendingAction("submit");
      setPendingChanges(changes);
      setPendingPayload({ data });
      setIsReasonOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <PageLoader text="Loading form..." />
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || "Form not found"}</p>
      </div>
    );
  }

  // Normalize schema to pages/sections for rendering
  const pages: FormPage[] = normalizeToPages(formData.form.schema as any);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{formData.form.name}</h2>
          <HistoryButton
            employeeId={employeeId}
            section={`forms:${formId}`}
            title={`${formData.form.name} History`}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${formData.form.formType === "DATA_SCREEN" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
          >
            {formData.form.formType === "DATA_SCREEN"
              ? "Data Screen"
              : "Submission Form"}
          </span>
          {isReadOnly && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              Read-only
            </span>
          )}
          {formData.lastUpdated && (
            <span>
              Last updated: {new Date(formData.lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {pages.map((page) => (
          <div key={page.id} className="space-y-6">
            {page.title && (
              <h3 className="text-lg font-semibold">{page.title}</h3>
            )}
            {page.description && (
              <p className="text-sm text-gray-600">{page.description}</p>
            )}
            {(page.sections || []).filter((s) => !s.hidden).map((section) => (
              <div key={section.id} className="space-y-4">
                {section.title && (
                  <div>
                    <h4 className="font-semibold">{section.title}</h4>
                    {section.description && (
                      <p className="text-sm text-gray-600">{section.description}</p>
                    )}
                  </div>
                )}
                <div className={section.columns ? (section.columns === 2 ? "grid grid-cols-2 gap-4" : section.columns === 3 ? "grid grid-cols-3 gap-4" : "grid grid-cols-1 gap-4") : "grid grid-cols-12 gap-4"}>
                  {section.fields.map((field) => {
                    const isVisible = evaluateGroup(field.logic?.visibleWhen);
                    if (!isVisible) return null;
                    const widthClass = !section.columns
                      ? field.width === "half"
                        ? "col-span-12 md:col-span-6"
                        : field.width === "third"
                        ? "col-span-12 md:col-span-4"
                        : field.width === "auto"
                        ? "col-span-12 md:col-span-3"
                        : "col-span-12"
                      : "";
                    return (
                    <div key={field.id} className={widthClass}>
                      {field.type === "sectionHeader" && (
                        <h5 className="text-base font-semibold">{field.label}</h5>
                      )}
                      {field.type === "description" && (
                        <p className="text-sm text-gray-600">{field.helpText || field.placeholder || field.label}</p>
                      )}
                      {field.type === "divider" && <div className="border-t" />}
                      {!["sectionHeader","description","divider","pageBreak"].includes(String(field.type)) && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {field.label}
                              {(field.required || field.validation?.required) && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="-mr-2">
                              <HistoryButton
                                employeeId={employeeId}
                                section={`forms:${formId}`}
                                field={field.id}
                                title={`${field.label} History`}
                                variant="ghost"
                                size="sm"
                                iconOnly
                                className="text-gray-600 hover:text-gray-900"
                              />
                            </div>
                          </div>
                          {renderField(field, register, watch, setValue, isReadOnly, {
                            uploadContext: {
                              employeeId,
                              formName: formData.form.name,
                            },
                          })}
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={saving || isReadOnly}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : formData.form.formType === "DATA_SCREEN" ? (
              <Save className="h-4 w-4" />
            ) : null}
            {saving
              ? "Saving..."
              : formData.form.formType === "DATA_SCREEN"
                ? "Save Data"
                : "Submit Form"}
          </Button>
        </div>
      </form>

      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingAction(null);
          setPendingPayload(null);
        }}
        changes={pendingChanges}
        onSubmit={async (reasons) => {
          if (!pendingPayload) return;
          if (pendingAction === "data") {
            await saveData(pendingPayload.data, reasons);
          } else if (pendingAction === "submit") {
            await submitForm(pendingPayload.data, reasons);
          }
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingAction(null);
          setPendingPayload(null);
        }}
      />
    </div>
  );
}

interface RenderFieldOptions {
  uploadContext?: {
    employeeId?: string;
    formName?: string;
  };
}

export function renderField(
  field: FormField,
  register: any,
  watch: any,
  setValue: any,
  readOnly?: boolean,
  options?: RenderFieldOptions,
) {
  const baseInput =
    "w-full rounded-2xl glass-subtle border-glass px-4 py-2.5 text-sm transition-glass placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 focus:glass-strong disabled:cursor-not-allowed disabled:opacity-50";

  switch (field.type) {
    case "signature": {
      const mode: "typed" | "drawn" = (watch(`${field.id}.mode`) as any) || "typed";
      const typedVal = watch(`${field.id}.typed`) || "";
      const drawnVal = watch(`${field.id}.drawn`) || "";
      const hiddenName = `${field.id}.__valid`;
      return (
        <div className="space-y-3">
          <input
            type="hidden"
            {...register(hiddenName, {
              validate: () => {
                if (!field.required && !field.validation?.required) return true;
                if (mode === "typed") return Boolean(String(typedVal).trim()) || "Signature required";
                return Boolean(drawnVal) || "Signature required";
              },
            })}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded border ${mode === "typed" ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 text-gray-700"}`}
              onClick={() => setValue(`${field.id}.mode`, "typed", { shouldDirty: true })}
              disabled={readOnly}
            >
              Typed
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded border ${mode === "drawn" ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 text-gray-700"}`}
              onClick={() => setValue(`${field.id}.mode`, "drawn", { shouldDirty: true })}
              disabled={readOnly}
            >
              Drawn
            </button>
          </div>
          {mode === "typed" ? (
            <input
              type="text"
              placeholder={field.placeholder || "Type your name"}
              className={`${baseInput} font-[cursive]`}
              disabled={readOnly}
              defaultValue={typedVal}
              onChange={(e) => setValue(`${field.id}.typed`, e.target.value, { shouldDirty: true })}
            />
          ) : (
            <div className="border rounded p-3 bg-white">
              <canvas
                id={`sig-${field.id}`}
                className="w-full h-32"
                style={{ touchAction: "none" }}
                onMouseDown={(e) => {
                  const c = e.currentTarget as HTMLCanvasElement;
                  const rect = c.getBoundingClientRect();
                  const ctx = c.getContext("2d");
                  if (!ctx) return;
                  let drawing = true;
                  ctx.strokeStyle = "#111827";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                  const move = (ev: MouseEvent) => {
                    if (!drawing) return;
                    ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
                    ctx.stroke();
                  };
                  const up = () => {
                    drawing = false;
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                    try {
                      setValue(`${field.id}.drawn`, c.toDataURL("image/png"), { shouldDirty: true });
                    } catch {}
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-gray-500">Draw your signature above (mouse or touch).</div>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => {
                    const c = document.getElementById(`sig-${field.id}`) as HTMLCanvasElement | null;
                    if (!c) return;
                    const ctx = c.getContext("2d");
                    if (!ctx) return;
                    ctx.clearRect(0, 0, c.width, c.height);
                    setValue(`${field.id}.drawn`, "", { shouldDirty: true });
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    case "time":
      return (
        <Input
          type="time"
          placeholder={field.placeholder}
          disabled={readOnly}
          {...register(field.id, { required: field.required || field.validation?.required })}
        />
      );
    case "dateRange":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" disabled={readOnly} {...register(`${field.id}.start`, { required: field.required })} />
          <Input type="date" disabled={readOnly} {...register(`${field.id}.end`, { required: field.required })} />
        </div>
      );
    case "switch":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={readOnly} onChange={(e) => setValue(field.id, e.target.checked)} defaultChecked={!!watch(field.id)} />
          <span>{field.placeholder || field.label}</span>
        </label>
      );
    case "rating":
      return (
        <input type="range" min={field.validation?.min ?? 1} max={field.validation?.max ?? 5} step={1} disabled={readOnly} {...register(field.id, { required: field.required })} />
      );
    case "slider":
      return (
        <input type="range" min={field.validation?.min ?? 0} max={field.validation?.max ?? 100} disabled={readOnly} {...register(field.id, { required: field.required })} />
      );
    case "currency":
    case "percentage":
      return (
        <Input type="text" inputMode="decimal" placeholder={field.placeholder} disabled={readOnly} {...register(field.id, { required: field.required })} />
      );
    case "address":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input disabled={readOnly} {...register(`${field.id}.line1`, { required: field.required })} placeholder="Address line 1" />
          <Input disabled={readOnly} {...register(`${field.id}.line2`)} placeholder="Address line 2" />
          <Input disabled={readOnly} {...register(`${field.id}.city`, { required: field.required })} placeholder="City" />
          <Input disabled={readOnly} {...register(`${field.id}.state`)} placeholder="State" />
          <Input disabled={readOnly} {...register(`${field.id}.postalCode`, { required: field.required })} placeholder="Postal code" />
          <Input disabled={readOnly} {...register(`${field.id}.country`, { required: field.required })} placeholder="Country" />
        </div>
      );
    case "file":
      return (
        <FormFileUploadField
          field={field}
          watch={watch}
          setValue={setValue}
          readOnly={readOnly}
          uploadContext={options?.uploadContext}
        />
      );

    case "text":
    case "email":
    case "phone":
    case "date":
      return (
        <Input
          type={field.type}
          placeholder={field.placeholder}
          disabled={readOnly}
          {...register(field.id, { required: field.required })}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          placeholder={field.placeholder}
          disabled={readOnly}
          {...register(field.id, { required: field.required })}
        />
      );

    case "textarea":
      return (
        <Textarea
          placeholder={field.placeholder}
          className="min-h-[80px]"
          disabled={readOnly}
          {...register(field.id, { required: field.required })}
        />
      );

    // dropdown/select
    case "dropdown":
    case "select":
      return (
        <select
          className={baseInput}
          disabled={readOnly}
          {...register(field.id, { required: field.required })}
        >
          <option value="">{field.placeholder || "Select an option"}</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    // radio group
    case "radio":
      return (
        <div className="space-y-1">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={opt}
                disabled={readOnly}
                {...register(field.id, { required: field.required })}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    // checkbox: multi or single
    case "checkbox":
      if (field.options?.length) {
        return (
          <div className="space-y-1">
            {field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={opt}
                  disabled={readOnly}
                  {...register(field.id, { required: field.required })}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      }
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            onChange={(e) =>
              setValue(field.id, e.target.checked, { shouldValidate: true })
            }
            defaultChecked={!!watch(field.id)}
          />
          <span>{field.placeholder || field.label}</span>
        </label>
      );

    case "list":
      return (
        <ListField
          field={field}
          register={register}
          watch={watch}
          setValue={setValue}
          readOnly={readOnly}
        />
      );

    case "table":
      return (
        <TableField
          field={field}
          register={register}
          watch={watch}
          setValue={setValue}
          readOnly={readOnly}
        />
      );

    default:
      return (
        <Input
          placeholder={field.placeholder}
          disabled={readOnly}
          {...register(field.id, { required: field.required })}
        />
      );
  }
}

interface FormFileUploadFieldProps {
  field: FormField;
  watch: any;
  setValue: any;
  readOnly?: boolean;
  uploadContext?: {
    employeeId?: string;
    formName?: string;
  };
}

function FormFileUploadField({
  field,
  watch,
  setValue,
  readOnly,
  uploadContext,
}: FormFileUploadFieldProps) {
  const currentValue = watch(field.id);
  const [files, setFiles] = useState<FileDropzoneItem<any>[]>(() =>
    normalizeToDropzoneItems(currentValue, field.id),
  );

  useEffect(() => {
    setFiles((prev) => {
      const next = normalizeToDropzoneItems(currentValue, field.id);
      const prevMeta = JSON.stringify(prev.map((item) => item.meta));
      const nextMeta = JSON.stringify(next.map((item) => item.meta));
      return prevMeta === nextMeta ? prev : next;
    });
  }, [currentValue, field.id]);

  const handleFilesChange = (items: FileDropzoneItem<any>[]) => {
    setFiles(items);
    const successful = items.find(
      (item) => item.status === "success" && item.meta,
    );
    if (successful?.meta) {
      setValue(field.id, successful.meta, { shouldDirty: true, shouldTouch: true });
    } else {
      setValue(field.id, null, { shouldDirty: true, shouldTouch: true });
    }
  };

  const uploadFile = (file: File, helpers: UploadHelpers) =>
    uploadEmployeeDocumentWithProgress(file, helpers, {
      employeeId: uploadContext?.employeeId,
      formName: uploadContext?.formName,
      fieldLabel: field.label,
    });

  return (
    <FileDropzone
      files={files}
      onFilesChange={handleFilesChange}
      onUpload={uploadFile}
      multiple={false}
      disabled={readOnly}
      description={
        field.placeholder || "Drag a document here or click to browse"
      }
      helperText={
        readOnly
          ? undefined
          : "Documents are uploaded to this employee's secure bucket."
      }
    />
  );
}

function normalizeToDropzoneItems(
  value: any,
  fieldId: string,
): FileDropzoneItem<any>[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) => entry?.document || entry?.Document || entry)
    .filter(Boolean)
    .map((meta: any) => {
      const id = String(meta.id || `${fieldId}-${Math.random().toString(16).slice(2)}`);
      const name =
        meta.name || meta.fileName || meta.path || meta.url || "Uploaded file";
      const size =
        typeof meta.size === "number"
          ? meta.size
          : typeof meta.fileSize === "number"
            ? meta.fileSize
            : 0;
      const type = meta.type || meta.mimeType || "";
      return {
        id,
        name,
        size,
        type,
        status: "success" as const,
        progress: 100,
        meta,
        previewUrl: meta.url || meta.signedUrl || undefined,
      } satisfies FileDropzoneItem<any>;
    });
}

function uploadEmployeeDocumentWithProgress(
  file: File,
  helpers: UploadHelpers,
  context: { employeeId?: string; formName?: string; fieldLabel?: string },
) {
  return new Promise<any>((resolve, reject) => {
    if (!context.employeeId) {
      reject(new Error("Missing employee context for file upload"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append(
      "category",
      context.fieldLabel || context.formName || "Forms",
    );
    formData.append("employeeId", context.employeeId);
    formData.append("canViewAdmin", "true");
    formData.append("canViewManager", "true");
    formData.append("canViewEmployee", "true");
    formData.append("requiresAck", "false");
    formData.append("requiresSignature", "false");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload-employee", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        helpers.onProgress(percent);
      } else {
        helpers.onProgress(50);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          const document = payload.document || payload.Document;
          if (!document) {
            reject(new Error("Upload failed"));
            return;
          }
          resolve(document);
        } catch (error) {
          reject(
            error instanceof Error ? error : new Error("Failed to parse upload response"),
          );
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    helpers.signal.addEventListener("abort", () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        xhr.abort();
      }
    });

    xhr.send(formData);
  });
}

function ListField({ field, register, watch, setValue, readOnly }: any) {
  const currentValue = watch(field.id) || [];

  const addEntry = () => {
    setValue(field.id, [...currentValue, ""]);
  };
  const removeEntry = (index: number) => {
    setValue(
      field.id,
      currentValue.filter((_: any, i: number) => i !== index),
    );
  };
  const updateEntry = (index: number, value: string) => {
    const newValue = [...currentValue];
    newValue[index] = value;
    setValue(field.id, newValue);
  };

  return (
    <div className="space-y-2">
      {currentValue.map((entry: string, index: number) => (
        <div key={index} className="flex gap-2">
          <Input
            value={entry}
            onChange={(e) => updateEntry(index, e.target.value)}
            placeholder={`${field.label} ${index + 1}`}
            className="flex-1"
            disabled={readOnly}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeEntry(index)}
            className="px-2"
            disabled={readOnly}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="flex items-center gap-2"
        disabled={readOnly}
      >
        <Plus className="h-4 w-4" /> Add {field.label}
      </Button>
    </div>
  );
}

function TableField({ field, register, watch, setValue, readOnly }: any) {
  const currentValue = watch(field.id) || [];

  const addRow = () => {
    const newRow: Record<string, any> = {};
    field.tableColumns?.forEach((col: TableColumn) => {
      newRow[col.id] = "";
    });
    setValue(field.id, [...currentValue, newRow]);
  };

  const removeRow = (index: number) => {
    setValue(
      field.id,
      currentValue.filter((_: any, i: number) => i !== index),
    );
  };
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    const newValue = [...currentValue];
    newValue[rowIndex] = { ...newValue[rowIndex], [columnId]: value };
    setValue(field.id, newValue);
  };

  if (!field.tableColumns || field.tableColumns.length === 0) {
    return (
      <div className="text-gray-500 italic">No table columns configured</div>
    );
  }

  return (
    <div className="space-y-4">
      {currentValue.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {field.tableColumns.map((col: TableColumn) => (
                  <th
                    key={col.id}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b"
                  >
                    {col.label}
                    {col.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-2 w-16 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {currentValue.map((row: any, rowIndex: number) => (
                <tr key={rowIndex} className="border-b">
                  {field.tableColumns.map((col: TableColumn) => (
                    <td key={col.id} className="px-4 py-2">
                      {col.type === "select" ? (
                        <select
                          value={row[col.id] || ""}
                          onChange={(e) =>
                            updateCell(rowIndex, col.id, e.target.value)
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                          disabled={readOnly}
                        >
                          <option value="">Select...</option>
                          {col.options?.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={col.type}
                          value={row[col.id] || ""}
                          onChange={(e) =>
                            updateCell(rowIndex, col.id, e.target.value)
                          }
                          className="w-full text-sm"
                          disabled={readOnly}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRow(rowIndex)}
                      className="px-2"
                      disabled={readOnly}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="flex items-center gap-2"
        disabled={readOnly}
      >
        <Plus className="h-4 w-4" /> Add Row
      </Button>
    </div>
  );
}
