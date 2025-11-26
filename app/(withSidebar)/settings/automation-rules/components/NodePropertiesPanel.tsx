"use client";

import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { actionTypes } from "../config/actionTypes";
import { conditionTypes } from "../config/conditionTypes";
import { 
  HelpCircle, 
  X, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Users, 
  Clock, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings,
  Zap,
  Filter,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Validation helper
function validateNode(node: any, referenceData?: ReferenceData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const type = node?.type;
  const data = node?.data || {};
  const config = data.config || {};

  if (type === 'trigger') {
    const triggerType = data.triggerType || config.triggerType;
    if (!triggerType) {
      errors.push("Trigger type is required");
    }
    if (triggerType === 'SCHEDULED' && !config.schedule) {
      errors.push("Cron schedule is required for scheduled triggers");
    }
    if (triggerType === 'FORM_SUBMITTED' && !config.formId) {
      errors.push("Form selection is required");
    }
  }

  if (type === 'action') {
    const actionType = data.actionType;
    if (!actionType) {
      errors.push("Action type is required");
    }
    if ((actionType === 'send_email' || actionType === 'send_manager_reminder') && !config.subject) {
      errors.push("Email subject is required");
    }
    if (actionType === 'send_email' && !config.body) {
      errors.push("Email body is required");
    }
    if (actionType === 'create_action_item' && !config.title) {
      errors.push("Task title is required");
    }
    if (actionType === 'assign_form' && !config.formId) {
      errors.push("Form selection is required");
    }
    if (actionType === 'webhook' && !config.webhookUrl) {
      errors.push("Webhook URL is required");
    }
  }

  if (type === 'condition') {
    const conditionType = data.conditionType;
    if (!conditionType) {
      errors.push("Condition type is required");
    }
    // Check if required fields are filled based on condition type
    if (conditionType === 'employee_department' && (!data.conditionData?.departmentIds || data.conditionData.departmentIds.length === 0)) {
      errors.push("At least one department is required");
    }
    if (conditionType === 'employee_job_role' && (!data.conditionData?.jobRoleIds || data.conditionData.jobRoleIds.length === 0)) {
      errors.push("At least one job role is required");
    }
  }

  if (type === 'delay') {
    const days = config.days || 0;
    const hours = config.hours || 0;
    if (days === 0 && hours === 0) {
      errors.push("Delay must be at least 1 hour or 1 day");
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Generate human-readable preview of node configuration
function generatePreview(node: any, referenceData?: ReferenceData): string {
  const type = node?.type;
  const data = node?.data || {};
  const config = data.config || {};

  if (type === 'trigger') {
    const triggerType = data.triggerType || config.triggerType;
    switch (triggerType) {
      case 'EMPLOYEE_CREATED': return "When a new employee is created...";
      case 'EMPLOYEE_START_DATE': return "On employee's start date...";
      case 'DOCUMENT_EXPIRING': return `When documents are expiring in ${config.daysBefore || 30} days...`;
      case 'FORM_SUBMITTED': return "When a form is submitted...";
      case 'SCHEDULED': return `On schedule: ${config.schedule || '(not set)'}`;
      case 'LEAVE_REQUEST': return "When a leave request is created...";
      default: return triggerType ? `When ${triggerType.replace(/_/g, ' ').toLowerCase()}...` : "Configure trigger...";
    }
  }

  if (type === 'action') {
    const actionType = data.actionType;
    switch (actionType) {
      case 'send_email':
        const to = config.recipientType || 'employee';
        return `Send email "${config.subject || '(no subject)'}" to ${to}`;
      case 'send_manager_reminder':
        return `Remind manager: ${config.subject || '(no subject)'}`;
      case 'create_action_item':
        return `Create task: ${config.title || '(no title)'} for ${config.assigneeType || 'manager'}`;
      case 'assign_form':
        const formName = referenceData?.forms?.find(f => f.id === config.formId)?.name;
        return `Assign form: ${formName || '(select form)'}`;
      case 'webhook':
        return `Call webhook: ${config.webhookUrl ? config.webhookUrl.slice(0, 30) + '...' : '(no URL)'}`;
      default: return actionType ? actionType.replace(/_/g, ' ') : "Configure action...";
    }
  }

  if (type === 'condition') {
    const conditionType = data.conditionType;
    const conditionData = data.conditionData || {};
    switch (conditionType) {
      case 'employee_department':
        const deptCount = conditionData.departmentIds?.length || 0;
        return `If department ${conditionData.operator || 'is'} (${deptCount} selected)`;
      case 'employee_job_role':
        const roleCount = conditionData.jobRoleIds?.length || 0;
        return `If job role ${conditionData.operator || 'is'} (${roleCount} selected)`;
      case 'probation_status':
        return `If employee ${conditionData.status?.replace(/_/g, ' ') || '(status)'}`;
      case 'days_since_start':
        return `If started ${conditionData.operator?.replace(/_/g, ' ')} ${conditionData.days || '?'} days ago`;
      case 'condition_group':
        const logic = conditionData.logic || 'AND';
        const count = data.groupConditions?.length || 0;
        return `${logic} group with ${count} condition${count !== 1 ? 's' : ''}`;
      default: return conditionType ? conditionType.replace(/_/g, ' ') : "Configure condition...";
    }
  }

  if (type === 'delay') {
    const days = config.days || 0;
    const hours = config.hours || 0;
    if (days > 0 && hours > 0) return `Wait ${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    if (days > 0) return `Wait ${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `Wait ${hours} hour${hours !== 1 ? 's' : ''}`;
    return "Configure delay...";
  }

  return "Configure node...";
}

// Reference data type from useWorkflowReferenceData
interface ReferenceData {
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  forms: { id: string; name: string; formType?: string }[];
  employees: { id: string; name: string; email: string; firstName: string; lastName: string }[];
  documentTypes: string[];
  templates: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
  loading: boolean;
  hasError: string | null;
}

interface NodePropertiesPanelProps {
  node: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
  referenceData?: ReferenceData;
}

// Helper to get icon for node type
const getNodeIcon = (type: string) => {
  switch (type) {
    case 'trigger': return <Zap className="w-4 h-4" />;
    case 'condition': return <Filter className="w-4 h-4" />;
    case 'action': return <PlayCircle className="w-4 h-4" />;
    case 'delay': return <Clock className="w-4 h-4" />;
    default: return <Settings className="w-4 h-4" />;
  }
};

// Helper to get node type color
const getNodeColor = (type: string) => {
  switch (type) {
    case 'trigger': return 'text-blue-600 bg-blue-50';
    case 'condition': return 'text-amber-600 bg-amber-50';
    case 'action': return 'text-emerald-600 bg-emerald-50';
    case 'delay': return 'text-purple-600 bg-purple-50';
    default: return 'text-slate-600 bg-slate-50';
  }
};

export function NodePropertiesPanel({
  node,
  onUpdate,
  onClose,
  referenceData,
}: NodePropertiesPanelProps) {
  if (!node) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <HelpCircle className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">No node selected</p>
        <p className="text-xs text-slate-400">Click on any node to edit its properties</p>
      </div>
    );
  }

  const isLoading = referenceData?.loading ?? false;
  const validation = validateNode(node, referenceData);
  const preview = generatePreview(node, referenceData);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", getNodeColor(node.type))}>
            {getNodeIcon(node.type)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{node.data?.label || node.type}</h3>
            <p className="text-xs text-slate-500 capitalize">{node.type} Node</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="w-4 h-4 text-amber-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium text-xs mb-1">Missing required fields:</p>
                  <ul className="text-xs space-y-0.5">
                    {validation.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-400">•</span> {err}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className={cn(
        "px-4 py-2 border-b text-xs",
        validation.isValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      )}>
        <span className="font-medium">Preview: </span>
        {preview}
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">
              <span className="font-medium">Configuration incomplete:</span>
              <ul className="mt-1 space-y-0.5">
                {validation.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {validation.errors.length > 3 && (
                  <li className="text-red-500">+ {validation.errors.length - 3} more issue{validation.errors.length - 3 !== 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs text-blue-700">Loading options...</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Common: Display Name */}
        <div>
          <Label className="text-xs font-medium">Display Name</Label>
          <Input
            className="mt-1.5"
            value={node.data?.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={`e.g., ${node.type === "trigger" ? "When employee joins" : node.type === "action" ? "Send welcome email" : node.type}`}
          />
        </div>

        {/* Trigger Node Configuration */}
        {node.type === "trigger" && (
          <TriggerNodeConfig 
            node={node} 
            onUpdate={onUpdate} 
            referenceData={referenceData}
          />
        )}

        {/* Condition Node Configuration */}
        {node.type === "condition" && (
          <ConditionNodeConfig 
            node={node} 
            onUpdate={onUpdate} 
            referenceData={referenceData}
          />
        )}

        {/* Action Node Configuration */}
        {node.type === "action" && (
          <ActionNodeConfig 
            node={node} 
            onUpdate={onUpdate} 
            referenceData={referenceData}
          />
        )}

        {/* Delay Node Configuration */}
        {node.type === "delay" && (
          <DelayNodeConfig node={node} onUpdate={onUpdate} />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50 text-[10px] text-slate-400">
        Node ID: {node.id}
      </div>
    </div>
  );
}

// ============================================================================
// TRIGGER NODE CONFIG
// ============================================================================
function TriggerNodeConfig({ 
  node, 
  onUpdate, 
  referenceData 
}: { 
  node: any; 
  onUpdate: (updates: any) => void;
  referenceData?: ReferenceData;
}) {
  const config = node.data?.config || {};
  const triggerType = node.data?.triggerType || config.triggerType || "";

  const updateConfig = (updates: any) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium">Trigger Type</Label>
        <Select
          value={triggerType}
          onValueChange={(value) => onUpdate({ triggerType: value, config: {} })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select trigger event" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Employee Events</SelectLabel>
              <SelectItem value="EMPLOYEE_CREATED">Employee Created</SelectItem>
              <SelectItem value="EMPLOYEE_START_DATE">Employee Start Date</SelectItem>
              <SelectItem value="EMPLOYEE_UPDATED">Employee Updated</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Documents & Forms</SelectLabel>
              <SelectItem value="DOCUMENT_EXPIRING">Document Expiring</SelectItem>
              <SelectItem value="FORM_SUBMITTED">Form Submitted</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Leave & Contracts</SelectLabel>
              <SelectItem value="LEAVE_REQUEST">Leave Request</SelectItem>
              <SelectItem value="LEAVE_ENDING">Leave Ending</SelectItem>
              <SelectItem value="CONTRACT_EXPIRING">Contract Expiring</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Performance & Onboarding</SelectLabel>
              <SelectItem value="PERFORMANCE_REVIEW_COMPLETED">Performance Review Completed</SelectItem>
              <SelectItem value="ONBOARDING_STEP_COMPLETED">Onboarding Step Completed</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>System</SelectLabel>
              <SelectItem value="SCHEDULED">Scheduled (Cron)</SelectItem>
              <SelectItem value="MANUAL">Manual Trigger</SelectItem>
              <SelectItem value="WEBHOOK">Webhook</SelectItem>
              <SelectItem value="API_TRIGGERED">API Triggered</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Scheduled trigger config */}
      {triggerType === "SCHEDULED" && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-xs font-medium">Cron Schedule</Label>
            <Input
              className="mt-1.5 font-mono text-sm"
              value={config.schedule || ""}
              onChange={(e) => updateConfig({ schedule: e.target.value })}
              placeholder="0 9 * * 1-5"
            />
            <p className="text-xs text-slate-500 mt-1">
              Format: minute hour day month weekday (e.g., "0 9 * * 1-5" = 9am weekdays)
            </p>
          </div>
        </div>
      )}

      {/* Document Expiring config */}
      {triggerType === "DOCUMENT_EXPIRING" && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-xs font-medium">Days Before Expiry</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={config.daysBefore || 30}
              onChange={(e) => updateConfig({ daysBefore: parseInt(e.target.value) || 30 })}
              min={1}
              max={365}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Document Types</Label>
            <MultiSelect
              className="mt-1.5"
              options={(referenceData?.documentTypes || []).map(t => ({ label: t, value: t }))}
              selected={config.documentTypes || []}
              onChange={(values) => updateConfig({ documentTypes: values })}
              placeholder="All document types"
            />
          </div>
        </div>
      )}

      {/* Form Submitted config */}
      {triggerType === "FORM_SUBMITTED" && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-xs font-medium">Form</Label>
            <Select
              value={config.formId || ""}
              onValueChange={(value) => updateConfig({ formId: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {(referenceData?.forms || []).map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {form.name}
                      {form.formType && (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          {form.formType}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONDITION NODE CONFIG
// ============================================================================
function ConditionNodeConfig({ 
  node, 
  onUpdate, 
  referenceData 
}: { 
  node: any; 
  onUpdate: (updates: any) => void;
  referenceData?: ReferenceData;
}) {
  const [showQuickPresets, setShowQuickPresets] = useState(false);
  const currentConditionType = node.data?.conditionType || "employee_department";
  const conditionConfig = conditionTypes.find(c => c.id === currentConditionType);
  const conditionData = node.data?.conditionData || {};
  const groupConditions = node.data?.groupConditions || [];

  // Check if this is a preset or group
  const isPreset = conditionConfig && 'isPreset' in conditionConfig && conditionConfig.isPreset;
  const isGroup = conditionConfig && 'isGroup' in conditionConfig && conditionConfig.isGroup;

  // Get quick preset conditions
  const presetConditions = conditionTypes.filter(c => 'isPreset' in c && c.isPreset);

  const handleConditionDataUpdate = (key: string, value: any) => {
    const newConditionData = { ...conditionData, [key]: value };
    onUpdate({ conditionData: newConditionData });
  };

  // Apply a preset
  const applyPreset = (preset: any) => {
    if ('presetConfig' in preset && preset.presetConfig) {
      onUpdate({
        conditionType: preset.presetConfig.conditionType,
        conditionData: preset.presetConfig.conditionData,
      });
    }
    setShowQuickPresets(false);
  };

  // Add condition to group
  const addConditionToGroup = () => {
    const newCondition = {
      id: `cond-${Date.now()}`,
      type: "employee_department",
      data: {},
    };
    onUpdate({ groupConditions: [...groupConditions, newCondition] });
  };

  // Remove condition from group
  const removeConditionFromGroup = (index: number) => {
    const newConditions = groupConditions.filter((_: any, i: number) => i !== index);
    onUpdate({ groupConditions: newConditions });
  };

  // Update condition in group
  const updateConditionInGroup = (index: number, updates: any) => {
    const newConditions = groupConditions.map((c: any, i: number) => 
      i === index ? { ...c, ...updates } : c
    );
    onUpdate({ groupConditions: newConditions });
  };

  // Get options for multiselect fields using reference data
  const getFieldOptions = (field: any) => {
    if (field.key === "departmentIds") {
      return (referenceData?.departments || []).map(d => ({ value: d.id, label: d.name }));
    }
    if (field.key === "jobRoleIds") {
      return (referenceData?.jobRoles || []).map(r => ({ value: r.id, label: r.name }));
    }
    if (field.key === "managerIds") {
      return (referenceData?.employees || [])
        .filter(e => e.firstName && e.lastName)
        .map(m => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }));
    }
    if (field.key === "locationIds") {
      // Locations might not be in reference data, fallback to empty
      return [];
    }
    if (field.key === "formId") {
      return (referenceData?.forms || []).map(f => ({ value: f.id, label: f.name }));
    }
    return field.options || [];
  };

  const shouldShowField = (field: any) => {
    if (!field.conditional) return true;
    
    if (field.conditional.includes("!=")) {
      const [key, value] = field.conditional.split("!=");
      return conditionData[key] !== value;
    }
    
    const [conditionKey, conditionValue] = field.conditional.split("=");
    return conditionData[conditionKey] === conditionValue;
  };

  const renderField = (field: any) => {
    const value = conditionData[field.key] || "";
    const options = getFieldOptions(field);

    switch (field.type) {
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => handleConditionDataUpdate(field.key, val)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        return (
          <div className="mt-1.5">
            <MultiSelect
              options={options}
              selected={Array.isArray(value) ? value : []}
              onChange={(selected) => handleConditionDataUpdate(field.key, selected)}
              placeholder={`Select ${field.label}...`}
              disabled={referenceData?.loading}
            />
            {Array.isArray(value) && value.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {value.length} selected
                </Badge>
              </div>
            )}
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            className="mt-1.5"
            value={value}
            onChange={(e) => handleConditionDataUpdate(field.key, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );

      case "text":
        return (
          <Input
            className="mt-1.5"
            value={value}
            onChange={(e) => handleConditionDataUpdate(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Presets Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Condition Type</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowQuickPresets(!showQuickPresets)}
          className="text-xs h-6 px-2"
        >
          {showQuickPresets ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
          Quick Presets
        </Button>
      </div>

      {/* Quick Presets Panel */}
      {showQuickPresets && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="col-span-2 text-xs text-blue-700 font-medium mb-1">Common Filters</div>
          {presetConditions.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="text-left p-2 bg-white rounded border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="text-xs font-medium text-slate-800">{preset.name}</div>
              <div className="text-[10px] text-slate-500">{preset.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Condition Type Selector */}
      <Select
        value={currentConditionType}
        onValueChange={(value) => {
          // Check if selected a preset
          const selected = conditionTypes.find(c => c.id === value);
          if (selected && 'isPreset' in selected && selected.isPreset) {
            applyPreset(selected);
          } else {
            onUpdate({ conditionType: value, conditionData: {}, groupConditions: [] });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Quick Filters</SelectLabel>
            {presetConditions.slice(0, 4).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Advanced</SelectLabel>
            <SelectItem value="condition_group">Condition Group (AND/OR)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Employee Filters</SelectLabel>
            <SelectItem value="employee_department">Filter by Department</SelectItem>
            <SelectItem value="employee_job_role">Filter by Job Role</SelectItem>
            <SelectItem value="employee_location">Filter by Location</SelectItem>
            <SelectItem value="employee_manager">Filter by Manager</SelectItem>
            <SelectItem value="employee_contract_type">Filter by Contract Type</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Time Filters</SelectLabel>
            <SelectItem value="time_of_year">Filter by Time of Year</SelectItem>
            <SelectItem value="days_since_start">Days Since Start</SelectItem>
            <SelectItem value="probation_status">Probation Status</SelectItem>
            <SelectItem value="work_anniversary">Work Anniversary</SelectItem>
            <SelectItem value="tenure">Filter by Tenure</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Data Conditions</SelectLabel>
            <SelectItem value="field_value">Check Field Value</SelectItem>
            <SelectItem value="has_manager">Has Manager Assigned</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Documents & Forms</SelectLabel>
            <SelectItem value="document_status">Document Status</SelectItem>
            <SelectItem value="form_submitted">Form Submission</SelectItem>
            <SelectItem value="leave_balance">Leave Balance</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Advanced</SelectLabel>
            <SelectItem value="working_hours">Working Hours</SelectItem>
            <SelectItem value="custom_field">Custom Field Check</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Condition Group UI */}
      {isGroup && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Logic</Label>
            <Select
              value={conditionData.logic || "AND"}
              onValueChange={(val) => handleConditionDataUpdate("logic", val)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">ALL conditions must match (AND)</SelectItem>
                <SelectItem value="OR">ANY condition must match (OR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Conditions</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addConditionToGroup}
                className="h-6 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {groupConditions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                No conditions yet. Click "Add" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {groupConditions.map((cond: any, index: number) => (
                  <div key={cond.id} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {conditionData.logic === "AND" ? "AND" : "OR"} #{index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConditionFromGroup(index)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Select
                      value={cond.type || "employee_department"}
                      onValueChange={(val) => updateConditionInGroup(index, { type: val, data: {} })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee_department">Department</SelectItem>
                        <SelectItem value="employee_job_role">Job Role</SelectItem>
                        <SelectItem value="employee_contract_type">Contract Type</SelectItem>
                        <SelectItem value="probation_status">Probation Status</SelectItem>
                        <SelectItem value="days_since_start">Days Since Start</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
            <strong>Tip:</strong> Use condition groups to create complex filters like "Engineering department AND in probation".
          </div>
        </div>
      )}

      {/* Condition description */}
      {conditionConfig && !isGroup && (
        <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
          <strong className="block mb-1">{conditionConfig.name}</strong>
          {conditionConfig.description}
        </div>
      )}

      {/* Condition fields */}
      {conditionConfig && !isGroup && conditionConfig?.fields?.map((field) => (
        shouldShowField(field) && (
          <div key={field.key}>
            <div className="flex items-center gap-1">
              <Label className="text-xs font-medium">
                {field.label}
                {'required' in field && field.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </Label>
              {'helpText' in field && field.helpText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">{field.helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {renderField(field)}
          </div>
        )
      ))}
    </div>
  );
}

// ============================================================================
// ACTION NODE CONFIG
// ============================================================================
function ActionNodeConfig({ 
  node, 
  onUpdate, 
  referenceData 
}: { 
  node: any; 
  onUpdate: (updates: any) => void;
  referenceData?: ReferenceData;
}) {
  const actionType = node.data?.actionType || "send_email";
  const config = node.data?.config || {};
  const actionConfig = actionTypes.find(a => a.id === actionType);

  const updateConfig = (updates: any) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  // Get options for dynamic fields
  const getFieldOptions = (field: any) => {
    if (field.key === "formId") {
      // Filter forms by formType if specified
      const filterType = config.formType;
      let forms = referenceData?.forms || [];
      if (filterType && filterType !== "all") {
        forms = forms.filter(f => f.formType === filterType);
      }
      return forms.map(f => ({ 
        value: f.id, 
        label: f.name,
        formType: f.formType 
      }));
    }
    if (field.key === "templateId") {
      return (referenceData?.templates || []).map(t => ({ value: t.id, label: t.name }));
    }
    if (field.key === "assigneeId" || field.key === "recipients") {
      return (referenceData?.users || []).map(u => ({ value: u.id, label: u.name }));
    }
    if (field.key === "leaveType") {
      return [
        { value: "ANNUAL", label: "Annual Leave" },
        { value: "SICK", label: "Sick Leave" },
        { value: "BEREAVEMENT", label: "Bereavement Leave" },
      ];
    }
    if (field.key === "courseId") {
      // Training courses - placeholder
      return [];
    }
    if (field.key === "permissionProfileId") {
      // Permission profiles - placeholder
      return [];
    }
    return field.options || [];
  };

  const shouldShowField = (field: any) => {
    if (!field.conditional) return true;
    
    const parts = field.conditional.split("=");
    if (parts.length !== 2) return true;
    
    return config[parts[0]] === parts[1];
  };

  // Group forms by type for the assign_form action
  const groupedForms = useMemo(() => {
    const forms = referenceData?.forms || [];
    return {
      FORM: forms.filter(f => f.formType === 'FORM' || !f.formType),
      TABLE: forms.filter(f => f.formType === 'TABLE'),
      SURVEY: forms.filter(f => f.formType === 'SURVEY'),
      DATA_SCREEN: forms.filter(f => f.formType === 'DATA_SCREEN'),
    };
  }, [referenceData?.forms]);

  const renderActionField = (field: any) => {
    const value = config[field.key];
    const options = getFieldOptions(field);

    switch (field.type) {
      case "select":
        // Special handling for formId with grouped forms
        if (field.key === "formId") {
          return (
            <Select
              value={value || ""}
              onValueChange={(val) => updateConfig({ [field.key]: val })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {groupedForms.FORM.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Forms
                    </SelectLabel>
                    {groupedForms.FORM.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedForms.TABLE.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Data Tables
                    </SelectLabel>
                    {groupedForms.TABLE.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedForms.SURVEY.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Surveys
                    </SelectLabel>
                    {groupedForms.SURVEY.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedForms.DATA_SCREEN.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Data Screens
                    </SelectLabel>
                    {groupedForms.DATA_SCREEN.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          );
        }

        return (
          <Select
            value={value || ""}
            onValueChange={(val) => updateConfig({ [field.key]: val })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        return (
          <div className="mt-1.5">
            <MultiSelect
              options={options}
              selected={Array.isArray(value) ? value : []}
              onChange={(selected) => updateConfig({ [field.key]: selected })}
              placeholder={`Select ${field.label}...`}
            />
          </div>
        );

      case "text":
        return (
          <Input
            className="mt-1.5"
            value={value || ""}
            onChange={(e) => updateConfig({ [field.key]: e.target.value })}
            placeholder={field.placeholder}
          />
        );

      case "textarea":
        return (
          <Textarea
            className="mt-1.5"
            value={value || ""}
            onChange={(e) => updateConfig({ [field.key]: e.target.value })}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            className="mt-1.5"
            value={value ?? ""}
            onChange={(e) => updateConfig({ [field.key]: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })}
            placeholder={field.placeholder}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2 mt-1.5">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateConfig({ [field.key]: checked })}
            />
            <Label className="text-sm font-normal cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            className="mt-1.5"
            value={value || ""}
            onChange={(e) => updateConfig({ [field.key]: e.target.value })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Type Selector */}
      <div>
        <Label className="text-xs font-medium">Action Type</Label>
        <Select
          value={actionType}
          onValueChange={(value) => onUpdate({ actionType: value, config: {} })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Communication</SelectLabel>
              <SelectItem value="send_email">Send Email</SelectItem>
              <SelectItem value="send_manager_reminder">Remind Manager</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Action Items</SelectLabel>
              <SelectItem value="create_action_item">Create Action Item</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Forms & Documents</SelectLabel>
              <SelectItem value="assign_form">Assign Form</SelectItem>
              <SelectItem value="assign_onboarding_checklist">Assign Onboarding Checklist</SelectItem>
              <SelectItem value="request_document_upload">Request Document Upload</SelectItem>
              <SelectItem value="request_document_acknowledgement">Request Doc Acknowledgement</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Offboarding</SelectLabel>
              <SelectItem value="create_offboarding_task">Add Offboarding Task</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Employee Updates</SelectLabel>
              <SelectItem value="update_employee_field">Update Field</SelectItem>
              <SelectItem value="adjust_leave_balance">Adjust Leave Balance</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Training & Performance</SelectLabel>
              <SelectItem value="assign_training">Assign Training</SelectItem>
              <SelectItem value="schedule_review">Schedule Review</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Security</SelectLabel>
              <SelectItem value="update_permissions">Update Permissions</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Integrations</SelectLabel>
              <SelectItem value="webhook">Call Webhook</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Action description */}
      {actionConfig && (
        <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
          <strong className="block mb-1">{actionConfig.name}</strong>
          {actionConfig.description}
        </div>
      )}

      {/* Email-specific with tabs */}
      {(actionType === "send_email" || actionType === "send_manager_reminder") && (
        <EmailActionConfig 
          config={config} 
          updateConfig={updateConfig}
          referenceData={referenceData}
        />
      )}

      {/* Dynamic fields from actionTypes config */}
      {actionConfig && actionType !== "send_email" && actionType !== "send_manager_reminder" && (
        <div className="space-y-3">
          {actionConfig.fields?.map((field) => (
            shouldShowField(field) && (
              <div key={field.key}>
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  {'helpText' in field && field.helpText && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">{field.helpText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {renderActionField(field)}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMAIL ACTION CONFIG (with tabs)
// ============================================================================
function EmailActionConfig({ 
  config, 
  updateConfig,
  referenceData
}: { 
  config: any;
  updateConfig: (updates: any) => void;
  referenceData?: ReferenceData;
}) {
  return (
    <Tabs defaultValue="recipients" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="recipients" className="text-xs">Recipients</TabsTrigger>
        <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
        <TabsTrigger value="options" className="text-xs">Options</TabsTrigger>
      </TabsList>

      <TabsContent value="recipients" className="space-y-3 pt-3">
        <div>
          <Label className="text-xs font-medium">Send To</Label>
          <Select
            value={config.recipientType || "employee"}
            onValueChange={(value) => updateConfig({ recipientType: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee (trigger subject)</SelectItem>
              <SelectItem value="manager">Employee's Manager</SelectItem>
              <SelectItem value="hr">HR Team</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
              <SelectItem value="custom">Custom Email Address</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.recipientType === "custom" && (
          <div>
            <Label className="text-xs font-medium">Email Address</Label>
            <Input
              className="mt-1.5"
              value={config.emailAddress || ""}
              onChange={(e) => updateConfig({ emailAddress: e.target.value })}
              placeholder="hr@company.com"
            />
          </div>
        )}

        <div>
          <Label className="text-xs font-medium">CC (optional)</Label>
          <Input
            className="mt-1.5"
            value={config.cc || ""}
            onChange={(e) => updateConfig({ cc: e.target.value })}
            placeholder="manager@company.com, hr@company.com"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">BCC (optional)</Label>
          <Input
            className="mt-1.5"
            value={config.bcc || ""}
            onChange={(e) => updateConfig({ bcc: e.target.value })}
            placeholder="compliance@company.com"
          />
        </div>
      </TabsContent>

      <TabsContent value="content" className="space-y-3 pt-3">
        <div>
          <Label className="text-xs font-medium">Subject</Label>
          <Input
            className="mt-1.5"
            value={config.subject || ""}
            onChange={(e) => updateConfig({ subject: e.target.value })}
            placeholder="Welcome to the team!"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Body</Label>
          <Textarea
            className="mt-1.5 min-h-[150px] font-mono text-sm"
            value={config.body || ""}
            onChange={(e) => updateConfig({ body: e.target.value })}
            placeholder={`Hi {{firstName}},

Welcome to {{companyName}}! We're excited to have you join us.

Your manager {{managerName}} will reach out soon to schedule your first meeting.

Best regards,
The Team`}
          />
        </div>

        <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
          <strong>Available Variables:</strong>
          <div className="flex flex-wrap gap-1 mt-1">
            {['{{firstName}}', '{{lastName}}', '{{companyName}}', '{{managerName}}', '{{ceoName}}', '{{startDate}}'].map(v => (
              <Badge key={v} variant="secondary" className="text-[10px] font-mono">{v}</Badge>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="options" className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium">High Priority</Label>
            <p className="text-xs text-slate-500">Mark as high importance</p>
          </div>
          <Switch
            checked={config.highPriority || false}
            onCheckedChange={(checked) => updateConfig({ highPriority: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium">Request Read Receipt</Label>
            <p className="text-xs text-slate-500">Get notified when opened</p>
          </div>
          <Switch
            checked={config.readReceipt || false}
            onCheckedChange={(checked) => updateConfig({ readReceipt: checked })}
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Delay Send (hours)</Label>
          <Input
            type="number"
            className="mt-1.5"
            value={config.delayHours || ""}
            onChange={(e) => updateConfig({ delayHours: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="0 (send immediately)"
            min={0}
            max={168}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ============================================================================
// DELAY NODE CONFIG
// ============================================================================
function DelayNodeConfig({ 
  node, 
  onUpdate 
}: { 
  node: any; 
  onUpdate: (updates: any) => void;
}) {
  const config = node.data?.config || {};

  const updateConfig = (updates: any) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium">Delay Duration</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <div>
            <Input
              type="number"
              value={config.days || 1}
              onChange={(e) => updateConfig({ days: parseInt(e.target.value) || 1 })}
              min={0}
              max={365}
            />
            <p className="text-xs text-slate-500 mt-1">Days</p>
          </div>
          <div>
            <Input
              type="number"
              value={config.hours || 0}
              onChange={(e) => updateConfig({ hours: parseInt(e.target.value) || 0 })}
              min={0}
              max={23}
            />
            <p className="text-xs text-slate-500 mt-1">Hours</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-100">
        <strong className="block mb-1">How delays work</strong>
        The workflow will pause for the specified duration before continuing to the next step.
        {config.days > 0 && (
          <div className="mt-1 text-purple-600">
            Will wait {config.days} day{config.days !== 1 ? 's' : ''}{config.hours > 0 ? ` and ${config.hours} hour${config.hours !== 1 ? 's' : ''}` : ''}
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs font-medium">Skip on Weekends</Label>
        <div className="flex items-center gap-2 mt-1.5">
          <Switch
            checked={config.skipWeekends || false}
            onCheckedChange={(checked) => updateConfig({ skipWeekends: checked })}
          />
          <span className="text-xs text-slate-600">
            Only count business days
          </span>
        </div>
      </div>
    </div>
  );
}
