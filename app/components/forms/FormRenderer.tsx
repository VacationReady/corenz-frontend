"use client";

import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";

interface FormRendererProps {
  schema: any;
  onSubmit: (data: any) => void;
  submitLabel?: string;
  submitting?: boolean;
}

export function FormRenderer({ 
  schema, 
  onSubmit, 
  submitLabel = "Submit", 
  submitting = false 
}: FormRendererProps) {
  // Since we don't have formId or employeeId in this context,
  // we'll create a simplified form renderer that works with the schema directly
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Form rendering is being updated. Please use the enhanced form system.
      </p>
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-700">
          Schema received: {JSON.stringify(schema, null, 2)}
        </p>
        <button
          type="button"
          onClick={() => onSubmit({})}
          disabled={submitting}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
