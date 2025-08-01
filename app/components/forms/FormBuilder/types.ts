// app/components/forms/FormBuilder/types.ts

export interface FormField {
  id: string;
  type: string;              // e.g. 'text', 'email', 'select', 'radio', etc.
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];        // For select, radio, checkbox
}
