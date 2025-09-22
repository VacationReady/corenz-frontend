"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { toast } from "@/hooks/use-toast";

// Import new components
import { AutomationRuleList } from "./components/AutomationRuleList";
import { AutomationFlowBuilder } from "./components/AutomationFlowBuilder";
import { DryRunResultsDialog } from "./components/DryRunResultsDialog";
import { PreflightDialog } from "./components/PreflightDialog";
import { ValidationChecklist } from "./components/ValidationChecklist";
import {
  Settings,
  Plus,
  Play,
  Pause,
  TestTube,
  Zap,
  Filter,
  Send,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Copy,
  HelpCircle,
} from "lucide-react";

interface AutomationRule {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: any;
  conditions?: any[];
  actions: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface TriggerType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  configFields: ConfigField[];
}

interface ConditionType {
  id: string;
  name: string;
  description: string;
  configFields: ConfigField[];
}

interface ActionType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  configFields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "date" | "boolean" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
}

const triggerTypes: TriggerType[] = [
  {
    id: "DOCUMENT_EXPIRING",
    name: "Document Expiring",
    description: "Triggered when a document is approaching its expiry date",
    icon: <FileText className="w-4 h-4" />,
    configFields: [
      {
        key: "daysBefore",
        label: "Days Before Expiry",
        type: "number",
        required: true,
        placeholder: "30",
      },
      {
        key: "documentTypes",
        label: "Document Types",
        type: "multiselect",
        options: [],
      }, // Will be populated from API
    ],
  },
  {
    id: "FORM_SUBMITTED",
    name: "Form Submitted",
    description: "Triggered when a specific form is submitted",
    icon: <FileText className="w-4 h-4" />,
    configFields: [
      {
        key: "formId",
        label: "Form",
        type: "select",
        required: true,
        options: [],
      }, // Will be populated from API
    ],
  },
  {
    id: "ONBOARDING_STEP_COMPLETED",
    name: "Onboarding Step Completed",
    description: "Triggered when an onboarding step is completed",
    icon: <User className="w-4 h-4" />,
    configFields: [
      {
        key: "stepType",
        label: "Step Type",
        type: "select",
        options: [
          { value: "ACKNOWLEDGE_DOCUMENT", label: "Acknowledge Document" },
          { value: "UPLOAD_DOCUMENT", label: "Upload Document" },
          { value: "FORM_FILL", label: "Fill Form" },
          { value: "INSTRUCTION", label: "Instruction" },
        ],
      },
    ],
  },
  {
    id: "EMPLOYEE_CREATED",
    name: "Employee Created",
    description: "Triggered when a new employee is added to the system",
    icon: <User className="w-4 h-4" />,
    configFields: [],
  },
];

const conditionTypes: ConditionType[] = [
  {
    id: "role",
    name: "Employee Role",
    description: "Filter by employee role",
    configFields: [
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "in", label: "In" },
        ],
      },
      {
        key: "value",
        label: "Role",
        type: "multiselect",
        options: [
          { value: "ADMIN", label: "Admin" },
          { value: "MANAGER", label: "Manager" },
          { value: "EMPLOYEE", label: "Employee" },
        ],
      },
    ],
  },
  {
    id: "department",
    name: "Department",
    description: "Filter by department",
    configFields: [
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "in", label: "In" },
        ],
      },
      { key: "value", label: "Department", type: "multiselect", options: [] }, // Will be populated from API
    ],
  },
  {
    id: "jobRole",
    name: "Job Role",
    description: "Filter by job role",
    configFields: [
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "in", label: "In" },
        ],
      },
      { key: "value", label: "Job Role", type: "multiselect", options: [] }, // Will be populated from API
    ],
  },
  {
    id: "dateWindow",
    name: "Date Window",
    description: "Filter by date range",
    configFields: [
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
    ],
  },
];

const actionTypes: ActionType[] = [
  {
    id: "create_task",
    name: "Create Task",
    description: "Create a task for a user",
    icon: <CheckCircle className="w-4 h-4" />,
    configFields: [
      { key: "title", label: "Task Title", type: "text", required: true },
      { key: "description", label: "Task Description", type: "text" },
      {
        key: "assigneeType",
        label: "Assign To",
        type: "select",
        required: true,
        options: [
          { value: "employee", label: "Employee (trigger subject)" },
          { value: "manager", label: "Employee's Manager" },
          { value: "hr", label: "HR Team" },
          { value: "specific", label: "Specific User" },
        ],
      },
      {
        key: "assigneeId",
        label: "Specific User",
        type: "select",
        options: [],
      }, // Conditional field
      {
        key: "dueDays",
        label: "Due in (days)",
        type: "number",
        placeholder: "7",
      },
    ],
  },
  {
    id: "send_notification",
    name: "Send Notification",
    description: "Send email, Slack, or Teams notification",
    icon: <Send className="w-4 h-4" />,
    configFields: [
      {
        key: "channels",
        label: "Channels",
        type: "multiselect",
        required: true,
        options: [
          { value: "email", label: "Email" },
          { value: "slack", label: "Slack" },
          { value: "teams", label: "Teams" },
        ],
      },
      {
        key: "recipientType",
        label: "Send To",
        type: "select",
        required: true,
        options: [
          { value: "employee", label: "Employee (trigger subject)" },
          { value: "manager", label: "Employee's Manager" },
          { value: "hr", label: "HR Team" },
          { value: "specific", label: "Specific Users" },
        ],
      },
      {
        key: "recipients",
        label: "Specific Recipients",
        type: "multiselect",
        options: [],
      }, // Conditional field
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "message", label: "Message", type: "text", required: true },
    ],
  },
  {
    id: "start_onboarding",
    name: "Start Onboarding Template",
    description: "Assign an onboarding template to the employee",
    icon: <User className="w-4 h-4" />,
    configFields: [
      {
        key: "templateId",
        label: "Onboarding Template",
        type: "select",
        required: true,
        options: [],
      }, // Will be populated from API
    ],
  },
  {
    id: "update_field",
    name: "Update Employee Field",
    description: "Update a field on the employee record",
    icon: <Edit className="w-4 h-4" />,
    configFields: [
      {
        key: "field",
        label: "Field",
        type: "select",
        required: true,
        options: [
          { value: "department", label: "Department" },
          { value: "jobRole", label: "Job Role" },
          { value: "manager", label: "Manager" },
          { value: "workingPattern", label: "Working Pattern" },
        ],
      },
      { key: "value", label: "New Value", type: "text", required: true },
    ],
  },
];

export default function AutomationRulesPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [builderMode, setBuilderMode] = useState<"create" | "edit" | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<any>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [postSaveRunTest, setPostSaveRunTest] = useState(true);

  // Form state for rule creation/editing
  const [formData, setFormData] = useState<AutomationRule>({
    name: "",
    description: "",
    isActive: false,
    triggerType: "",
    triggerConfig: {},
    conditions: [],
    actions: [],
  });

  // Dynamic select options
  const [formsOptions, setFormsOptions] = useState<{ value: string; label: string }[]>([]);
  const [templatesOptions, setTemplatesOptions] = useState<{ value: string; label: string }[]>([]);
  const [departmentsOptions, setDepartmentsOptions] = useState<{ value: string; label: string }[]>([]);
  const [jobRolesOptions, setJobRolesOptions] = useState<{ value: string; label: string }[]>([]);
  const [usersOptions, setUsersOptions] = useState<{ value: string; label: string }[]>([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<{ value: string; label: string }[]>([]);

  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationHints, setValidationHints] = useState<string[]>([]);

  useEffect(() => {
    fetchRules();
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [formsRes, templatesRes, departmentsRes, jobRolesRes, usersRes, docTypesRes] = await Promise.all([
        fetch("/api/forms"),
        fetch("/api/onboarding/templates"),
        fetch("/api/departments"),
        fetch("/api/job-roles"),
        fetch("/api/users?limit=1000"),
        fetch("/api/employment-checks/types"),
      ]);

      if (formsRes.ok) {
        const forms = await formsRes.json();
        setFormsOptions(forms.map((f: any) => ({ value: f.id, label: f.name })));
      }

      if (templatesRes.ok) {
        const templates = await templatesRes.json();
        setTemplatesOptions(
          templates.map((t: any) => ({ value: t.id, label: t.name })),
        );
      }

      if (departmentsRes.ok) {
        const departments = await departmentsRes.json();
        setDepartmentsOptions(
          departments.map((d: any) => ({ value: d.id, label: d.name })),
        );
      }

      if (jobRolesRes.ok) {
        const jr = await jobRolesRes.json();
        const roles = Array.isArray(jr) ? jr : jr.jobRoles || [];
        setJobRolesOptions(roles.map((r: any) => ({ value: r.id, label: r.name })));
      }

      if (usersRes.ok) {
        const users = await usersRes.json();
        setUsersOptions(
          users.map((u: any) => ({
            value: u.id,
            label: u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email,
          })),
        );
      }

      if (docTypesRes.ok) {
        const types = await docTypesRes.json();
        setDocumentTypeOptions(types.map((t: string) => ({ value: t, label: t })));
      }
    } catch (e) {
      // Non-blocking; options can be retried later
      console.warn("Failed loading options for automation rules:", e);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/automation-rules");
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch automation rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRuleAndMaybeTest = async (runTestAfter: boolean) => {
    try {
      const method = selectedRule?.id ? "PUT" : "POST";
      const url = selectedRule?.id
        ? `/api/automation-rules/${selectedRule.id}`
        : "/api/automation-rules";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const saved = await response.json();
        toast({
          title: "Success",
          description: `Rule ${selectedRule?.id ? "updated" : "created"} successfully`,
        });
        setBuilderMode(null);
        setSelectedRule(null);
        resetForm();
        fetchRules();
        if (runTestAfter && saved?.id) {
          runDryTest(saved);
        }
        return saved;
      } else {
        const error = await response.json().catch(() => ({} as any));
        toast({
          title: "Error",
          description: (error as any).error || (error as any).message || "Failed to save rule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
    return null;
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/automation-rules/${ruleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rule deleted successfully",
        });
        fetchRules();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/automation-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Rule ${isActive ? "activated" : "deactivated"} successfully`,
        });
        fetchRules();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rule status",
        variant: "destructive",
      });
    }
  };

  const runDryTest = async (rule: AutomationRule) => {
    try {
      const response = await fetch("/api/automation-rules/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id }),
      });

      if (response.ok) {
        const results = await response.json();
        setDryRunResults(results);
        setTestDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run dry test",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: false,
      triggerType: "",
      triggerConfig: {},
      conditions: [],
      actions: [],
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedRule(null);
    setBuilderMode("create");
  };

  const openEditDialog = (rule: AutomationRule) => {
    setFormData(rule);
    setSelectedRule(rule);
    setBuilderMode("edit");
  };

  const getTriggerTypeInfo = (triggerType: string) => {
    return triggerTypes.find((t) => t.id === triggerType);
  };

  const getTriggerFieldOptions = (field: ConfigField) => {
    // Provide dynamic options where defined; fall back to static field.options
    if (formData.triggerType === "FORM_SUBMITTED" && field.key === "formId") {
      return formsOptions;
    }
    if (formData.triggerType === "DOCUMENT_EXPIRING" && field.key === "documentTypes") {
      return documentTypeOptions;
    }
    return field.options ?? [];
  };

  // Validation helpers (pure)
  const computeErrors = (data: AutomationRule) => {
    const errors: Record<string, string> = {};
    const hints: string[] = [];

    if (!data.name?.trim()) {
      errors["name"] = "Give your automation a clear, human-friendly name.";
      hints.push("Add a descriptive name so your team recognizes this automation.");
    }
    if (!data.triggerType) {
      errors["triggerType"] = "Select a trigger to start the automation.";
      hints.push("Choose a trigger like Document Expiring or Form Submitted.");
    }

    if (data.triggerType === "FORM_SUBMITTED") {
      if (!data.triggerConfig?.formId) {
        errors["triggerConfig.formId"] = "Choose the form to watch for submissions.";
      }
    }
    if (data.triggerType === "DOCUMENT_EXPIRING") {
      const days = data.triggerConfig?.daysBefore;
      if (typeof days !== "number" || days <= 0) {
        errors["triggerConfig.daysBefore"] = "Enter days before expiry (e.g., 30).";
      }
    }
    if (data.triggerType === "ONBOARDING_STEP_COMPLETED") {
      if (!data.triggerConfig?.stepType) {
        errors["triggerConfig.stepType"] = "Choose the onboarding step type.";
      }
    }

    if (!Array.isArray(data.actions) || data.actions.length === 0) {
      errors["actions"] = "Add at least one action (e.g., Send Notification).";
      hints.push("Most automations send a notification or create a task.");
    }
    data.actions?.forEach((action: any, index: number) => {
      const prefix = `actions.${index}`;
      if (!action?.type) {
        errors[`${prefix}.type`] = "Select an action type.";
      }
      if (action?.type === "create_task") {
        if (!action.config?.title) errors[`${prefix}.title`] = "Add a task title.";
        if (!action.config?.assigneeType) errors[`${prefix}.assigneeType`] = "Choose an assignee.";
        if (action.config?.assigneeType === "specific" && !action.config?.assigneeId) {
          errors[`${prefix}.assigneeId`] = "Choose a specific user to assign the task to.";
        }
      }
      if (action?.type === "send_notification") {
        if (!Array.isArray(action.config?.channels) || action.config.channels.length === 0) {
          errors[`${prefix}.channels`] = "Select at least one channel (Email, Slack, Teams).";
        }
        if (!action.config?.recipientType) {
          errors[`${prefix}.recipientType`] = "Choose who should receive the message.";
        }
        if (action.config?.recipientType === "specific" && (!Array.isArray(action.config?.recipients) || action.config.recipients.length === 0)) {
          errors[`${prefix}.recipients`] = "Select at least one recipient.";
        }
        if (!action.config?.subject) errors[`${prefix}.subject`] = "Add a subject for the message.";
        if (!action.config?.message) errors[`${prefix}.message`] = "Write a short message.";
      }
      if (action?.type === "start_onboarding") {
        if (!action.config?.templateId) errors[`${prefix}.templateId`] = "Choose an onboarding template.";
      }
      if (action?.type === "update_field") {
        if (!action.config?.field) errors[`${prefix}.field`] = "Choose a field to update.";
        if (!action.config?.value) errors[`${prefix}.value`] = "Enter a new value.";
      }
    });

    return { errors, hints, isValid: Object.keys(errors).length === 0 };
  };

  useEffect(() => {
    const { errors, hints } = computeErrors(formData);
    setValidationErrors(errors);
    setValidationHints(hints);
  }, [formData]);

  const getError = (key: string) => validationErrors[key];
  const isFormValid = Object.keys(validationErrors).length === 0;

  // Presets
  const usePreset = (preset: "expiry-30" | "welcome" | "form-followup") => {
    if (preset === "expiry-30") {
      setFormData({
        ...formData,
        name: "Document Expiry Reminder",
        description: "Notify employees before key documents expire",
        triggerType: "DOCUMENT_EXPIRING",
        triggerConfig: { daysBefore: 30, documentTypes: [] },
        actions: [
          {
            type: "send_notification",
            config: {
              channels: ["email"],
              recipientType: "employee",
              subject: "Your document is expiring soon",
              message: "Please update your expiring document to stay compliant.",
            },
          },
        ],
      });
      return;
    }
    if (preset === "welcome") {
      setFormData({
        ...formData,
        name: "Welcome New Starter",
        description: "Welcome email and manager task for new employees",
        triggerType: "EMPLOYEE_CREATED",
        triggerConfig: {},
        actions: [
          {
            type: "send_notification",
            config: {
              channels: ["email"],
              recipientType: "employee",
              subject: "Welcome to the team!",
              message: "We’re excited to have you onboard. Here’s what to expect in your first week.",
            },
          },
          {
            type: "create_task",
            config: {
              title: "Complete new starter setup",
              description: "Set up accounts and schedule intro sessions",
              assigneeType: "manager",
              dueDays: 7,
            },
          },
        ],
      });
      return;
    }
    if (preset === "form-followup") {
      setFormData({
        ...formData,
        name: "Form Submission Follow-up",
        description: "Create a task when a key form is submitted",
        triggerType: "FORM_SUBMITTED",
        triggerConfig: { formId: formsOptions[0]?.value || "" },
        actions: [
          {
            type: "create_task",
            config: {
              title: "Review form submission",
              description: "Check responses and follow up if needed",
              assigneeType: "hr",
              dueDays: 3,
            },
          },
        ],
      });
    }
  };

  const attemptSave = () => {
    if (!isFormValid) {
      toast({ title: "Check required fields", description: "Please fix the highlighted items before saving.", variant: "destructive" });
      return;
    }
    if (formData.isActive) {
      setPreflightOpen(true);
      return;
    }
    saveRuleAndMaybeTest(false);
  };

  const handleDuplicateRule = (rule: AutomationRule) => {
    const duplicatedRule = {
      ...rule,
      id: undefined,
      name: `${rule.name} (Copy)`,
      isActive: false,
    };
    setFormData(duplicatedRule);
    setSelectedRule(null);
    setBuilderMode("create");
  };

  // Show builder view when in create/edit mode
  if (builderMode) {
    return (
    <PageShell
      title="Automation Rules"
      description="Create and manage no-code automation rules to streamline HR processes"
      breadcrumbs={breadcrumbConfigs.settingsSection("Automation Rules")}
      showHomeIcon={false}
    >
      <div className="flex h-[calc(100vh-12rem)]">
        {/* Left Sidebar - Rules List */}
        <div className="w-80 flex-shrink-0">
          <AutomationRuleList
            rules={rules}
            selectedRuleId={selectedRule?.id}
            loading={loading}
            onCreateNew={openCreateDialog}
            onSelectRule={(rule) => {
              setFormData(rule);
              setSelectedRule(rule);
            }}
            onEditRule={openEditDialog}
            onDeleteRule={deleteRule}
            onToggleStatus={toggleRuleStatus}
            onRunTest={runDryTest}
            onDuplicateRule={handleDuplicateRule}
          />
        </div>

        {/* Main Builder Area */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <AutomationFlowBuilder
              formData={formData}
              setFormData={setFormData}
              validationErrors={validationErrors}
              triggerTypes={triggerTypes}
              conditionTypes={conditionTypes}
              actionTypes={actionTypes}
              formsOptions={formsOptions}
              templatesOptions={templatesOptions}
              departmentsOptions={departmentsOptions}
              jobRolesOptions={jobRolesOptions}
              usersOptions={usersOptions}
              documentTypeOptions={documentTypeOptions}
              onSave={attemptSave}
              onCancel={() => {
                setBuilderMode(null);
                setSelectedRule(null);
                resetForm();
              }}
              onTest={() => {
                if (selectedRule?.id) {
                  runDryTest(selectedRule);
                }
              }}
              isFormValid={isFormValid}
              selectedRule={selectedRule}
            />
          </div>

          {/* Right Sidebar - Validation Checklist */}
          <div className="w-80 flex-shrink-0 bg-gray-50 border-l p-4 overflow-y-auto">
            <ValidationChecklist
              validationErrors={validationErrors}
              validationHints={validationHints}
              formData={formData}
              onFocusSection={(section) => {
                // Scroll to section in builder
                const element = document.getElementById(`builder-section-${section}`);
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <DryRunResultsDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        results={dryRunResults}
        ruleName={selectedRule?.name}
        onEditRule={() => setTestDialogOpen(false)}
      />

      <PreflightDialog
        open={preflightOpen}
        onOpenChange={setPreflightOpen}
        formData={formData}
        postSaveRunTest={postSaveRunTest}
        onPostSaveRunTestChange={setPostSaveRunTest}
        onConfirm={async () => {
          setPreflightOpen(false);
          await saveRuleAndMaybeTest(postSaveRunTest);
        }}
        onCancel={() => setPreflightOpen(false)}
        getTriggerTypeInfo={getTriggerTypeInfo}
      />
    </PageShell>
  );
}

// Default view - show rules list
return (
  <PageShell
    title="Automation Rules"
    description="Create and manage no-code automation rules to streamline HR processes"
    breadcrumbs={breadcrumbConfigs.settingsSection("Automation Rules")}
    showHomeIcon={false}
  >
    <div className="max-w-6xl mx-auto">
      <AutomationRuleList
        rules={rules}
        loading={loading}
        onCreateNew={openCreateDialog}
        onSelectRule={openEditDialog}
        onEditRule={openEditDialog}
        onDeleteRule={deleteRule}
        onToggleStatus={toggleRuleStatus}
        onRunTest={runDryTest}
        onDuplicateRule={handleDuplicateRule}
      />
    </div>

    {/* Dialogs */}
    <DryRunResultsDialog
      open={testDialogOpen}
      onOpenChange={setTestDialogOpen}
      results={dryRunResults}
      ruleName={selectedRule?.name}
      onEditRule={() => setTestDialogOpen(false)}
    />
  </PageShell>
);
}
