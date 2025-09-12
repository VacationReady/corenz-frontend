"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export default function NewExitInterviewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Forms & Surveys', href: '/settings/forms' },
    { label: 'Exit Interview Forms', href: '/settings/forms/exit-interview' },
    { label: 'New Template', isCurrentPage: true }
  ]

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "",
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    const updatedFields = [...fields];
    if (!updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options = [];
    }
    updatedFields[fieldIndex].options!.push("");
    setFields(updatedFields);
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const updatedFields = [...fields];
    if (updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options![optionIndex] = value;
      setFields(updatedFields);
    }
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updatedFields = [...fields];
    if (updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options!.splice(optionIndex, 1);
      setFields(updatedFields);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        toast.error("All fields must have a label");
        return;
      }

      if (
        (field.type === "select" ||
          field.type === "checkbox" ||
          field.type === "radio") &&
        (!field.options || field.options.length === 0)
      ) {
        toast.error(`${field.label} must have at least one option`);
        return;
      }
    }

    try {
      setLoading(true);

      const schemaJson = {
        fields: fields.map((field) => ({
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
          name: formData.name,
          description: formData.description,
          schemaJson,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create template");
      }

      toast.success("Template created successfully");
      router.push("/settings/forms/exit-interview");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create template",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="New Exit Interview Template"
      description="Create a new exit interview form template"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Standard Exit Interview"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description of this template"
                rows={3}
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
              <div className="text-center py-8 text-gray-500">
                <p>No fields added yet. Click "Add Field" to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Field {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateField(index, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="checkbox">Checkboxes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Required</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Checkbox
                            id={`required-${index}`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(index, {
                                required: checked as boolean,
                              })
                            }
                          />
                          <Label
                            htmlFor={`required-${index}`}
                            className="text-sm"
                          >
                            Required field
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Field Label *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, { label: e.target.value })
                        }
                        placeholder="e.g., What is your reason for leaving?"
                        required
                      />
                    </div>

                    <div>
                      <Label>Placeholder (Optional)</Label>
                      <Input
                        value={field.placeholder || ""}
                        onChange={(e) =>
                          updateField(index, { placeholder: e.target.value })
                        }
                        placeholder="Placeholder text for this field"
                      />
                    </div>

                    {(field.type === "select" ||
                      field.type === "radio" ||
                      field.type === "checkbox") && (
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
                        <div className="space-y-2 mt-2">
                          {field.options?.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="flex items-center space-x-2"
                            >
                              <Input
                                value={option}
                                onChange={(e) =>
                                  updateOption(
                                    index,
                                    optionIndex,
                                    e.target.value,
                                  )
                                }
                                placeholder={`Option ${optionIndex + 1}`}
                                required
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
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/settings/forms/exit-interview")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Template
              </>
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
