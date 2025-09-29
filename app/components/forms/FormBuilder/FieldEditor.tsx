"use client";

import { useState, useEffect } from "react";
import { FormField, TableColumn } from "@/api/forms/[id]/types";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function FieldEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
}) {
  const [localOptions, setLocalOptions] = useState(
    field.options?.join("\n") || "",
  );
  const labelInvalid = !field.label?.trim();
  const options = field.options || [];
  const hasOptionsError =
    (field.type === "select" ||
      field.type === "radio" ||
      field.type === "checkbox") &&
    options.length < 2;

  useEffect(() => {
    setLocalOptions(field.options?.join("\n") || "");
  }, [field.options]);

  const handleOptionsChange = (value: string) => {
    setLocalOptions(value);
    onChange({
      ...field,
      options: value
        .split("\n")
        .map((opt) => opt.trim())
        .filter(Boolean),
    });
  };

  const addOption = () => {
    const newOptions = [...options, ""];
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

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-md border shadow-sm">
      <div className="border-b pb-2 mb-2">
        <h3 className="font-semibold text-lg">Edit Field</h3>
        <p className="text-sm text-gray-600">Type: {field.type}</p>
      </div>

      <Tabs defaultValue="basics">
        <TabsList className="grid grid-cols-3 w-full mb-2">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <div className="text-xs text-gray-500 -mt-1 mb-2">Tip: Start with Basics for the label and help text. Use Data for options. Validation makes answers required.</div>

        <TabsContent value="basics">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline h-3.5 w-3.5 ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>What users will see as the question title.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Input
                value={field.label || ""}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                placeholder="Enter field label"
                className={labelInvalid ? "border-red-500 focus:ring-red-500" : ""}
                autoFocus={!field.label}
              />
              {labelInvalid && (
                <div className="flex items-center gap-2 text-xs text-red-500 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  Label is required
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Help text
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline h-3.5 w-3.5 ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>Short guidance shown under the label.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Textarea
                value={field.helpText || ""}
                onChange={(e) => onChange({ ...field, helpText: e.target.value })}
                placeholder="Shown below the label as guidance"
                className="min-h-[60px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <Input
                value={field.placeholder || ""}
                onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                placeholder="e.g. Enter your name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline h-3.5 w-3.5 ml-1 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>Controls how wide the field is within a row.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <select
                  className="border rounded w-full px-2 py-2 text-sm"
                  value={field.width || "full"}
                  onChange={(e) => onChange({ ...field, width: e.target.value as any })}
                >
                  <option value="full">Full</option>
                  <option value="half">Half</option>
                  <option value="third">Third</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox
                  id={`inline-${field.id}`}
                  checked={Boolean(field.inline)}
                  onCheckedChange={(v) => onChange({ ...field, inline: Boolean(v) })}
                />
                <label htmlFor={`inline-${field.id}`} className="text-sm">Inline layout</label>
              </div>
            </div>

            {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Options <span className="text-red-500">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="inline h-3.5 w-3.5 ml-1 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>Choices a user can pick from.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <Button type="button" onClick={addOption} size="sm" variant="outline" className="h-8 px-2">
                    <Plus className="h-4 w-4 mr-1" /> Add Option
                  </Button>
                </div>

                {hasOptionsError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mb-2">
                    <AlertCircle className="h-4 w-4" /> At least 2 options are required
                  </div>
                )}

                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      {options.length > 1 && (
                        <Button type="button" onClick={() => removeOption(index)} size="sm" variant="outline" className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length === 0 && (
                  <Button type="button" onClick={addOption} variant="outline" className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" /> Add First Option
                  </Button>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bulk Edit Options
                  </label>
                  <Textarea
                    value={localOptions}
                    onChange={(e) => handleOptionsChange(e.target.value)}
                    placeholder="One option per line"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })}
              />
              <label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer select-none">Required field</label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="validation">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min</label>
                <Input
                  type="number"
                  value={field.validation?.min ?? ""}
                  onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), min: Number(e.target.value) } })}
                  placeholder="e.g. 0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max</label>
                <Input
                  type="number"
                  value={field.validation?.max ?? ""}
                  onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), max: Number(e.target.value) } })}
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min length</label>
                <Input
                  type="number"
                  value={field.validation?.minLength ?? ""}
                  onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), minLength: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max length</label>
                <Input
                  type="number"
                  value={field.validation?.maxLength ?? ""}
                  onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), maxLength: Number(e.target.value) } })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regex pattern</label>
              <Input
                value={field.validation?.pattern || ""}
                onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), pattern: e.target.value } })}
                placeholder="e.g. ^[A-Za-z0-9]+$"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pattern message</label>
              <Input
                value={field.validation?.patternMessage || ""}
                onChange={(e) => onChange({ ...field, validation: { ...(field.validation || {}), patternMessage: e.target.value } })}
                placeholder="Shown when regex is not matched"
              />
            </div>
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data">
          <div className="space-y-4">
            {/* Appearance & Multiple */}
            {(field.type === "select" || field.type === "multiselect" || field.type === "chips" || field.type === "radio" || field.type === "checkbox") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
                  <select
                    className="border rounded w-full px-2 py-2 text-sm"
                    value={field.appearance || "dropdown"}
                    onChange={(e) => onChange({ ...field, appearance: e.target.value as any })}
                  >
                    <option value="dropdown">Dropdown</option>
                    <option value="chips">Chips</option>
                    <option value="buttons">Buttons</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox
                    id={`multiple-${field.id}`}
                    checked={Boolean(field.multiple)}
                    onCheckedChange={(v) => onChange({ ...field, multiple: Boolean(v) })}
                  />
                  <label htmlFor={`multiple-${field.id}`} className="text-sm">Allow multiple</label>
                </div>
              </div>
            )}

            {/* Options Source */}
            {(field.type === "select" || field.type === "multiselect" || field.type === "chips" || field.type === "radio" || field.type === "checkbox") && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Options Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      className="border rounded w-full px-2 py-2 text-sm"
                      value={field.optionsSource?.type || "static"}
                      onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || {}), type: e.target.value as any } })}
                    >
                      <option value="static">Static</option>
                      <option value="api">API</option>
                      <option value="hrField">HR Field</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {(!field.optionsSource || field.optionsSource.type === "static") && (
                  <div className="text-xs text-gray-500">Using static options configured in Basics.</div>
                )}

                {field.optionsSource?.type === "api" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <Input
                        value={field.optionsSource?.url || ""}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), url: e.target.value } })}
                        placeholder="https://api.example.com/options"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                      <select
                        className="border rounded w-full px-2 py-2 text-sm"
                        value={field.optionsSource?.method || "GET"}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), method: e.target.value as any } })}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label field</label>
                      <Input
                        value={field.optionsSource?.labelField || ""}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), labelField: e.target.value } })}
                        placeholder="e.g. name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value field</label>
                      <Input
                        value={field.optionsSource?.valueField || ""}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), valueField: e.target.value } })}
                        placeholder="e.g. id"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Depends on (comma separated field IDs)</label>
                      <Input
                        value={(field.optionsSource?.dependsOn || []).join(",")}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), dependsOn: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                        placeholder="fieldA, fieldB"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cache TTL (sec)</label>
                      <Input
                        type="number"
                        value={field.optionsSource?.cacheTtlSeconds ?? ""}
                        onChange={(e) => onChange({ ...field, optionsSource: { ...(field.optionsSource || { type: "api" }), cacheTtlSeconds: Number(e.target.value) || 0 } })}
                        placeholder="e.g. 300"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table/List column builder */}
            {(field.type === "table") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Table Columns</label>
                  <Button type="button" size="sm" variant="outline" className="h-8 px-2"
                    onClick={() => onChange({ ...field, tableColumns: [ ...(field.tableColumns || []), { id: `col${(field.tableColumns?.length || 0) + 1}`, label: "Column", type: "text" } as TableColumn ] })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Column
                  </Button>
                </div>
                <div className="space-y-2">
                  {(field.tableColumns || []).map((col, idx) => (
                    <div key={col.id || idx} className="grid grid-cols-5 gap-2 items-center">
                      <Input
                        value={col.label}
                        onChange={(e) => {
                          const cols = [...(field.tableColumns || [])];
                          cols[idx] = { ...cols[idx], label: e.target.value };
                          onChange({ ...field, tableColumns: cols });
                        }}
                        placeholder="Label"
                      />
                      <select
                        className="border rounded px-2 py-2 text-sm"
                        value={col.type}
                        onChange={(e) => {
                          const cols = [...(field.tableColumns || [])];
                          cols[idx] = { ...cols[idx], type: e.target.value as any };
                          onChange({ ...field, tableColumns: cols });
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                      </select>
                      <Input
                        value={(col.options || []).join(",")}
                        onChange={(e) => {
                          const cols = [...(field.tableColumns || [])];
                          cols[idx] = { ...cols[idx], options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) };
                          onChange({ ...field, tableColumns: cols });
                        }}
                        placeholder="Options (csv)"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`col-req-${idx}`}
                          checked={Boolean(col.required)}
                          onCheckedChange={(v) => {
                            const cols = [...(field.tableColumns || [])];
                            cols[idx] = { ...cols[idx], required: Boolean(v) };
                            onChange({ ...field, tableColumns: cols });
                          }}
                        />
                        <label htmlFor={`col-req-${idx}`} className="text-xs">Required</label>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => {
                        const cols = (field.tableColumns || []).filter((_, i) => i !== idx);
                        onChange({ ...field, tableColumns: cols });
                      }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation */}
            {(field.type === "computed" || field.calculation || field.calculationConfig) && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Calculation</label>
                <Input
                  value={field.calculationConfig?.expression || field.calculation || ""}
                  onChange={(e) => onChange({ ...field, calculationConfig: { ...(field.calculationConfig || {}), expression: e.target.value } })}
                  placeholder="e.g. baseSalary * 0.1"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      className="border rounded w-full px-2 py-2 text-sm"
                      value={field.calculationConfig?.format || "number"}
                      onChange={(e) =>
                        onChange({
                          ...field,
                          calculationConfig: {
                            expression: field.calculationConfig?.expression || field.calculation || "",
                            ...(field.calculationConfig || {}),
                            format: e.target.value as any,
                          },
                        })
                      }
                    >
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precision</label>
                    <Input
                      type="number"
                      value={field.calculationConfig?.precision ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...field,
                          calculationConfig: {
                            expression: field.calculationConfig?.expression || field.calculation || "",
                            ...(field.calculationConfig || {}),
                            precision: Number(e.target.value),
                          },
                        })
                      }
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Logic UI removed */}
      </Tabs>
    </div>
  );
}
