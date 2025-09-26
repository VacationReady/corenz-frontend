"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
} from "lucide-react";
import { FieldType, FormField } from "@/api/forms/[id]/types";

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
      { type: "table", label: "Table", hint: "Tabular entries", icon: TableIcon, defaults: { ...DEFAULT_FIELD_BASE, tableColumns: [ { id: "col1", label: "Column 1", type: "text" }, { id: "col2", label: "Column 2", type: "number" } ], maxEntries: 50 } },
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
  return (
    <TooltipProvider>
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Field Types</h3>
        <div className="space-y-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {group.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <DraggableField key={`${group.title}-${item.type}`} field={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
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
      // Mark palette drags so the canvas can distinguish from sortable drags
      data: { kind: "palette", ...field },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
          className={`border rounded-md p-2 text-sm bg-white hover:bg-gray-50 select-none shadow-sm hover:shadow transition-shadow ${
            isDragging ? "ring-2 ring-blue-400" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {field.icon ? <field.icon className="h-4 w-4 text-gray-600" /> : null}
            <span>{field.label}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{field.hint}</TooltipContent>
    </Tooltip>
  );
}
