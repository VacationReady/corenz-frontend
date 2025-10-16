export type CSVImportIconName =
  | "building"
  | "users"
  | "clock"
  | "dollar-sign"
  | "shield"
  | "graduation-cap";

export interface CSVImportField {
  key: string;
  label: string;
  required?: boolean;
  note?: string;
}

export interface CSVImportFieldGroup {
  title: string;
  description?: string;
  fields: CSVImportField[];
}

export interface CSVImportTemplate {
  id: string;
  title: string;
  description: string;
  templateFile: string;
  keyNotes?: string[];
  fieldGroups: CSVImportFieldGroup[];
}

export interface CSVImportSubTemplate {
  id: string;
  label: string;
  description: string;
  templateId: string;
  defaultSelected?: boolean;
}

export interface CSVImportDomainConfig {
  id: string;
  label: string;
  description: string;
  icon: CSVImportIconName;
  dependencies?: string;
  defaultTemplateId: string;
  templates: CSVImportTemplate[];
  subTemplates?: CSVImportSubTemplate[];
}
