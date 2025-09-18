"use client";

import { FormField } from "@/api/forms/[id]/types";
import { AlertCircle } from "lucide-react";

export function FormPreview({ fields }: { fields: FormField[] }) {
  return (
    <div className="border p-4 rounded-lg bg-gray-50 shadow-sm">
      <h3 className="font-semibold mb-4 text-lg">Preview</h3>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center text-gray-400 py-12">
          <AlertCircle className="h-8 w-8 mb-2 opacity-60" />
          <p className="italic text-sm">
            No fields yet. Start building your form.
          </p>
        </div>
      ) : (
        <form className="space-y-5">
          {fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1">
              {/* Structural elements */}
              {field.type === "sectionHeader" && (
                <h4 className="text-lg font-semibold pt-2">{field.label || "Section"}</h4>
              )}
              {field.type === "description" && (
                <p className="text-sm text-gray-600">{field.helpText || field.placeholder || field.label}</p>
              )}
              {field.type === "divider" && <div className="border-t my-2" />}
              {field.type === "pageBreak" && (
                <div className="text-xs uppercase tracking-wide text-gray-400 pt-2">Page Break</div>
              )}

              {/* Controls */}
              {!["sectionHeader","description","divider","pageBreak"].includes(String(field.type)) && (
                <>
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label || "Untitled Field"}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderPreviewField(field)}
                </>
              )}
            </div>
          ))}
        </form>
      )}
    </div>
  );
}

function renderPreviewField(field: FormField) {
  const baseInput =
    "border rounded w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition";

  switch (field.type) {
    case "time":
      return <input type="time" className={baseInput} />;
    case "dateRange":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={baseInput} placeholder="Start" />
          <input type="date" className={baseInput} placeholder="End" />
        </div>
      );
    case "switch":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-blue-500" />
          <span>{field.placeholder || "Toggle"}</span>
        </label>
      );
    case "rating":
      return (
        <div className="flex gap-1">
          {Array.from({ length: Math.max(5, Number(field.validation?.max || 5)) }).map((_, i) => (
            <span key={i} className={`text-lg ${i < Number(field.defaultValue || 0) ? "text-yellow-500" : "text-gray-300"}`}>★</span>
          ))}
        </div>
      );
    case "slider":
      return <input type="range" className="w-full" min={field.validation?.min ?? 0} max={field.validation?.max ?? 100} defaultValue={field.defaultValue ?? 50} />;
    case "currency":
      return <input type="text" inputMode="decimal" className={baseInput} placeholder={field.placeholder || "$0.00"} />;
    case "percentage":
      return <input type="text" inputMode="decimal" className={baseInput} placeholder={field.placeholder || "0%"} />;
    case "address":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input className={baseInput} placeholder="Address line 1" />
          <input className={baseInput} placeholder="Address line 2" />
          <input className={baseInput} placeholder="City" />
          <input className={baseInput} placeholder="State" />
          <input className={baseInput} placeholder="Postal code" />
          <input className={baseInput} placeholder="Country" />
        </div>
      );
    case "attachmentGallery":
      return <div className="grid grid-cols-3 gap-2"><div className="h-14 bg-gray-100 rounded" /><div className="h-14 bg-gray-100 rounded" /><div className="h-14 bg-gray-100 rounded" /></div>;
    case "signature":
      return <div className="h-20 border rounded flex items-center justify-center text-xs text-gray-500">Signature pad</div>;
    case "text":
    case "email":
    case "phone":
    case "date":
      return (
        <input
          type={field.type}
          className={baseInput}
          placeholder={field.placeholder}
        />
      );

    case "textarea":
      return (
        <textarea
          className={`${baseInput} min-h-[80px]`}
          placeholder={field.placeholder}
        />
      );

    case "select":
      return (
        <select className={baseInput} defaultValue="">
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
        <div className="flex flex-wrap gap-4 mt-1">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={String(field.id)}
                className="accent-blue-500 focus:ring-blue-400"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col gap-2 mt-1">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-500 focus:ring-blue-400"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "file":
      return (
        <input
          type="file"
          className={`${baseInput} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
        />
      );
    case "computed":
    case "readOnly":
      return (
        <input
          type="text"
          disabled
          className={`${baseInput} bg-gray-50`}
          placeholder={field.placeholder || "Auto-calculated"}
          defaultValue={field.defaultValue}
        />
      );

    default:
      return null;
  }
}
