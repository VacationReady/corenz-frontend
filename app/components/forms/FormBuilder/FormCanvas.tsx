"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusCircle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FormField, FormSection } from "@/api/forms/[id]/types";
import { SortableFieldItem } from "./SortableFieldItem";

export function FormCanvas({
  sections,
  onSelectField,
  setSections,
  selectedField,
}: {
  sections: FormSection[];
  onSelectField: (field: FormField | null) => void;
  setSections: React.Dispatch<React.SetStateAction<FormSection[]>>;
  selectedField: FormField | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas" });

  const handleDeleteField = (fieldId: string) => {
    setSections((prev) => prev.map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) })));
    if (selectedField?.id === fieldId) {
      const remaining = sections.flatMap((s) => s.fields).filter((f) => f.id !== fieldId);
      onSelectField(remaining[0] || null);
    }
  };

  const handleUpdateField = (updated: FormField) => {
    setSections((prev) => prev.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === updated.id ? updated : f)) })));
    if (selectedField?.id === updated.id) onSelectField(updated);
  };

  const handleDuplicateField = (field: FormField) => {
    const copy: FormField = { ...field, id: `${field.id}-copy` };
    setSections((prev) => prev.map((s) => {
      const idx = s.fields.findIndex((f) => f.id === field.id);
      if (idx === -1) return s;
      const nextFields = [...s.fields];
      nextFields.splice(idx + 1, 0, copy);
      return { ...s, fields: nextFields };
    }));
    onSelectField(copy);
  };

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors ${
          isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        <h3 className="text-lg font-semibold mb-3">Form Layout</h3>

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
            <PlusCircle className="h-8 w-8 mb-2 opacity-60" />
            <p className="italic text-sm">Add a section to begin</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} className="bg-white border rounded-md p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="text-sm font-medium border rounded px-2 py-1"
                      value={section.title || "Untitled section"}
                      onChange={(e) => setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, title: e.target.value } : s))}
                    />
                    <select
                      className="text-xs border rounded px-2 py-1"
                      value={String(section.columns || 1)}
                      onChange={(e) => setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, columns: Number(e.target.value) as 1|2|3 } : s))}
                    >
                      <option value="1">1 col</option>
                      <option value="2">2 col</option>
                      <option value="3">3 col</option>
                    </select>
                  </div>
                </div>

                <div
                  className={`min-h[120px] rounded-md p-3 ${section.fields.length ? "bg-gray-50" : "bg-gray-50"}`}
                  id={`section-${section.id}`}
                >
                  {section.fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-400 py-6">
                      <PlusCircle className="h-6 w-6 mb-2 opacity-60" />
                      <p className="italic text-xs">Drag fields here</p>
                    </div>
                  ) : (
                    <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {section.fields.map((field) => (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            selectedField={selectedField}
                            onSelectField={onSelectField}
                            onDeleteField={handleDeleteField}
                            onUpdateField={handleUpdateField}
                            onDuplicateField={handleDuplicateField}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
