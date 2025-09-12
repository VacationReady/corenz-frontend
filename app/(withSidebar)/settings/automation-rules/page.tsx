"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "@/hooks/use-toast";
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
  type: "text" | "number" | "select" | "multiselect" | "date" | "boolean";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [dryRunResults, setDryRunResults] = useState<any>(null);

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

  useEffect(() => {
    fetchRules();
  }, []);

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

  const saveRule = async () => {
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
        toast({
          title: "Success",
          description: `Rule ${selectedRule?.id ? "updated" : "created"} successfully`,
        });
        setCreateDialogOpen(false);
        setSelectedRule(null);
        resetForm();
        fetchRules();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to save rule",
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
    setCreateDialogOpen(true);
  };

  const openEditDialog = (rule: AutomationRule) => {
    setFormData(rule);
    setSelectedRule(rule);
    setCreateDialogOpen(true);
  };

  const getTriggerTypeInfo = (triggerType: string) => {
    return triggerTypes.find((t) => t.id === triggerType);
  };

  const getStatusBadge = (rule: AutomationRule) => {
    if (rule.isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <PageShell
      title="Automation Rules"
      description="Create and manage no-code automation rules to streamline HR processes"
      breadcrumbs={breadcrumbConfigs.settingsSection("Automation Rules")}
      showHomeIcon={false}
      action={
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Rules List */}
        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Loading...
                </div>
              </CardContent>
            </Card>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No automation rules
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first automation rule to streamline HR processes
                  </p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => {
              const triggerInfo = getTriggerTypeInfo(rule.triggerType);
              return (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {triggerInfo?.icon}
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {rule.name}
                            {getStatusBadge(rule)}
                          </CardTitle>
                          <CardDescription>
                            {rule.description || triggerInfo?.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runDryTest(rule)}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleRuleStatus(rule.id!, !rule.isActive)
                          }
                        >
                          {rule.isActive ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {rule.isActive ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRule(rule.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Trigger:</span>{" "}
                        {triggerInfo?.name}
                      </div>
                      <div>
                        <span className="font-medium">Conditions:</span>{" "}
                        {rule.conditions?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Actions:</span>{" "}
                        {rule.actions?.length || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Create/Edit Rule Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRule ? "Edit" : "Create"} Automation Rule
              </DialogTitle>
              <DialogDescription>
                Build a no-code automation rule to streamline your HR processes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Document Expiry Reminder"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Input
                    id="rule-description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <Tabs defaultValue="trigger" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="trigger">1. Trigger</TabsTrigger>
                  <TabsTrigger value="conditions">2. Conditions</TabsTrigger>
                  <TabsTrigger value="actions">3. Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="trigger" className="space-y-4">
                  <div>
                    <Label>Select Trigger Type</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {triggerTypes.map((trigger) => (
                        <Card
                          key={trigger.id}
                          className={`cursor-pointer transition-colors ${
                            formData.triggerType === trigger.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              triggerType: trigger.id,
                              triggerConfig: {},
                            })
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              {trigger.icon}
                              <h4 className="font-medium">{trigger.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {trigger.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Trigger Configuration */}
                  {formData.triggerType && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Configure Trigger</h4>
                      {getTriggerTypeInfo(
                        formData.triggerType,
                      )?.configFields.map((field) => (
                        <div key={field.key}>
                          <Label>
                            {field.label}
                            {field.required && " *"}
                          </Label>
                          {field.type === "select" && (
                            <Select
                              value={formData.triggerConfig[field.key] || ""}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  triggerConfig: {
                                    ...formData.triggerConfig,
                                    [field.key]: value,
                                  },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={`Select ${field.label}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === "number" && (
                            <Input
                              type="number"
                              value={formData.triggerConfig[field.key] || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  triggerConfig: {
                                    ...formData.triggerConfig,
                                    [field.key]: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="conditions" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Conditions (Optional)</h4>
                      <p className="text-sm text-muted-foreground">
                        Add conditions to filter when this rule runs
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          conditions: [
                            ...(formData.conditions || []),
                            { type: "", config: {} },
                          ],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Condition
                    </Button>
                  </div>

                  {formData.conditions?.map((condition, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium">Condition {index + 1}</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                conditions: formData.conditions?.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>Condition Type</Label>
                            <Select
                              value={condition.type}
                              onValueChange={(value) => {
                                const updatedConditions = [
                                  ...(formData.conditions || []),
                                ];
                                updatedConditions[index] = {
                                  type: value,
                                  config: {},
                                };
                                setFormData({
                                  ...formData,
                                  conditions: updatedConditions,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition type" />
                              </SelectTrigger>
                              <SelectContent>
                                {conditionTypes.map((condType) => (
                                  <SelectItem
                                    key={condType.id}
                                    value={condType.id}
                                  >
                                    {condType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Condition configuration fields would go here */}
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No conditions added. This rule will run for all matching
                      triggers.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Actions *</h4>
                      <p className="text-sm text-muted-foreground">
                        Define what happens when this rule triggers
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          actions: [
                            ...(formData.actions || []),
                            { type: "", config: {} },
                          ],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Action
                    </Button>
                  </div>

                  {formData.actions?.map((action, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium">Action {index + 1}</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                actions: formData.actions?.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>Action Type</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {actionTypes.map((actionType) => (
                                <Card
                                  key={actionType.id}
                                  className={`cursor-pointer transition-colors ${
                                    action.type === actionType.id
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-primary/50"
                                  }`}
                                  onClick={() => {
                                    const updatedActions = [
                                      ...(formData.actions || []),
                                    ];
                                    updatedActions[index] = {
                                      type: actionType.id,
                                      config: {},
                                    };
                                    setFormData({
                                      ...formData,
                                      actions: updatedActions,
                                    });
                                  }}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      {actionType.icon}
                                      <span className="font-medium text-sm">
                                        {actionType.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {actionType.description}
                                    </p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                          {/* Action configuration fields would go here */}
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No actions added. Add at least one action for this rule.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label>Activate rule immediately</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveRule}
                    disabled={
                      !formData.name ||
                      !formData.triggerType ||
                      !formData.actions?.length
                    }
                  >
                    {selectedRule ? "Update" : "Create"} Rule
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dry Run Test Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dry Run Test Results</DialogTitle>
              <DialogDescription>
                See what would happen if this rule ran right now
              </DialogDescription>
            </DialogHeader>

            {dryRunResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dryRunResults.matchingEmployees || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Matching Employees
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dryRunResults.actionsToRun || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Actions to Run
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dryRunResults.estimatedRuntime || 0}s
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Est. Runtime
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {dryRunResults.preview && (
                  <div>
                    <h4 className="font-medium mb-2">Preview Actions</h4>
                    <div className="space-y-2">
                      {dryRunResults.preview.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <div>
                            <div className="font-medium">{item.action}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
