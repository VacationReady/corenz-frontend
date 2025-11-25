"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  Hash,
  ListChecks,
  CheckSquare,
  CaseSensitive,
  Upload,
  Table as TableIcon,
  List as ListIcon,
  ToggleLeft,
  Rows4,
  SlidersHorizontal,
  DollarSign,
  Percent,
  MapPin,
  Signature as SignatureIcon,
  Images,
  Eye,
  Calculator,
  Heading,
  Quote,
  Minus,
  PanelsTopLeft,
  ChevronDown,
  Search,
} from "lucide-react";
import { FieldType, FormField } from "@/api/forms/[id]/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";

type PaletteItem = {
  type: FieldType | string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  defaults?: Partial<FormField>;
};

const DEFAULT_FIELD_BASE: Partial<FormField> = {
  width: "full",
  inline: false,
  required: false,
  hidden: false,
};

const GROUPS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "Layout & Display",
    items: [
      {
        type: "sectionHeader",
        label: "Section Header",
        hint: "Large title to visually separate sections",
        icon: Heading,
        defaults: { ...DEFAULT_FIELD_BASE, label: "Section", placeholder: "" },
      },
      {
        type: "description",
        label: "Description",
        hint: "Helper text block between fields",
        icon: Quote,
        defaults: { ...DEFAULT_FIELD_BASE, label: "Description", placeholder: "Enter description..." },
      },
      {
        type: "divider",
        label: "Divider",
        hint: "Horizontal separator line",
        icon: Minus,
        defaults: { ...DEFAULT_FIELD_BASE, label: "Divider" },
      },
      {
        type: "pageBreak",
        label: "Page Break",
        hint: "Split long forms into pages",
        icon: PanelsTopLeft,
        defaults: { ...DEFAULT_FIELD_BASE, label: "Page Break" },
      },
    ],
  },
  {
    title: "Basic Inputs",
    items: [
      { type: "text", label: "Text", hint: "Single-line text input", icon: Type, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "Enter text" } },
      { type: "textarea", label: "Textarea", hint: "Multi-line text input", icon: AlignLeft, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "Enter details" } },
      { type: "email", label: "Email", hint: "Email address", icon: Mail, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "name@company.com", validation: { pattern: "^\\S+@\\S+\\.\\S+$" } } },
      { type: "phone", label: "Phone", hint: "Phone number", icon: Phone, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "+1 (555) 000-0000" } },
      { type: "number", label: "Number", hint: "Numeric input", icon: Hash, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "0" } },
      { type: "date", label: "Date", hint: "Date picker", icon: Calendar, defaults: { ...DEFAULT_FIELD_BASE } },
      { type: "time", label: "Time", hint: "Time picker", icon: Clock, defaults: { ...DEFAULT_FIELD_BASE } },
    ],
  },
  {
    title: "Choices",
    items: [
      { type: "select", label: "Dropdown", hint: "Single-select dropdown", icon: ListChecks, defaults: { ...DEFAULT_FIELD_BASE, options: ["Option 1", "Option 2"], appearance: "dropdown" } },
      { type: "radio", label: "Radio", hint: "Single-choice buttons", icon: CaseSensitive, defaults: { ...DEFAULT_FIELD_BASE, options: ["Option A", "Option B"], appearance: "buttons" } },
      { type: "checkbox", label: "Checkboxes", hint: "Multi-choice checkboxes", icon: CheckSquare, defaults: { ...DEFAULT_FIELD_BASE, options: ["Choice 1", "Choice 2"], multiple: true } },
      { type: "multiselect", label: "Multi-select", hint: "Choose multiple options", icon: Rows4, defaults: { ...DEFAULT_FIELD_BASE, optionItems: [{ label: "One", value: "one" }, { label: "Two", value: "two" }], multiple: true, appearance: "dropdown" } },
      { type: "chips", label: "Chips", hint: "Chip-style multi-select", icon: Rows4, defaults: { ...DEFAULT_FIELD_BASE, optionItems: [{ label: "A", value: "a" }, { label: "B", value: "b" }], multiple: true, appearance: "chips" } },
    ],
  },
  {
    title: "Advanced Inputs",
    items: [
      { type: "switch", label: "Toggle", hint: "On/off switch", icon: ToggleLeft, defaults: { ...DEFAULT_FIELD_BASE, defaultValue: false } },
      { type: "rating", label: "Rating", hint: "Star rating 1-5", icon: SlidersHorizontal, defaults: { ...DEFAULT_FIELD_BASE, validation: { min: 1, max: 5 }, defaultValue: 3 } },
      { type: "slider", label: "Slider", hint: "Range slider", icon: SlidersHorizontal, defaults: { ...DEFAULT_FIELD_BASE, validation: { min: 0, max: 100 }, defaultValue: 50 } },
      { type: "currency", label: "Currency", hint: "Money input", icon: DollarSign, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "$0.00" } },
      { type: "percentage", label: "Percentage", hint: "Percent input", icon: Percent, defaults: { ...DEFAULT_FIELD_BASE, placeholder: "0%" } },
      { type: "dateRange", label: "Date Range", hint: "Start and end dates", icon: Calendar, defaults: { ...DEFAULT_FIELD_BASE } },
      { type: "address", label: "Address", hint: "Structured address fields", icon: MapPin, defaults: { ...DEFAULT_FIELD_BASE, addressConfig: { fields: ["line1", "line2", "city", "state", "postalCode", "country"] } } },
    ],
  },
  {
    title: "Attachments",
    items: [
      { type: "file", label: "File Upload", hint: "Single file", icon: Upload, defaults: { ...DEFAULT_FIELD_BASE } },
      { type: "attachmentGallery", label: "Attachment Gallery", hint: "Multiple files", icon: Images, defaults: { ...DEFAULT_FIELD_BASE, allowMultiple: true, maxEntries: 10 } },
      { type: "signature", label: "Signature", hint: "Type or draw a signature", icon: SignatureIcon, defaults: { ...DEFAULT_FIELD_BASE } },
    ],
  },
  {
    title: "Collections",
    items: [
      { type: "list", label: "List", hint: "Multiple text entries", icon: ListIcon, defaults: { ...DEFAULT_FIELD_BASE, allowMultiple: true, maxEntries: 20 } },
    ],
  },
  {
    title: "Computed & Read-only",
    items: [
      { type: "computed", label: "Computed", hint: "Calculated value", icon: Calculator, defaults: { ...DEFAULT_FIELD_BASE, readOnly: true, calculationConfig: { expression: "fieldA + fieldB", dependsOn: ["fieldA", "fieldB"], format: "number", precision: 2 } } },
      { type: "readOnly", label: "Read-only", hint: "Non-editable field", icon: Eye, defaults: { ...DEFAULT_FIELD_BASE, readOnly: true } },
    ],
  },
];

export function FieldPalette() {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(GROUPS.map(g => g.title));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const filteredGroups = GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => 
      searchQuery === "" ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hint.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search elements..."
            className="pl-9 h-9 bg-white border-slate-200 focus:border-primary/50 rounded-lg text-sm"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Groups */}
        <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
          <AnimatePresence>
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.title);
              return (
                <motion.div 
                  key={group.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg overflow-hidden border border-slate-100"
                >
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-left",
                      "bg-slate-50 hover:bg-slate-100 transition-colors",
                      isExpanded ? "rounded-t-lg" : "rounded-lg"
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {group.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{group.items.length}</span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </motion.div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-1 p-1.5 bg-white">
                          {group.items.map((item, index) => (
                            <motion.div
                              key={`${group.title}-${item.type}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.01 }}
                            >
                              <DraggableField field={item} />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-6 text-slate-400">
            <p className="text-sm">No elements match your search</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function DraggableField({
  field,
}: {
  field: PaletteItem;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: field.type,
      data: { kind: "palette", ...field },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md text-xs font-medium",
            "bg-slate-50 border border-slate-100 hover:border-slate-200",
            "hover:bg-slate-100 transition-colors duration-150",
            "select-none cursor-grab active:cursor-grabbing",
            isDragging && "ring-2 ring-primary/50 shadow-md z-50 bg-white"
          )}
        >
          <div className="p-1 rounded bg-slate-200 text-slate-600">
            {field.icon ? <field.icon className="h-3.5 w-3.5" /> : null}
          </div>
          <span className="text-slate-700 truncate">{field.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-slate-900 text-white text-xs max-w-[200px]">
        <p className="font-medium mb-0.5">{field.label}</p>
        <p className="text-slate-300">{field.hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}
