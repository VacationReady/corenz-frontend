"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Search, Sparkles, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface EnhancedStepPaletteProps {
  stepTypes: StepType[];
  onAddStep: (type: string) => void;
}

export function EnhancedStepPalette({ stepTypes, onAddStep }: EnhancedStepPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTypes = stepTypes.filter(
    (type) =>
      type.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category (we'll derive from color patterns)
  const categories = [
    { name: "Documents", types: filteredTypes.filter(t => t.label.includes("Document")) },
    { name: "Forms & Data", types: filteredTypes.filter(t => t.label.includes("Form") || t.label.includes("Survey") || t.label.includes("Payroll") || t.label.includes("Benefits")) },
    { name: "Onboarding Tasks", types: filteredTypes.filter(t => 
      t.label.includes("Training") || 
      t.label.includes("Check") || 
      t.label.includes("Equipment") || 
      t.label.includes("System") || 
      t.label.includes("Buddy") || 
      t.label.includes("Goals")
    )},
    { name: "Other", types: filteredTypes.filter(t => 
      t.label.includes("Instructions") || 
      t.label.includes("Journey") || 
      t.label.includes("Welcome")
    )},
  ].filter(c => c.types.length > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-4 border-b dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Step Library</h3>
            <p className="text-xs text-muted-foreground">Drag to add</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search steps..."
            className="pl-9 bg-slate-100 dark:bg-slate-800 border-0"
          />
        </div>
      </div>

      {/* Step List */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No steps match your search</p>
          </div>
        ) : searchQuery ? (
          <div className="space-y-2">
            {filteredTypes.map((type, index) => (
              <DraggableStepItem
                key={type.value}
                type={type}
                index={index}
                onAdd={() => onAddStep(type.value)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.name}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {category.name}
                </p>
                <div className="space-y-1.5">
                  {category.types.map((type, index) => (
                    <DraggableStepItem
                      key={type.value}
                      type={type}
                      index={index}
                      onAdd={() => onAddStep(type.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex-none px-4 py-3 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-xs text-center text-muted-foreground">
          💡 Tip: Click a step to add it, or drag it to a specific position
        </p>
      </div>
    </div>
  );
}

function DraggableStepItem({ 
  type, 
  index,
  onAdd 
}: { 
  type: StepType; 
  index: number;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-type-${type.value}`,
    data: { source: "step-palette", type: type.value, label: type.label },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = type.icon;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing",
        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        "hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:shadow-indigo-500/10",
        "transition-all duration-200",
        isDragging && "shadow-xl shadow-indigo-500/20 border-indigo-400 ring-2 ring-indigo-400/50"
      )}
    >
      {/* Drag Handle */}
      <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Icon */}
      <div className={cn(
        "flex-none w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
        type.color
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
          {type.label}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {type.description}
        </p>
      </div>

      {/* Hover indicator */}
      <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">+</span>
        </div>
      </div>
    </motion.div>
  );
}

export default EnhancedStepPalette;


