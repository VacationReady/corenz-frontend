"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { GlassSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { normalizeToPages, type AnyFormSchema, type FormField } from "@/api/forms/[id]/types";

type FormRecord = {
  id: string;
  name: string;
  schema: AnyFormSchema;
};

type Option = {
  label: string;
  value: string;
};

const getOptions = (field: FormField): Option[] => {
  const optionItems = Array.isArray(field.optionItems) ? field.optionItems : [];
  if (optionItems.length) {
    return optionItems.map((item) => ({
      label: String(item.label ?? item.value ?? ""),
      value: String(item.value ?? item.label ?? ""),
    }));
  }

  const options = Array.isArray(field.options) ? field.options : [];
  return options.map((opt) => ({ label: String(opt), value: String(opt) }));
};

const isFieldRequired = (field: FormField) =>
  Boolean(field.validation?.required ?? field.required);

function FieldPreview({
  field,
  disabled,
}: {
  field: FormField;
  disabled: boolean;
}) {
  const type = String(field.type || "text");

  if (field.hidden) return null;

  if (type === "sectionHeader") {
    return (
      <div className="text-base font-semibold text-slate-900 dark:text-white">
        {field.label || ""}
      </div>
    );
  }

  if (type === "description") {
    const text =
      String(field.helpText || field.placeholder || field.label || "").trim();
    if (!text) return null;
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }

  if (type === "divider") {
    return <div className="border-t border-slate-200 dark:border-slate-700" />;
  }

  if (type === "pageBreak") {
    return (
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Page break
      </div>
    );
  }

  const label = String(field.label || field.id || "Field");
  const required = isFieldRequired(field);
  const helpText =
    typeof field.helpText === "string" && field.helpText.trim().length
      ? field.helpText.trim()
      : "";
  const placeholder =
    typeof field.placeholder === "string" ? field.placeholder : undefined;
  const options = getOptions(field);

  const renderInput = () => {
    if (type === "textarea") {
      return <Textarea rows={3} placeholder={placeholder} disabled={disabled} />;
    }

    if (type === "select" || type === "multiselect" || type === "chips") {
      const isMulti = type === "multiselect" || field.multiple === true;
      return (
        <select
          disabled={disabled}
          multiple={isMulti}
          defaultValue={isMulti ? undefined : ""}
          className={cn(
            "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm",
            disabled && "opacity-70",
          )}
        >
          {!isMulti && (
            <option value="" disabled>
              {placeholder || "Select an option"}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === "radio") {
      return (
        <div className="space-y-2">
          {(options.length ? options : [{ label: "Option", value: "option" }]).map(
            (opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span>{opt.label}</span>
              </label>
            ),
          )}
        </div>
      );
    }

    if (type === "checkbox") {
      const isSingle = field.multiple === false;
      const inputType = isSingle ? "radio" : "checkbox";
      return (
        <div className="space-y-2">
          {(options.length ? options : [{ label: "Option", value: "option" }]).map(
            (opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type={inputType}
                  name={field.id}
                  value={opt.value}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span>{opt.label}</span>
              </label>
            ),
          )}
        </div>
      );
    }

    if (type === "rating" || type === "slider") {
      const min = field.validation?.min ?? (type === "rating" ? 1 : 0);
      const max = field.validation?.max ?? (type === "rating" ? 5 : 100);
      return (
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className="w-full"
        />
      );
    }

    if (type === "file" || type === "signature" || type === "attachmentGallery") {
      return (
        <input
          type="file"
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm",
            disabled && "opacity-70",
          )}
        />
      );
    }

    if (type === "dateRange") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input type="date" disabled={disabled} />
          <Input type="date" disabled={disabled} />
        </div>
      );
    }

    if (type === "address") {
      return (
        <div className="space-y-3">
          <Input placeholder="Address line 1" disabled={disabled} />
          <Input placeholder="Address line 2" disabled={disabled} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="City" disabled={disabled} />
            <Input placeholder="Postal code" disabled={disabled} />
          </div>
        </div>
      );
    }

    if (type === "table" || type === "list") {
      return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-3 text-sm text-muted-foreground">
          {type === "table" ? "Table" : "List"} field preview
        </div>
      );
    }

    const inputType =
      type === "email"
        ? "email"
        : type === "phone"
          ? "tel"
          : type === "number" || type === "currency" || type === "percentage"
            ? "number"
            : type === "date"
              ? "date"
              : type === "time"
                ? "time"
                : "text";

    return (
      <Input
        type={inputType}
        placeholder={placeholder}
        disabled={disabled || type === "computed" || type === "readOnly"}
        readOnly={type === "computed" || type === "readOnly"}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>
      {helpText && <div className="text-xs text-muted-foreground">{helpText}</div>}
      {renderInput()}
    </div>
  );
}

export function FormSchemaPreview({
  formId,
  disabled = true,
  className,
}: {
  formId: string;
  disabled?: boolean;
  className?: string;
}) {
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/forms/${formId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load form");
        const data = (await res.json()) as FormRecord;
        setForm(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setForm(null);
        setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    if (formId) {
      void load();
    } else {
      setForm(null);
      setLoading(false);
    }

    return () => controller.abort();
  }, [formId]);

  const pages = useMemo(() => {
    if (!form?.schema) return [];
    return normalizeToPages(form.schema);
  }, [form?.schema]);

  if (!formId) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No form selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex justify-center py-6", className)}>
        <GlassSpinner showText text="Loading form…" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Failed to load form
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-sm font-semibold text-slate-900 dark:text-white">
        {form.name}
      </div>
      {pages.map((page) => (
        <div key={page.id} className="space-y-5">
          {page.title && (
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {page.title}
            </div>
          )}
          {page.description && (
            <div className="text-sm text-muted-foreground">{page.description}</div>
          )}
          {page.sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {(section.title || section.description) && (
                <div className="space-y-1">
                  {section.title && (
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {section.title}
                    </div>
                  )}
                  {section.description && (
                    <div className="text-sm text-muted-foreground">
                      {section.description}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <FieldPreview
                    key={field.id}
                    field={field}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
