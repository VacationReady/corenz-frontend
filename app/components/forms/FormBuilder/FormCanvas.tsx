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
        className={`min-h-[600px] rounded-2xl p-6 transition-all duration-300 ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : "glass-subtle"
          }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gradient-premium">Form Layout</h3>
          <div className="text-xs text-muted-foreground">
            {sections.length} Section{sections.length !== 1 ? 's' : ''}
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-20 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <PlusCircle className="h-8 w-8 opacity-60" />
            </div>
            <p className="font-medium">Start building your form</p>
            <p className="text-sm opacity-70 mt-1">Add a section or drag fields here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <SectionBox
                key={section.id}
                section={section}
                selectedField={selectedField}
                onSelectField={onSelectField}
                onTitleChange={(title) =>
                  setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, title } : s)))
                }
                onColumnsChange={(cols: 1 | 2 | 3) =>
                  setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, columns: cols } : s)))
                }
                onDeleteField={handleDeleteField}
                onUpdateField={handleUpdateField}
                onDuplicateField={handleDuplicateField}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function SectionBox({
  section,
  selectedField,
  onSelectField,
  onTitleChange,
  onColumnsChange,
  onDeleteField,
  onUpdateField,
  onDuplicateField,
}: {
  section: FormSection;
  selectedField: FormField | null;
  onSelectField: (field: FormField | null) => void;
  onTitleChange: (title: string) => void;
  onColumnsChange: (cols: 1 | 2 | 3) => void;
  onDeleteField: (id: string) => void;
  onUpdateField: (f: FormField) => void;
  onDuplicateField: (f: FormField) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `section-${section.id}` });

  return (
    <div className="glass-card rounded-xl p-1 overflow-hidden group hover:shadow-md transition-all">
      <div className="bg-white/50 border-b border-white/20 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <input
            className="text-sm font-semibold bg-transparent border-transparent hover:border-white/40 focus:border-primary/50 rounded px-2 py-1 transition-colors w-full max-w-xs outline-none"
            value={section.title || "Untitled section"}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Section Title"
          />
        </div>
        <select
          className="text-xs bg-white/50 border-white/20 rounded-md px-2 py-1 hover:bg-white/80 transition-colors cursor-pointer"
          value={String(section.columns || 1)}
          onChange={(e) => onColumnsChange(Number(e.target.value) as 1 | 2 | 3)}
        >
          <option value="1">1 Column</option>
          <option value="2">2 Columns</option>
          <option value="3">3 Columns</option>
        </select>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[120px] p-4 transition-colors ${isOver ? "bg-primary/5" : "bg-transparent"
          }`}
      >
        {section.fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-8 border-2 border-dashed border-white/20 rounded-lg m-2">
            <PlusCircle className="h-5 w-5 mb-2 opacity-50" />
            <p className="text-xs font-medium">Drop fields here</p>
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
                  onDeleteField={onDeleteField}
                  onUpdateField={onUpdateField}
                  onDuplicateField={onDuplicateField}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
