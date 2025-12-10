"use client";

import React, { useState, useEffect } from "react";
import { FormField, TableColumn, getFieldCapabilities } from "@/api/forms/[id]/types";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Plus, X, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoodIconPicker, MoodIcon } from "@/components/ui/MoodIconPicker";

export function FieldEditor({
  field,
  onChange,
  allFields = [],
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
  allFields?: FormField[];
}) {
  const [localOptions, setLocalOptions] = useState(
    field.options?.join("\n") || "",
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const labelInvalid = !field.label?.trim();
  const options = field.options || [];
  const hasOptionsError =
    (field.type === "select" ||
      field.type === "radio" ||
      field.type === "checkbox") &&
    options.length < 2;
  const capabilities = getFieldCapabilities(field.type);

  useEffect(() => {
    setLocalOptions(field.options?.join("\n") || "");
  }, [field.options]);

  const addOption = () => {
    const newOptions = [...options, `Option ${options.length + 1}`];
    onChange({ ...field, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange({ ...field, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange({ ...field, options: newOptions });
  };

  // Option items for chips/multiselect
  const optionItems = field.optionItems || [];

  const addOptionItem = () => {
    const newItems = [...optionItems, { label: `Option ${optionItems.length + 1}`, value: `option-${optionItems.length + 1}` }];
    onChange({ ...field, optionItems: newItems });
  };

  const removeOptionItem = (index: number) => {
    const newItems = optionItems.filter((_, i) => i !== index);
    onChange({ ...field, optionItems: newItems });
  };

  const updateOptionItem = (index: number, key: 'label' | 'value' | 'iconName', value: string | undefined) => {
    const newItems = [...optionItems];
    newItems[index] = { ...newItems[index], [key]: value };
    onChange({ ...field, optionItems: newItems });
  };

  // Get friendly type name
  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      text: "Text Input",
      textarea: "Text Area",
      email: "Email",
      phone: "Phone Number",
      number: "Number",
      date: "Date",
      time: "Time",
      select: "Dropdown",
      radio: "Radio Buttons",
      checkbox: "Checkboxes",
      chips: "Choice Buttons",
      multiselect: "Multi-select",
      switch: "Toggle",
      file: "File Upload",
      signature: "Signature",
      currency: "Currency",
      percentage: "Percentage",
      sectionHeader: "Section Header",
      description: "Description Text",
      divider: "Divider",
      computed: "Calculated Field",
      readOnly: "Read-only Field",
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
          {getTypeName(field.type)}
        </p>
      </div>

      {/* Essential Settings */}
      <div className="space-y-4">
        {/* Label - Always visible for non-layout fields */}
        {capabilities.supportsLabel && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Label <span className="text-red-500">*</span>
            </label>
            <Input
              value={field.label || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, label: e.target.value })}
              placeholder="What should this field be called?"
              className={cn(
                "bg-white border-slate-200",
                labelInvalid && "border-red-300 focus:border-red-400"
              )}
              autoFocus={!field.label}
            />
            {labelInvalid && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please enter a label
              </p>
            )}
          </div>
        )}

        {/* Help Text */}
        {capabilities.supportsHelpText && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Help text <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={field.helpText || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, helpText: e.target.value })}
              placeholder="Add guidance for filling this field"
              className="bg-white border-slate-200"
            />
          </div>
        )}

        {/* Placeholder */}
        {capabilities.supportsPlaceholder && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Placeholder <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={field.placeholder || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, placeholder: e.target.value })}
              placeholder="Example: Enter your name"
              className="bg-white border-slate-200"
            />
          </div>
        )}

        {/* Appearance selector for chips/multiselect */}
        {(field.type === "chips" || field.type === "multiselect") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Display Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...field, appearance: "buttons" })}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  field.appearance === "buttons"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                )}
              >
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 text-xs rounded bg-current/10">😀</span>
                  <span className="px-2 py-0.5 text-xs rounded bg-current/10">😐</span>
                </div>
                <span className="text-xs font-medium">Cards</span>
                <span className="text-[10px] text-slate-400">Best for surveys</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...field, appearance: "chips" })}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  (!field.appearance || field.appearance === "chips")
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                )}
              >
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-current/10">Tag</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-current/10">Tag</span>
                </div>
                <span className="text-xs font-medium">Pills</span>
                <span className="text-[10px] text-slate-400">Compact tags</span>
              </button>
            </div>
          </div>
        )}

        {/* Option items for chips/multiselect (with label + value) */}
        {(field.type === "chips" || field.type === "multiselect") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Options <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addOptionItem}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            {optionItems.length < 2 && (
              <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Add at least 2 options
              </p>
            )}

            <div className="space-y-2">
              {optionItems.map((item, index) => (
                <div key={index} className="p-2 bg-slate-50 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <MoodIconPicker
                      value={item.iconName}
                      onChange={(iconName) => updateOptionItem(index, 'iconName', iconName)}
                    />
                    <Input
                      value={item.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOptionItem(index, 'label', e.target.value)}
                      placeholder="Display text (e.g. Great)"
                      className="flex-1 h-8 bg-white border-slate-200 text-sm"
                    />
                    {optionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOptionItem(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Input
                    value={String(item.value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOptionItem(index, 'value', e.target.value)}
                    placeholder="Value (e.g. great)"
                    className="h-7 bg-white border-slate-200 text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            {optionItems.length === 0 && (
              <button
                type="button"
                onClick={addOptionItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors"
              >
                Click to add your first option
              </button>
            )}

            <p className="text-xs text-slate-400 mt-2">
              💡 Click the + button to add mood icons to your options
            </p>
          </div>
        )}

        {/* Options for select/radio/checkbox */}
        {capabilities.supportsOptions && (field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Options <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            {hasOptionsError && (
              <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Add at least 2 options
              </p>
            )}

            <div className="space-y-1.5">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    value={option}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 h-9 bg-white border-slate-200 text-sm"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length === 0 && (
              <button
                type="button"
                onClick={addOption}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors"
              >
                Click to add your first option
              </button>
            )}
          </div>
        )}

        {/* Multiple selection toggles for choice fields */}
        {(field.type === "checkbox" || field.type === "select") && (
          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id={`multiple-${field.id}`}
              checked={field.type === "checkbox" ? field.multiple !== false : field.multiple === true}
              onCheckedChange={(v: boolean) =>
                onChange({ ...field, multiple: Boolean(v) })
              }
            />
            <label
              htmlFor={`multiple-${field.id}`}
              className="text-sm text-slate-700 cursor-pointer select-none"
            >
              Allow multiple selections
            </label>
          </div>
        )}

        {/* Required toggle */}
        {capabilities.supportsRequiredToggle && (
          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(v: boolean) => onChange({ ...field, required: Boolean(v) })}
            />
            <label htmlFor={`required-${field.id}`} className="text-sm text-slate-700 cursor-pointer select-none">
              Required field
            </label>
          </div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      {(capabilities.supportsWidth || capabilities.supportsValidationTab || capabilities.supportsConditionalVisibility || capabilities.supportsCalculation) && (
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors w-full py-2"
          >
            <Settings2 className="h-4 w-4" />
            <span>Advanced settings</span>
            <ChevronDown className={cn(
              "h-4 w-4 ml-auto transition-transform",
              showAdvanced && "rotate-180"
            )} />
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-6 border-l-2 border-slate-100">
              {/* Width */}
              {capabilities.supportsWidth && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Field width
                  </label>
                  <select
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    value={field.width || "full"}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...field, width: e.target.value as "full" | "half" | "third" | "auto" })}
                  >
                    <option value="full">Full width</option>
                    <option value="half">Half width</option>
                    <option value="third">One-third width</option>
                  </select>
                </div>
              )}

              {/* Min/Max for numbers */}
              {capabilities.supportsMinMax && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Minimum
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.min ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, validation: { ...(field.validation || {}), min: Number(e.target.value) } })}
                      placeholder="No limit"
                      className="h-9 bg-white border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Maximum
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.max ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, validation: { ...(field.validation || {}), max: Number(e.target.value) } })}
                      placeholder="No limit"
                      className="h-9 bg-white border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Character limits for text */}
              {capabilities.supportsLength && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Min characters
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.minLength ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, validation: { ...(field.validation || {}), minLength: Number(e.target.value) } })}
                      placeholder="0"
                      className="h-9 bg-white border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Max characters
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.maxLength ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, validation: { ...(field.validation || {}), maxLength: Number(e.target.value) } })}
                      placeholder="Unlimited"
                      className="h-9 bg-white border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Conditional visibility */}
              {capabilities.supportsConditionalVisibility && allFields.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Show this field when...
                  </label>
                  <select
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    value={field.conditional?.field || ""}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      if (!e.target.value) {
                        onChange({ ...field, conditional: undefined });
                      } else {
                        onChange({ 
                          ...field, 
                          conditional: { 
                            field: e.target.value, 
                            operator: "equals", 
                            value: "" 
                          } 
                        });
                      }
                    }}
                  >
                    <option value="">Always visible</option>
                    {allFields
                      .filter(f => f.id !== field.id)
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.label || f.id} has a value
                        </option>
                      ))
                    }
                  </select>

                  {field.conditional?.field && (
                    <div className="mt-2 flex gap-2">
                      <select
                        className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                        value={field.conditional?.operator || "equals"}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ 
                          ...field, 
                          conditional: { 
                            ...(field.conditional || { field: "", value: "" }), 
                            operator: e.target.value as "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan"
                          } 
                        })}
                      >
                        <option value="equals">equals</option>
                        <option value="notEquals">does not equal</option>
                        <option value="contains">contains</option>
                      </select>
                      <Input
                        value={field.conditional?.value !== undefined ? String(field.conditional.value) : ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ 
                          ...field, 
                          conditional: { 
                            ...(field.conditional || { field: "", operator: "equals" }), 
                            value: e.target.value 
                          } 
                        })}
                        placeholder="value"
                        className="flex-1 h-9 bg-white border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Calculation for numeric fields */}
              {capabilities.supportsCalculation && (field.type === "currency" || field.type === "number" || field.type === "computed" || field.type === "percentage") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Calculate automatically
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id={`calc-${field.id}`}
                      checked={Boolean(field.calculationConfig?.expression)}
                      onCheckedChange={(v: boolean) => {
                        if (!v) {
                          onChange({ ...field, calculationConfig: undefined });
                        } else {
                          onChange({ 
                            ...field, 
                            calculationConfig: { 
                              expression: "", 
                              format: field.type === "currency" ? "currency" : "number", 
                              precision: 2 
                            } 
                          });
                        }
                      }}
                    />
                    <label htmlFor={`calc-${field.id}`} className="text-sm text-slate-600 cursor-pointer">
                      Calculate from other fields
                    </label>
                  </div>

                  {field.calculationConfig?.expression !== undefined && (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                      <Input
                        value={field.calculationConfig?.expression || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ 
                          ...field, 
                          calculationConfig: { 
                            ...(field.calculationConfig || { format: "number", precision: 2 }), 
                            expression: e.target.value 
                          } 
                        })}
                        placeholder="e.g. salary * 0.25"
                        className="h-9 bg-white border-slate-200 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500">
                        Use field IDs and math operators: + - * /
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Read-only toggle */}
              {capabilities.supportsReadOnlyToggle && (
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`readonly-${field.id}`}
                    checked={Boolean(field.readOnly)}
                    onCheckedChange={(v: boolean) => onChange({ ...field, readOnly: Boolean(v) })}
                  />
                  <label htmlFor={`readonly-${field.id}`} className="text-sm text-slate-600 cursor-pointer">
                    Make read-only (users cannot edit)
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table Column Configuration - Special handling */}
      {field.type === "table" && (
        <TableColumnEditor 
          field={field} 
          onChange={onChange} 
        />
      )}
    </div>
  );
}

// Separate component for table column editing
function TableColumnEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
}) {
  const columns = field.tableColumns || [];

  const addColumn = () => {
    const newColumn: TableColumn = {
      id: `col_${Date.now()}`,
      label: `Column ${columns.length + 1}`,
      type: "text",
      required: false,
    };
    onChange({ ...field, tableColumns: [...columns, newColumn] });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Table Columns
        </label>
        <button
          type="button"
          onClick={addColumn}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add column
        </button>
      </div>

      {columns.length === 0 ? (
        <button
          type="button"
          onClick={addColumn}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-slate-300 transition-colors"
        >
          Click to add your first column
        </button>
      ) : (
        <div className="space-y-2">
          {columns.map((column, index) => (
            <div key={column.id} className="p-3 bg-slate-50 rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  value={column.label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newColumns = [...columns];
                    newColumns[index] = { ...column, label: e.target.value };
                    onChange({ ...field, tableColumns: newColumns });
                  }}
                  placeholder="Column name"
                  className="flex-1 h-8 bg-white border-slate-200 text-sm"
                />
                <select
                  className="h-8 px-2 border border-slate-200 rounded-lg text-sm bg-white"
                  value={column.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const newColumns = [...columns];
                    newColumns[index] = { ...column, type: e.target.value as "text" | "number" | "date" | "select" };
                    onChange({ ...field, tableColumns: newColumns });
                  }}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newColumns = columns.filter((_, i) => i !== index);
                    onChange({ ...field, tableColumns: newColumns });
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {column.type === "select" && (
                <div className="pl-2 border-l-2 border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Dropdown options:</p>
                  <Textarea
                    value={(column.options || []).join("\n")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      const newColumns = [...columns];
                      newColumns[index] = { 
                        ...column, 
                        options: e.target.value.split("\n").filter(Boolean) 
                      };
                      onChange({ ...field, tableColumns: newColumns });
                    }}
                    placeholder="One option per line"
                    className="min-h-[60px] bg-white border-slate-200 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
