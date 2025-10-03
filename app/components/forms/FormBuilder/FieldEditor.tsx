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
  allFields = [],
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
  allFields?: FormField[];
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
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>
        <div className="text-xs text-gray-500 -mt-1 mb-2">Tip: Start with Basics for the label and help text. Use Conditions for calculations and logic. Validation makes answers required.</div>

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

            {/* Table Column Configuration */}
            {field.type === "table" && (
              <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      📊 Table Columns <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Configure the columns for your table
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => {
                      const columns = field.tableColumns || [];
                      const newColumn: TableColumn = {
                        id: `col_${Date.now()}`,
                        label: `Column ${columns.length + 1}`,
                        type: "text",
                        required: false,
                      };
                      onChange({ ...field, tableColumns: [...columns, newColumn] });
                    }} 
                    size="sm" 
                    variant="primary"
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Column
                  </Button>
                </div>

                {(!field.tableColumns || field.tableColumns.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-white rounded border-2 border-dashed">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-60" />
                    <p className="text-sm italic">No columns yet. Click "Add Column" to start.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {field.tableColumns?.map((column, colIndex) => (
                    <div key={column.id} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Column Label <span className="text-red-500">*</span>
                              </label>
                              <Input
                                value={column.label}
                                onChange={(e) => {
                                  const newColumns = [...(field.tableColumns || [])];
                                  newColumns[colIndex] = { ...column, label: e.target.value };
                                  onChange({ ...field, tableColumns: newColumns });
                                }}
                                placeholder="e.g. Course Name"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Column Type
                              </label>
                              <select
                                className="border rounded w-full px-2 py-2 text-sm"
                                value={column.type}
                                onChange={(e) => {
                                  const newColumns = [...(field.tableColumns || [])];
                                  newColumns[colIndex] = { 
                                    ...column, 
                                    type: e.target.value as any,
                                    // Clear options if switching away from select
                                    options: e.target.value === "select" ? column.options : undefined
                                  };
                                  onChange({ ...field, tableColumns: newColumns });
                                }}
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="select">Dropdown</option>
                              </select>
                            </div>
                          </div>

                          {/* Options for select type columns */}
                          {column.type === "select" && (
                            <div className="pl-2 border-l-2 border-blue-300">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Dropdown Options <span className="text-red-500">*</span>
                              </label>
                              <div className="space-y-2">
                                {(column.options || []).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newColumns = [...(field.tableColumns || [])];
                                        const newOptions = [...(column.options || [])];
                                        newOptions[optIndex] = e.target.value;
                                        newColumns[colIndex] = { ...column, options: newOptions };
                                        onChange({ ...field, tableColumns: newColumns });
                                      }}
                                      placeholder={`Option ${optIndex + 1}`}
                                      className="flex-1 text-sm"
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        const newColumns = [...(field.tableColumns || [])];
                                        const newOptions = (column.options || []).filter((_, i) => i !== optIndex);
                                        newColumns[colIndex] = { ...column, options: newOptions };
                                        onChange({ ...field, tableColumns: newColumns });
                                      }}
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-red-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  onClick={() => {
                                    const newColumns = [...(field.tableColumns || [])];
                                    const newOptions = [...(column.options || []), ""];
                                    newColumns[colIndex] = { ...column, options: newOptions };
                                    onChange({ ...field, tableColumns: newColumns });
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Option
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`col-required-${column.id}`}
                              checked={Boolean(column.required)}
                              onCheckedChange={(v) => {
                                const newColumns = [...(field.tableColumns || [])];
                                newColumns[colIndex] = { ...column, required: Boolean(v) };
                                onChange({ ...field, tableColumns: newColumns });
                              }}
                            />
                            <label htmlFor={`col-required-${column.id}`} className="text-xs cursor-pointer">
                              Required column
                            </label>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            const newColumns = (field.tableColumns || []).filter((_, i) => i !== colIndex);
                            onChange({ ...field, tableColumns: newColumns });
                          }}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Max entries configuration */}
                <div className="pt-3 border-t border-blue-300">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Maximum Rows (optional)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={field.maxEntries ?? 50}
                    onChange={(e) => onChange({ ...field, maxEntries: Number(e.target.value) || 50 })}
                    placeholder="50"
                    className="w-32 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Limit how many rows users can add to the table
                  </p>
                </div>
              </div>
            )}

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

        {/* Conditions Tab */}
        <TabsContent value="conditions">
          <div className="space-y-6">
            {/* Calculation - for currency, number, and computed fields */}
            {(field.type === "currency" || field.type === "number" || field.type === "computed" || field.type === "percentage") && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      id={`enable-calc-${field.id}`}
                      checked={Boolean(field.calculationConfig?.expression || field.calculation)}
                      onCheckedChange={(v) => {
                        if (!v) {
                          onChange({ ...field, calculationConfig: undefined, calculation: undefined });
                        } else {
                          onChange({ ...field, calculationConfig: { expression: "", format: field.type === "currency" ? "currency" : "number", precision: field.type === "currency" ? 2 : 0 } });
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor={`enable-calc-${field.id}`} className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                        🧮 Calculate this field automatically
                      </label>
                      <p className="text-sm text-gray-600">
                        Automatically calculate this value based on other fields in the form
                      </p>
                    </div>
                  </div>
                  
                  {(field.calculationConfig?.expression || field.calculation) && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-blue-200">
                      <div className="bg-white rounded-lg p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-3">
                            What do you want to calculate?
                          </label>
                          
                          {/* Simple calculation builder */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="font-medium">Take</span>
                              <Input
                                type="number"
                                placeholder="25"
                                className="w-20 text-center"
                                value={(() => {
                                  // Extract the decimal multiplier and convert back to percentage
                                  const match = field.calculationConfig?.expression?.match(/\*\s*([0-9.]+)/) || 
                                               field.calculationConfig?.expression?.match(/([0-9.]+)\s*\*/);
                                  if (match?.[1]) {
                                    const decimal = parseFloat(match[1]);
                                    return (decimal * 100).toString();
                                  }
                                  return "";
                                })()}
                                onChange={(e) => {
                                  const percentageInput = e.target.value;
                                  if (!percentageInput) return;
                                  
                                  const percentage = parseFloat(percentageInput);
                                  const decimal = percentage / 100;
                                  
                                  const sourceField = allFields.find(f => 
                                    field.calculationConfig?.expression?.includes(f.id)
                                  )?.id || "";
                                  
                                  if (sourceField) {
                                    onChange({
                                      ...field,
                                      calculationConfig: {
                                        ...(field.calculationConfig || { format: "currency", precision: 2 }),
                                        expression: `${sourceField} * ${decimal}`,
                                      },
                                    });
                                  }
                                }}
                              />
                              <span className="font-medium">% of</span>
                            </div>
                            
                            <select
                              className="w-full border-2 rounded-lg px-4 py-3 text-sm font-medium"
                              value={allFields.find(f => field.calculationConfig?.expression?.includes(f.id))?.id || ""}
                              onChange={(e) => {
                                const selectedFieldId = e.target.value;
                                const currentPercentage = field.calculationConfig?.expression?.match(/\*\s*([0-9.]+)/)?.[1] || "0.25";
                                onChange({
                                  ...field,
                                  calculationConfig: {
                                    ...(field.calculationConfig || { format: "currency", precision: 2 }),
                                    expression: selectedFieldId ? `${selectedFieldId} * ${currentPercentage}` : "",
                                  },
                                });
                              }}
                            >
                              <option value="">Select a field...</option>
                              {allFields
                                .filter(f => 
                                  f.id !== field.id && 
                                  (f.type === "currency" || f.type === "number" || f.type === "computed")
                                )
                                .map(f => (
                                  <option key={f.id} value={f.id}>
                                    {f.label || f.id}
                                  </option>
                                ))
                              }
                            </select>
                          </div>

                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                              <strong>💡 Example:</strong> If you select "Revenue Billed" and enter 25%, 
                              this field will automatically show 25% of whatever value is in the Revenue Billed field.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Display as</label>
                            <select
                              className="border-2 rounded-lg w-full px-3 py-2.5 text-sm"
                              value={field.calculationConfig?.format || (field.type === "currency" ? "currency" : "number")}
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
                              <option value="currency">💰 Currency ($)</option>
                              <option value="number">🔢 Number</option>
                              <option value="percentage">📊 Percentage (%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Decimal places</label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={field.calculationConfig?.precision ?? (field.type === "currency" ? 2 : 0)}
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
                              placeholder="2"
                              className="text-center"
                            />
                          </div>
                        </div>

                        {/* Advanced expression editor */}
                        <details className="pt-4 border-t">
                          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                            ⚙️ Advanced: Write custom formula
                          </summary>
                          <div className="mt-3 space-y-2">
                            <Input
                              value={field.calculationConfig?.expression || field.calculation || ""}
                              onChange={(e) => onChange({ ...field, calculationConfig: { ...(field.calculationConfig || {}), expression: e.target.value } })}
                              placeholder="e.g. hoursWorked * 12.07 / 100"
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500">
                              Use field names and math operators: + (add), - (subtract), * (multiply), / (divide)
                            </p>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conditional Logic */}
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-semibold text-gray-900">
                👁️ Show/Hide this field conditionally
              </label>
              <p className="text-sm text-gray-600 -mt-2">Only show this field when certain conditions are met</p>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">When this field</label>
                  <select
                    className="border-2 rounded-lg w-full px-3 py-2 text-sm"
                    value={field.conditional?.field || ""}
                    onChange={(e) => onChange({ ...field, conditional: { ...(field.conditional || { operator: "equals", value: "" }), field: e.target.value } })}
                  >
                    <option value="">Always show this field</option>
                    {allFields
                      .filter(f => f.id !== field.id)
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.label || f.id}
                        </option>
                      ))
                    }
                  </select>
                </div>
                
                {field.conditional?.field && (
                  <>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Is</label>
                      <select
                        className="border-2 rounded-lg w-full px-3 py-2 text-sm"
                        value={field.conditional?.operator || "equals"}
                        onChange={(e) => onChange({ ...field, conditional: { ...(field.conditional || { field: "", value: "" }), operator: e.target.value as any } })}
                      >
                        <option value="equals">Equal to</option>
                        <option value="notEquals">Not equal to</option>
                        <option value="contains">Contains</option>
                        <option value="greaterThan">Greater than</option>
                        <option value="lessThan">Less than</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">This value</label>
                      <Input
                        value={field.conditional?.value !== undefined ? String(field.conditional.value) : ""}
                        onChange={(e) => onChange({ ...field, conditional: { ...(field.conditional || { field: "", operator: "equals" }), value: e.target.value } })}
                        placeholder="Enter value"
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Read-only option */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Checkbox
                id={`readonly-${field.id}`}
                checked={Boolean(field.readOnly)}
                onCheckedChange={(v) => onChange({ ...field, readOnly: Boolean(v) })}
              />
              <div>
                <label htmlFor={`readonly-${field.id}`} className="text-sm font-medium cursor-pointer block">
                  🔒 Make this field read-only
                </label>
                <p className="text-xs text-gray-500">Users can see the value but cannot edit it</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
