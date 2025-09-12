"use client";

import React from "react";

interface Field {
  id: string;
  label: string;
  type?: string;
}

interface FormSubmissionViewerProps {
  schema?: Field[] | { fields?: Field[] };
  answers?: Record<string, any>;
}

export default function FormSubmissionViewer({
  schema = [],
  answers = {},
}: FormSubmissionViewerProps) {
  // Handle both direct array format and nested fields format
  const fields = Array.isArray(schema) ? schema : schema?.fields || [];

  return (
    <div className="space-y-4">
      {fields.length > 0 ? (
        fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {field.label || "Unnamed field"}
            </p>
            <p className="text-sm text-gray-900">
              {formatAnswer(answers?.[field.id])}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500">No form fields available</p>
      )}
    </div>
  );
}

function formatAnswer(value: any): React.ReactNode {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-500">No answer</span>;
  }
  if (typeof value === "object") {
    if (value.url) {
      return (
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {value.name || value.url}
        </a>
      );
    }
    return JSON.stringify(value);
  }
  return String(value);
}
