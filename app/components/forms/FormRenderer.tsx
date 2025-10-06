"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

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
  optionItems?: Array<{ label: string; value: string }>;
  validation?: { required?: boolean };
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
  
  // Build all fields for validation
  const allFields: FormField[] = sections.flatMap(section => section.fields || []);
  
  // Build validation schema
  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};
    allFields.forEach((field) => {
      if (field.required || field.validation?.required) {
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
    defaultValues: allFields.reduce((acc, field) => {
      acc[field.id] = "";
      return acc;
    }, {} as Record<string, string>)
  });

  const watchedValues = useWatch({ control });

  const renderField = (field: FormField) => {
    const baseClasses = "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50";
    
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
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {option.label}
                        </span>
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
            {section.fields?.map((field) => (
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
            ))}
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
