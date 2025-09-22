"use client";

import React from "react";
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
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ConfigFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  options?: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
}

export const ConfigField: React.FC<ConfigFieldProps> = ({
  field,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
}) => {
  const fieldOptions = options.length > 0 ? options : field.options || [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Label htmlFor={field.key} className="text-xs font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {field.helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Help" className="text-muted-foreground">
                  <HelpCircle className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{field.helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {field.type === "text" && (
        <Input
          id={field.key}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className="h-8 text-sm"
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          id={field.key}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className="text-sm resize-none"
        />
      )}

      {field.type === "number" && (
        <Input
          id={field.key}
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : parseInt(e.target.value) || 0)}
          placeholder={field.placeholder}
          disabled={disabled}
          className="h-8 text-sm"
        />
      )}

      {field.type === "select" && (
        <Select
          value={value || ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={`Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((option: any) => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "multiselect" && (
        <MultiSelect
          options={fieldOptions}
          selected={Array.isArray(value) ? value : []}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
        />
      )}

      {field.type === "date" && (
        <Input
          id={field.key}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 text-sm"
        />
      )}

      {field.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(value)}
            onChange={onChange}
            disabled={disabled}
          />
          <Label className="text-sm font-normal cursor-pointer" onClick={() => onChange(!value)}>
            {field.label}
          </Label>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};

interface TriggerConfigurationProps {
  triggerType: string;
  triggerConfig: any;
  onUpdate: (config: any) => void;
  triggerTypes: any[];
  formsOptions: { value: string; label: string }[];
  documentTypeOptions: { value: string; label: string }[];
  errors?: Record<string, string>;
}

export const TriggerConfiguration: React.FC<TriggerConfigurationProps> = ({
  triggerType,
  triggerConfig,
  onUpdate,
  triggerTypes,
  formsOptions,
  documentTypeOptions,
  errors = {},
}) => {
  const triggerInfo = triggerTypes.find(t => t.id === triggerType);
  if (!triggerInfo) return null;

  const getFieldOptions = (field: any) => {
    if (triggerType === "FORM_SUBMITTED" && field.key === "formId") {
      return formsOptions;
    }
    if (triggerType === "DOCUMENT_EXPIRING" && field.key === "documentTypes") {
      return documentTypeOptions;
    }
    return field.options || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
        {triggerInfo.icon}
        <div>
          <p className="text-sm font-medium">{triggerInfo.name}</p>
          <p className="text-xs text-muted-foreground">{triggerInfo.description}</p>
        </div>
      </div>

      {triggerInfo.configFields.map((field: any) => (
        <ConfigField
          key={field.key}
          field={field}
          value={triggerConfig[field.key]}
          onChange={(value) => onUpdate({ ...triggerConfig, [field.key]: value })}
          options={getFieldOptions(field)}
          error={errors[`triggerConfig.${field.key}`]}
        />
      ))}
    </div>
  );
};

interface ConditionConfigurationProps {
  condition: any;
  onUpdate: (condition: any) => void;
  conditionTypes: any[];
  departmentsOptions: { value: string; label: string }[];
  jobRolesOptions: { value: string; label: string }[];
  errors?: Record<string, string>;
}

export const ConditionConfiguration: React.FC<ConditionConfigurationProps> = ({
  condition,
  onUpdate,
  conditionTypes,
  departmentsOptions,
  jobRolesOptions,
  errors = {},
}) => {
  const conditionInfo = conditionTypes.find(c => c.id === condition.type);

  const getFieldOptions = (field: any) => {
    if (condition.type === "department" && field.key === "value") {
      return departmentsOptions;
    }
    if (condition.type === "jobRole" && field.key === "value") {
      return jobRolesOptions;
    }
    return field.options || [];
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium">Condition Type</Label>
        <Select
          value={condition.type || ""}
          onValueChange={(value) => onUpdate({ type: value, config: {} })}
        >
          <SelectTrigger className="h-8 text-sm mt-1">
            <SelectValue placeholder="Select condition type" />
          </SelectTrigger>
          <SelectContent>
            {conditionTypes.map((type) => (
              <SelectItem key={type.id} value={type.id} className="text-sm">
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {conditionInfo && (
        <>
          <div className="p-2 bg-amber-50 rounded-md">
            <p className="text-xs text-amber-800">{conditionInfo.description}</p>
          </div>

          {conditionInfo.configFields.map((field: any) => (
            <ConfigField
              key={field.key}
              field={field}
              value={condition.config?.[field.key]}
              onChange={(value) => onUpdate({
                ...condition,
                config: { ...condition.config, [field.key]: value }
              })}
              options={getFieldOptions(field)}
              error={errors[field.key]}
            />
          ))}
        </>
      )}
    </div>
  );
};

interface ActionConfigurationProps {
  action: any;
  onUpdate: (action: any) => void;
  actionTypes: any[];
  templatesOptions: { value: string; label: string }[];
  usersOptions: { value: string; label: string }[];
  errors?: Record<string, string>;
}

export const ActionConfiguration: React.FC<ActionConfigurationProps> = ({
  action,
  onUpdate,
  actionTypes,
  templatesOptions,
  usersOptions,
  errors = {},
}) => {
  const actionInfo = actionTypes.find(a => a.id === action.type);

  const getFieldOptions = (field: any) => {
    if (field.key === "assigneeId" || field.key === "recipients") {
      return usersOptions;
    }
    if (field.key === "templateId") {
      return templatesOptions;
    }
    return field.options || [];
  };

  const shouldShowField = (field: any) => {
    if (field.key === "assigneeId") {
      return action.config?.assigneeType === "specific";
    }
    if (field.key === "recipients") {
      return action.config?.recipientType === "specific";
    }
    return true;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium">Action Type</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {actionTypes.map((type) => (
            <div
              key={type.id}
              className={`p-2 border rounded-md cursor-pointer transition-all ${
                action.type === type.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => onUpdate({ type: type.id, config: {} })}
            >
              <div className="flex items-start gap-2">
                {type.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{type.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {actionInfo && (
        <>
          <div className="p-2 bg-green-50 rounded-md">
            <p className="text-xs text-green-800">{actionInfo.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {actionInfo.configFields.map((field: any) => {
              if (!shouldShowField(field)) return null;
              
              // Full width for text areas and messages
              const isFullWidth = field.type === "textarea" || field.key === "message" || field.key === "description";
              
              return (
                <div key={field.key} className={isFullWidth ? "col-span-2" : ""}>
                  <ConfigField
                    field={{
                      ...field,
                      type: (field.key === "message" || field.key === "description") ? "textarea" : field.type
                    }}
                    value={action.config?.[field.key]}
                    onChange={(value) => onUpdate({
                      ...action,
                      config: { ...action.config, [field.key]: value }
                    })}
                    options={getFieldOptions(field)}
                    error={errors[field.key]}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
