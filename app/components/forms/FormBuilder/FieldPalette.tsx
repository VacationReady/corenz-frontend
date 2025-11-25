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

const GROUPS: { title: string; color: string; items: PaletteItem[] }[] = [
  {
    title: "Layout & Display",
    color: "from-violet-500 to-purple-600",
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
    color: "from-blue-500 to-indigo-600",
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
    color: "from-emerald-500 to-teal-600",
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
    color: "from-amber-500 to-orange-600",
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
    color: "from-rose-500 to-pink-600",
    items: [
      { type: "file", label: "File Upload", hint: "Single file", icon: Upload, defaults: { ...DEFAULT_FIELD_BASE } },
      { type: "attachmentGallery", label: "Attachment Gallery", hint: "Multiple files", icon: Images, defaults: { ...DEFAULT_FIELD_BASE, allowMultiple: true, maxEntries: 10 } },
      { type: "signature", label: "Signature", hint: "Type or draw a signature", icon: SignatureIcon, defaults: { ...DEFAULT_FIELD_BASE } },
    ],
  },
  {
    title: "Collections",
    color: "from-cyan-500 to-sky-600",
    items: [
      { type: "list", label: "List", hint: "Multiple text entries", icon: ListIcon, defaults: { ...DEFAULT_FIELD_BASE, allowMultiple: true, maxEntries: 20 } },
    ],
  },
  {
    title: "Computed & Read-only",
    color: "from-slate-500 to-gray-600",
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
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            className="pl-9 h-10 glass-subtle border-white/20 focus:border-primary/50 rounded-xl text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Groups */}
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 -mr-1">
          <AnimatePresence>
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.title);
              return (
                <motion.div 
                  key={group.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-left transition-all",
                      "bg-gradient-to-r bg-opacity-10 hover:bg-opacity-20",
                      isExpanded ? "rounded-t-xl" : "rounded-xl"
                    )}
                    style={{
                      background: `linear-gradient(to right, rgba(${group.color === 'from-violet-500 to-purple-600' ? '139, 92, 246' : 
                        group.color === 'from-blue-500 to-indigo-600' ? '59, 130, 246' :
                        group.color === 'from-emerald-500 to-teal-600' ? '16, 185, 129' :
                        group.color === 'from-amber-500 to-orange-600' ? '245, 158, 11' :
                        group.color === 'from-rose-500 to-pink-600' ? '244, 63, 94' :
                        group.color === 'from-cyan-500 to-sky-600' ? '6, 182, 212' :
                        '100, 116, 139'
                      }, 0.1) 0%, transparent 100%)`
                    }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                      {group.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{group.items.length}</span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-1.5 p-2 bg-white/30 rounded-b-xl">
                          {group.items.map((item, index) => (
                            <motion.div
                              key={`${group.title}-${item.type}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                            >
                              <DraggableField field={item} groupColor={group.color} />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground"
          >
            <p className="text-sm">No elements match your search</p>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

function DraggableField({
  field,
  groupColor,
}: {
  field: PaletteItem;
  groupColor: string;
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
        <motion.div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium",
            "bg-white/70 border border-white/40 hover:border-primary/30",
            "hover:bg-white hover:shadow-md transition-all duration-200",
            "select-none cursor-grab active:cursor-grabbing",
            isDragging && "ring-2 ring-primary/50 shadow-lg z-50"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-md bg-gradient-to-br text-white shadow-sm",
            groupColor
          )}>
            {field.icon ? <field.icon className="h-3.5 w-3.5" /> : null}
          </div>
          <span className="text-foreground/80 truncate">{field.label}</span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right" className="glass-premium text-xs max-w-[200px]">
        <p className="font-medium mb-0.5">{field.label}</p>
        <p className="text-muted-foreground">{field.hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}
