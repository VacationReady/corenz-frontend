"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, GripVertical, Layers, Settings2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FormField, FormSection } from "@/api/forms/[id]/types";
import { SortableFieldItem } from "./SortableFieldItem";
import { cn } from "@/lib/utils";

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

  const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[500px] rounded-2xl transition-all duration-300",
          isOver && "bg-primary/5 ring-2 ring-primary/30 ring-offset-2"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Form Layout</h3>
              <p className="text-xs text-muted-foreground">Drag fields here to build your form</p>
            </div>
          </div>
          <motion.div 
            key={totalFields}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle text-xs font-medium"
          >
            <span className="text-foreground">{totalFields}</span>
            <span className="text-muted-foreground">field{totalFields !== 1 ? 's' : ''}</span>
          </motion.div>
        </div>

        {sections.length === 0 || (sections.length === 1 && sections[0].fields.length === 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed border-white/30 rounded-2xl bg-gradient-to-b from-white/30 to-transparent"
          >
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg shadow-primary/10"
            >
              <PlusCircle className="h-10 w-10 text-primary/60" />
            </motion.div>
            <p className="font-semibold text-foreground text-lg mb-2">Start building your form</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Drag elements from the palette on the left, or click on them to add fields to your form
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sections.map((section, sectionIndex) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: sectionIndex * 0.05 }}
                >
                  <SectionBox
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
                </motion.div>
              ))}
            </AnimatePresence>
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
    <div className="glass-card rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-white/80 to-white/50 border-b border-white/30 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-1.5 rounded-lg bg-gray-100/80 text-muted-foreground cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </div>
            <input
              className="text-sm font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-primary/50 rounded-none px-1 py-0.5 transition-colors w-full max-w-xs outline-none focus:ring-0"
              value={section.title || ""}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Section Title (optional)"
            />
          </div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <select
              className="text-xs bg-white/80 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-white focus:border-primary/50 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20"
              value={String(section.columns || 1)}
              onChange={(e) => onColumnsChange(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value="1">1 Column</option>
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[140px] p-4 transition-all duration-200",
          isOver && "bg-primary/5"
        )}
      >
        {section.fields.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200/80 rounded-xl bg-gradient-to-b from-gray-50/50 to-transparent"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <PlusCircle className="h-8 w-8 text-gray-300 mb-3" />
            </motion.div>
            <p className="text-sm font-medium text-muted-foreground">Drop fields here</p>
            <p className="text-xs text-muted-foreground/60 mt-1">or click elements in the palette</p>
          </motion.div>
        ) : (
          <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div 
              className={cn(
                "grid gap-3",
                section.columns === 1 && "grid-cols-1",
                section.columns === 2 && "grid-cols-1 md:grid-cols-2",
                section.columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              )}
            >
              <AnimatePresence>
                {section.fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <SortableFieldItem
                      field={field}
                      selectedField={selectedField}
                      onSelectField={onSelectField}
                      onDeleteField={onDeleteField}
                      onUpdateField={onUpdateField}
                      onDuplicateField={onDuplicateField}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
