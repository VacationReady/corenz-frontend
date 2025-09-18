"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { FormField, TableColumn } from "@/api/forms/[id]/types";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";

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
    schema: FormField[];
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

  useEffect(() => {
    const loadFormData = async () => {
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

  const saveData = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, data, reasons: pendingPayload?.reasons || {} }),
      });
      if (res.ok) {
        toast.success("Data saved successfully");
        onDataChange?.(data);
        const r = await fetch(
          `/api/forms/${formId}/data?employeeId=${employeeId}`,
        );
        if (r.ok) setFormData(await r.json());
      } else toast.error("Failed to save data");
    } catch {
      toast.error("Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, data, reasons: pendingPayload?.reasons || {} }),
      });
      if (res.ok) {
        toast.success("Form submitted successfully");
        reset();
        onDataChange?.(data);
      } else toast.error("Failed to submit form");
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

    for (const field of formData!.form.schema) {
      if (field.type === "file") {
        const file = toFile(rawData[field.id]);
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
            if (!uploadResult?.document) {
              toast.error(`Failed to upload file for ${field.label}`);
              return;
            }
            data[field.id] = uploadResult.document;
          } catch {
            toast.error(`Upload error: ${field.label}`);
            return;
          }
        } else if (rawData[field.id]?.url) {
          // keep existing document if no new file selected
          data[field.id] = rawData[field.id];
        } else {
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

  const isReadOnly = Boolean(formData?.readOnly);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold">{formData.form.name}</h2>
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
        {formData.form.schema.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field, register, watch, setValue, isReadOnly)}
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
            setPendingPayload((p) => ({ ...(p || {}), reasons }));
            await saveData(pendingPayload.data);
          } else if (pendingAction === "submit") {
            setPendingPayload((p) => ({ ...(p || {}), reasons }));
            await submitForm(pendingPayload.data);
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

export function renderField(
  field: FormField,
  register: any,
  watch: any,
  setValue: any,
  readOnly?: boolean,
) {
  const baseInput =
    "border rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition";

  switch (field.type) {
    case "file":
      const existing = watch(field.id);
      return (
        <div className="space-y-2">
          {existing?.url && (
            <div className="space-y-2">
              <iframe
                src={existing.url}
                className="w-full h-64 rounded border"
              />
              <a
                href={existing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline block"
              >
                {existing.name || "View document"}
              </a>
            </div>
          )}
          <input
            type="file"
            className="border rounded px-3 py-2 w-full text-sm"
            disabled={readOnly}
            {...register(field.id, { required: field.required })}
          />
        </div>
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
