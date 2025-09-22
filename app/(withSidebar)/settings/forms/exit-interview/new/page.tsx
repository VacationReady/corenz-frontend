"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { FormActionBar } from "@/components/forms/FormActionBar";

interface TemplateField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options: string[];
}

interface ExitInterviewTemplateFormValues {
  name: string;
  description: string;
  fields: TemplateField[];
}

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
];

export default function NewExitInterviewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ExitInterviewTemplateFormValues>({
    defaultValues: {
      name: "",
      description: "",
      fields: [],
    },
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  const breadcrumbItems = [
    { label: "Settings", href: "/settings" },
    { label: "Forms & Surveys", href: "/settings/forms" },
    { label: "Exit Interview Forms", href: "/settings/forms/exit-interview" },
    { label: "New Template", isCurrentPage: true },
  ];

  const addField = () => {
    append(
      {
        id: `field_${Date.now()}`,
        type: "text",
        label: "",
        required: false,
        placeholder: "",
        options: [],
      },
      { shouldDirty: true },
    );
  };

  const addOption = (fieldIndex: number) => {
    const currentOptions = watch(`fields.${fieldIndex}.options`) || [];
    setValue(
      `fields.${fieldIndex}.options`,
      [...currentOptions, ""],
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = watch(`fields.${fieldIndex}.options`) || [];
    setValue(
      `fields.${fieldIndex}.options`,
      currentOptions.filter((_, i) => i !== optionIndex),
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!values.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (values.fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    for (const field of values.fields) {
      if (!field.label.trim()) {
        toast.error("All fields must have a label");
        return;
      }

      if (
        (field.type === "select" || field.type === "checkbox" || field.type === "radio") &&
        (!field.options || field.options.filter((opt) => opt.trim() !== "").length === 0)
      ) {
        toast.error(`${field.label || "This field"} must have at least one option`);
        return;
      }
    }

    try {
      setLoading(true);

      const schemaJson = {
        fields: values.fields.map((field) => ({
          ...field,
          options: field.options?.filter((opt) => opt.trim() !== ""),
        })),
      };

      const response = await fetch("/api/exit-interview-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          schemaJson,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to create template");
      }

      toast.success("Template created successfully");
      router.push("/settings/forms/exit-interview");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormProvider {...form}>
      <PageShell
        title="New Exit Interview Template"
        description="Create a new exit interview form template"
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
      >
        <form onSubmit={onSubmit} className="space-y-6 pb-32">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Standard Exit Interview"
                  {...register("name", { required: "Template name is required" })}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Optional description of this template"
                  {...register("description")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Form Fields
                <Button type="button" onClick={addField} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>No fields added yet. Click "Add Field" to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {fields.map((field, index) => {
                    const options = watch(`fields.${index}.options`) || [];
                    const type = watch(`fields.${index}.type`);
                    return (
                      <div key={field.id} className="space-y-4 rounded-lg border p-4">
                        <input type="hidden" {...register(`fields.${index}.id`)} defaultValue={field.id} />
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Field {index + 1}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label>Field Type</Label>
                            <Controller
                              control={control}
                              name={`fields.${index}.type`}
                              defaultValue={field.type}
                              render={({ field: controllerField }) => (
                                <Select
                                  value={controllerField.value}
                                  onValueChange={(value) => controllerField.onChange(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a field type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div>
                            <Label>Required</Label>
                            <div className="mt-2 flex items-center space-x-2">
                              <Controller
                                control={control}
                                name={`fields.${index}.required`}
                                defaultValue={field.required}
                                render={({ field: controllerField }) => (
                                  <Checkbox
                                    id={`required-${field.id}`}
                                    checked={controllerField.value}
                                    onCheckedChange={(checked) => controllerField.onChange(Boolean(checked))}
                                  />
                                )}
                              />
                              <Label htmlFor={`required-${field.id}`} className="text-sm">
                                Required field
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`label-${field.id}`}>Field Label *</Label>
                          <Input
                            id={`label-${field.id}`}
                            placeholder="e.g., What is your reason for leaving?"
                            defaultValue={field.label}
                            {...register(`fields.${index}.label`, { required: true })}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`placeholder-${field.id}`}>Placeholder (Optional)</Label>
                          <Input
                            id={`placeholder-${field.id}`}
                            placeholder="Placeholder text for this field"
                            defaultValue={field.placeholder}
                            {...register(`fields.${index}.placeholder`)}
                          />
                        </div>

                        {(type === "select" || type === "radio" || type === "checkbox") && (
                          <div>
                            <Label className="flex items-center justify-between">
                              Options *
                              <Button
                                type="button"
                                onClick={() => addOption(index)}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="mr-2 h-3 w-3" />
                                Add Option
                              </Button>
                            </Label>
                            <div className="mt-2 space-y-2">
                              {options.map((_, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <Input
                                    placeholder={`Option ${optionIndex + 1}`}
                                    defaultValue={options[optionIndex]}
                                    {...register(`fields.${index}.options.${optionIndex}`, { required: true })}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeOption(index, optionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {options.length === 0 && (
                                <p className="text-sm text-muted-foreground">Add at least one option.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <FormActionBar containerClassName="px-4 sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/forms/exit-interview")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Template
                </>
              )}
            </Button>
          </FormActionBar>
        </form>
      </PageShell>
    </FormProvider>
  );
}
