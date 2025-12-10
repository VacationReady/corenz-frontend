"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { MoodIcon } from "@/components/ui/MoodIconPicker";

interface FormRendererProps {
  schema: any;
  onSubmit: (data: any) => void;
  submitLabel?: string;
  submitting?: boolean;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  appearance?: string;
  optionItems?: Array<{ label: string; value: string; iconName?: string }>;
  options?: string[];
  multiple?: boolean;
  validation?: { required?: boolean; min?: number; max?: number };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export function FormRenderer({ 
  schema, 
  onSubmit, 
  submitLabel = "Submit", 
  submitting = false 
}: FormRendererProps) {
  // Parse the schema to extract sections and fields
  const sections: FormSection[] = schema?.sections || [];
  
  // Build all interactive fields (exclude layout-only fields) for validation
  const allFields: FormField[] = sections.flatMap(section => section.fields || []);
  const inputFields: FormField[] = allFields.filter(
    (field) => !["sectionHeader", "description", "divider", "pageBreak"].includes(String(field.type)),
  );
  
  // Build validation schema
  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};
    inputFields.forEach((field) => {
      const isRequired = field.required || field.validation?.required;

      if (field.type === "checkbox") {
        // Single-select checkbox behaves like radio (string value)
        if (field.multiple === false) {
          if (isRequired) {
            shape[field.id] = z.string().min(1, `${field.label} is required`);
          } else {
            shape[field.id] = z.string().optional();
          }
          return;
        }

        // Multi-select checkbox can return arrays or strings depending on how RHF is wired
        if (isRequired) {
          shape[field.id] = z
            .any()
            .refine(
              (value) => {
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === "string") return value.trim().length > 0;
                return false;
              },
              `${field.label} is required`,
            );
        } else {
          shape[field.id] = z.any().optional();
        }
        return;
      }

      if (field.type === "select" && field.multiple) {
        // Multi-select dropdown returns array of values
        if (isRequired) {
          shape[field.id] = z
            .any()
            .refine(
              (value) => Array.isArray(value) && value.length > 0,
              `${field.label} is required`,
            );
        } else {
          shape[field.id] = z.any().optional();
        }
        return;
      }

      // Default to simple string validation for other field types
      if (isRequired) {
        shape[field.id] = z.string().min(1, `${field.label} is required`);
      } else {
        shape[field.id] = z.string().optional();
      }
    });
    return z.object(shape);
  };

  const formSchema = buildValidationSchema();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ 
    resolver: zodResolver(formSchema),
    defaultValues: inputFields.reduce((acc, field) => {
      if (field.type === "checkbox") {
        acc[field.id] = field.multiple === false ? "" : [];
      } else if (field.type === "select" && field.multiple) {
        acc[field.id] = [];
      } else {
        acc[field.id] = "";
      }
      return acc;
    }, {} as Record<string, any>)
  });

  const watchedValues = useWatch({ control });

  const renderField = (field: FormField) => {
    const baseClasses = "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50";
    const optionItems =
      field.optionItems ||
      (field.options || []).map((label) => ({ label, value: label }));
    
    switch (field.type) {
      case "chips":
        if (field.appearance === "buttons") {
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {field.optionItems?.map((option, index) => {
                  const isSelected = watchedValues[field.id] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register(field.id)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {option.iconName && (
                            <MoodIcon 
                              name={option.iconName} 
                              className={`h-5 w-5 ${
                                isSelected ? 'text-blue-600' : 'text-gray-500'
                              }`} 
                            />
                          )}
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {option.label}
                          </span>
                        </div>
                        <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }
        break;
      
      case "checkbox": {
        const isMultiple = field.multiple !== false;

        if (isMultiple) {
          return (
            <div className="space-y-2">
              {optionItems?.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer text-sm text-gray-900"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    {...register(field.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          );
        }

        // Single-select checkbox behaves like a radio group visually
        return (
          <div className="space-y-2">
            {optionItems?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-900"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register(field.id)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case "radio":
        return (
          <div className="space-y-2">
            {optionItems?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-900"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register(field.id)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "select": {
        const isMulti = field.multiple === true;
        return (
          <select
            className={baseClasses}
            defaultValue={isMulti ? undefined : ""}
            multiple={isMulti}
            {...register(field.id)}
          >
            {!isMulti && (
              <option value="" disabled>
                {field.placeholder || "Select an option"}
              </option>
            )}
            {optionItems?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }

      case "rating": {
        const min = field.validation?.min ?? 1;
        const max = field.validation?.max ?? 5;
        const current = watchedValues[field.id] || Math.round((min + max) / 2);
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              {...register(field.id)}
              className="w-full"
            />
            <span className="text-sm text-gray-700 w-8 text-right">
              {current}
            </span>
          </div>
        );
      }

      case "slider": {
        const min = field.validation?.min ?? 0;
        const max = field.validation?.max ?? 100;
        const current = watchedValues[field.id] || Math.round((min + max) / 2);
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={min}
              max={max}
              {...register(field.id)}
              className="w-full"
            />
            <span className="text-sm text-gray-700 w-10 text-right">
              {current}
            </span>
          </div>
        );
      }

      case "date":
        return (
          <Input
            type="date"
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );

      case "time":
        return (
          <Input
            type="time"
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );

      case "currency":
        return (
          <Input
            type="number"
            inputMode="decimal"
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );

      case "percentage":
        return (
          <Input
            type="number"
            inputMode="decimal"
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            className="min-h-[100px] resize-none"
            {...register(field.id)}
          />
        );

      case "text":
      case "email":
      default:
        return (
          <Input
            type={field.type === "email" ? "email" : "text"}
            placeholder={field.placeholder}
            {...register(field.id)}
          />
        );
    }
  };

  if (!sections.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No form fields available</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {sections.map((section) => (
        <div key={section.id} className="space-y-6">
          {/* Section Header */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {section.title}
            </h3>
            {section.description && (
              <p className="text-sm text-gray-600">
                {section.description}
              </p>
            )}
          </div>

          {/* Section Fields */}
          <div className="space-y-6">
            {section.fields?.map((field) => {
              const isLayoutOnly = [
                "sectionHeader",
                "description",
                "divider",
                "pageBreak",
              ].includes(String(field.type));

              if (isLayoutOnly) {
                return (
                  <div key={field.id} className="space-y-2">
                    {field.type === "sectionHeader" && (
                      <h4 className="text-base font-semibold text-gray-900">
                        {field.label}
                      </h4>
                    )}
                    {field.type === "description" && (
                      <p className="text-sm text-gray-600">
                        {field.helpText || field.placeholder || field.label}
                      </p>
                    )}
                    {field.type === "divider" && (
                      <div className="border-t border-gray-200" />
                    )}
                    {field.type === "pageBreak" && (
                      <div className="text-xs uppercase tracking-wide text-gray-400">
                        Page break
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    {field.label}
                    {(field.required || field.validation?.required) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {field.helpText && (
                    <p className="text-xs text-gray-500 mb-2">
                      {field.helpText}
                    </p>
                  )}

                  {renderField(field)}

                  {errors[field.id] && (
                    <p className="text-red-500 text-xs">
                      {errors[field.id]?.message as string}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Submit Button */}
      <div className="pt-6 border-t border-gray-200">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={submitting}
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
