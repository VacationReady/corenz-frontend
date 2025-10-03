/**
 * AI-Powered Custom Field Generator
 * Adds custom fields to forms without database migrations
 */

import { openai, AI_CONFIG } from "./openai-client";
import { prisma } from "@/lib/prisma";

export interface FieldGenerationResult {
  success: boolean;
  field?: {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: { value: string; label: string }[];
    validation?: any;
  };
  formId?: string;
  message?: string;
  error?: string;
}

// Available field types
const FIELD_TYPES = [
  { value: "text", label: "Text Input", description: "Single line text" },
  { value: "textarea", label: "Text Area", description: "Multi-line text" },
  { value: "number", label: "Number", description: "Numeric input" },
  { value: "email", label: "Email", description: "Email address" },
  { value: "phone", label: "Phone", description: "Phone number" },
  { value: "date", label: "Date", description: "Date picker" },
  { value: "select", label: "Dropdown", description: "Single selection" },
  { value: "multiselect", label: "Multi-select", description: "Multiple selections" },
  { value: "checkbox", label: "Checkbox", description: "Yes/No toggle" },
  { value: "radio", label: "Radio Buttons", description: "Single choice from options" },
  { value: "file", label: "File Upload", description: "Document/image upload" },
];

export async function generateCustomField(
  fieldDescription: string,
  section: "personal-information" | "bank-payroll" | "emergency-contacts" | "custom",
  companyId: string
): Promise<FieldGenerationResult> {
  try {
    // Step 1: AI determines field properties
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are a form field designer. Convert user requests into structured form field definitions.

Available field types:
${FIELD_TYPES.map((f) => `- ${f.value}: ${f.description}`).join("\n")}

Rules:
1. Choose the most appropriate field type
2. Generate clear labels and placeholders
3. For select/multiselect/radio, provide relevant options
4. Add validation rules where appropriate
5. Keep it user-friendly`,
        },
        {
          role: "user",
          content: `Create a form field for: "${fieldDescription}"

Respond with JSON:
{
  "label": "Field label (user-friendly)",
  "type": "field type from available types",
  "placeholder": "example text if applicable",
  "options": [{"value": "...", "label": "..."}] (if select/radio/multiselect),
  "validation": {
    "required": true/false,
    "minLength": number (if text),
    "maxLength": number (if text),
    "min": number (if number),
    "max": number (if number),
    "pattern": "regex" (if specific format)
  }
}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const fieldDef = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Step 2: Find or create the form for this section
    const formSlug = section === "custom" ? "custom-fields" : section;
    let form = await prisma.form.findFirst({
      where: {
        companyId,
        slug: formSlug,
        formType: "DATA_SCREEN",
      },
    });

    // Create form if it doesn't exist (for custom, personal-information, bank-payroll, emergency-contacts)
    if (!form && (section === "custom" || section === "personal-information" || section === "bank-payroll" || section === "emergency-contacts")) {
      const formConfig = {
        "custom": {
          name: "Custom Fields",
          slug: "custom-fields",
          description: "Additional custom employee information",
        },
        "personal-information": {
          name: "Personal Details (Custom)",
          slug: "personal-information-custom",
          description: "Extended personal information fields",
        },
        "bank-payroll": {
          name: "Bank & Payroll (Custom)",
          slug: "bank-payroll-custom",
          description: "Extended bank and payroll fields",
        },
        "emergency-contacts": {
          name: "Emergency Contacts (Custom)",
          slug: "emergency-contacts-custom",
          description: "Extended emergency contact fields",
        },
      };

      const config = formConfig[section as keyof typeof formConfig];
      
      form = await prisma.form.create({
        data: {
          id: `form-${section}-${Date.now()}`,
          companyId,
          name: config.name,
          slug: config.slug,
          description: config.description,
          formType: "DATA_SCREEN",
          schema: {
            sections: [
              {
                id: section,
                title: config.name.replace(" (Custom)", ""),
                columns: 1,
                layout: "single",
                hidden: false,
                fields: [],
              },
            ],
          },
          isActive: true,
          visibleToRoles: [], // Empty = visible to all
          visibleToDepartments: [],
          visibleToJobRoles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    if (!form) {
      return {
        success: false,
        error: `Form for section "${section}" not found. Try creating a new form first, or add to "Custom Fields" instead.`,
      };
    }

    // Step 3: Add field to form definition
    const updatedDefinition = form.schema as any;
    const newField = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...fieldDef,
      custom: true, // Mark as custom field
    };

    // Handle sections-based schema (new format)
    if (updatedDefinition.sections && Array.isArray(updatedDefinition.sections)) {
      // Find the first section or create one
      if (updatedDefinition.sections.length === 0) {
        updatedDefinition.sections.push({
          id: section,
          title: "Custom Fields",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [],
        });
      }
      
      // Add field to first section
      const targetSection = updatedDefinition.sections[0];
      if (!targetSection.fields) {
        targetSection.fields = [];
      }
      targetSection.fields.push(newField);
    }
    // Handle legacy formats
    else {
      // Add to fields array (old format)
      if (!updatedDefinition.fields) {
        updatedDefinition.fields = [];
      }
      updatedDefinition.fields.push(newField);

      // Add to appropriate category (old format)
      if (updatedDefinition.categories) {
        const targetCategory = updatedDefinition.categories.find(
          (c: any) => c.id === "custom" || c.id === "personal" || c.id === section
        );
        if (targetCategory && !targetCategory.fields.includes(newField.id)) {
          targetCategory.fields.push(newField.id);
        }
      }
    }

    // Update form in database
    await prisma.form.update({
      where: { id: form.id },
      data: {
        schema: updatedDefinition,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      field: newField,
      formId: form.id,
      message: `Added "${fieldDef.label}" to ${form.name}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate field",
    };
  }
}

// Remove a custom field
export async function removeCustomField(
  fieldId: string,
  formId: string,
  companyId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const form = await prisma.form.findFirst({
      where: { id: formId, companyId },
    });

    if (!form) {
      return { success: false, error: "Form not found" };
    }

    const definition = form.schema as any;
    
    // Remove from fields array
    if (definition.fields) {
      definition.fields = definition.fields.filter((f: any) => f.id !== fieldId);
    }

    // Remove from categories
    if (definition.categories) {
      definition.categories.forEach((cat: any) => {
        if (cat.fields) {
          cat.fields = cat.fields.filter((id: string) => id !== fieldId);
        }
      });
    }

    await prisma.form.update({
      where: { id: formId },
      data: {
        schema: definition,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Field removed successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// List all custom fields for a company
export async function listCustomFields(companyId: string) {
  const forms = await prisma.form.findMany({
    where: {
      companyId,
      formType: "DATA_SCREEN",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      schema: true,
    },
  });

  const customFields: any[] = [];

  forms.forEach((form) => {
    const definition = (form as any).schema as any;
    if (definition.fields) {
      definition.fields
        .filter((f: any) => f.custom === true)
        .forEach((f: any) => {
          customFields.push({
            ...f,
            formId: form.id,
            formName: form.name,
          });
        });
    }
  });

  return customFields;
}

