"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Clock,
  Users,
  Calendar,
  Mail,
  FileText,
  AlertCircle,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowTemplate } from "@/lib/workflows/workflowLibrary";
import { useDepartments, useForms, useUsers } from "@/hooks/useWorkflowReferenceData";
import { toast } from "sonner";

interface CustomizationField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "date";
  value: any;
  options?: { label: string; value: string }[];
  description?: string;
  required?: boolean;
  category?: string;
}

interface WorkflowCustomizationDialogProps {
  workflow: WorkflowTemplate;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customizations: any) => void;
}

export function WorkflowCustomizationDialog({
  workflow,
  isOpen,
  onClose,
  onConfirm,
}: WorkflowCustomizationDialogProps) {
  const [customizations, setCustomizations] = useState<Record<string, any>>({});
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [autoActivate, setAutoActivate] = useState(true);
  const [selectedTab, setSelectedTab] = useState("basic");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load reference data with proper error handling
  const { data: departments, loading: departmentsLoading } = useDepartments();
  const { data: forms, loading: formsLoading } = useForms();
  const { data: users, loading: usersLoading } = useUsers(100);

  // Initialize customizations when workflow or forms change
  useEffect(() => {
    initializeCustomizations();
  }, [workflow, forms]);

  const initializeCustomizations = () => {
    // Initialize with default values from workflow config
    const defaults: Record<string, any> = {};
    
    // Extract customizable fields from workflow
    if (workflow.config.customizable) {
      workflow.config.customizable.forEach(field => {
        // Set sensible defaults based on field name
        if (field.includes('days') || field.includes('Days')) {
          defaults[field] = 7;
        } else if (field.includes('form')) {
          defaults[field] = forms[0]?.id || '';
        } else if (field.includes('notification')) {
          defaults[field] = true;
        }
      });
    }

    setCustomizations(defaults);
  };

  // Generate customization fields based on workflow
  const getCustomizationFields = (): CustomizationField[] => {
    const fields: CustomizationField[] = [];

    // Parse workflow nodes to find customizable elements
    workflow.nodes.forEach(node => {
      if (node.data?.config) {
        const config = node.data.config;

        // Timing customizations
        if (config.daysBefore !== undefined) {
          fields.push({
            id: 'daysBefore',
            label: 'Days Before Trigger',
            type: 'number',
            value: config.daysBefore || 30,
            description: 'How many days in advance to trigger this workflow',
            category: 'timing',
          });
        }

        if (config.dueDays !== undefined || config.dueInDays !== undefined) {
          fields.push({
            id: 'dueDays',
            label: 'Task Due In (Days)',
            type: 'number',
            value: config.dueDays || config.dueInDays || 7,
            description: 'Number of days until task is due',
            category: 'timing',
          });
        }

        // Form customizations
        if (config.formId) {
          fields.push({
            id: 'formId',
            label: 'Select Form',
            type: 'select',
            value: config.formId,
            options: forms.map(f => ({ label: f.name, value: f.id })),
            description: 'Choose which form to use',
            category: 'forms',
            required: true,
          });
        }

        // Notification customizations
        if (config.channels) {
          fields.push({
            id: 'notificationChannels',
            label: 'Notification Channels',
            type: 'multiselect',
            value: config.channels || ['email'],
            options: [
              { label: 'Email', value: 'email' },
              { label: 'Slack', value: 'slack' },
              { label: 'Teams', value: 'teams' },
              { label: 'In-App', value: 'app' },
            ],
            description: 'How to send notifications',
            category: 'notifications',
          });
        }

        if (config.recipientType) {
          fields.push({
            id: 'recipientType',
            label: 'Send Notifications To',
            type: 'select',
            value: config.recipientType || 'employee',
            options: [
              { label: 'Employee', value: 'employee' },
              { label: 'Manager', value: 'manager' },
              { label: 'HR Team', value: 'hr' },
              { label: 'Department', value: 'department' },
              { label: 'Specific Users', value: 'specific' },
            ],
            description: 'Who should receive notifications',
            category: 'notifications',
          });
        }

        // Department filter
        if (node.type === 'condition' && config.conditionType === 'department') {
          fields.push({
            id: 'departments',
            label: 'Apply to Departments',
            type: 'multiselect',
            value: [],
            options: departments.map(d => ({ label: d.name, value: d.id })),
            description: 'Leave empty for all departments',
            category: 'filters',
          });
        }
      }
    });

    // Add schedule customization for scheduled workflows
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
    if (triggerNode?.data?.config?.schedule) {
      fields.push({
        id: 'schedule',
        label: 'Run Schedule',
        type: 'select',
        value: triggerNode.data.config.schedule,
        options: [
          { label: 'Daily at 9am', value: '0 9 * * *' },
          { label: 'Weekly on Monday', value: '0 9 * * 1' },
          { label: 'Monthly on 1st', value: '0 9 1 * *' },
          { label: 'Quarterly', value: '0 9 1 */3 *' },
        ],
        description: 'When to run this workflow',
        category: 'timing',
      });
    }

    return fields;
  };

  const fields = getCustomizationFields();
  const fieldsByCategory = fields.reduce((acc, field) => {
    const category = field.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {} as Record<string, CustomizationField[]>);

  // Watch fieldsByCategory and workflow props - reset state when they change
  useEffect(() => {
    const categoryKeys = Object.keys(fieldsByCategory);
    const firstCategory = categoryKeys.length > 0 ? categoryKeys[0] : 'basic';
    
    // Reset to first available category
    setSelectedTab(firstCategory);
    
    // Reset to template defaults
    setWorkflowName(workflow.name);
    setAutoActivate(true);
    initializeCustomizations();
  }, [fieldsByCategory, workflow]);

  const handleConfirm = () => {
    const errors: Record<string, string> = {};
    
    // Validate workflow name
    if (!workflowName || workflowName.trim() === "") {
      errors.workflowName = "Workflow name is required";
    }
    
    // Validate required customization fields
    fields.forEach(field => {
      if (field.required) {
        const value = customizations[field.id] ?? field.value;
        
        if (field.type === "text" && (!value || value.trim() === "")) {
          errors[field.id] = `${field.label} is required`;
        } else if (field.type === "select" && (!value || value === "")) {
          errors[field.id] = `${field.label} is required`;
        } else if (field.type === "multiselect" && (!value || value.length === 0)) {
          errors[field.id] = `${field.label} must have at least one selection`;
        } else if (field.type === "number" && (value === null || value === undefined || value === "")) {
          errors[field.id] = `${field.label} is required`;
        }
      }
    });
    
    // If there are validation errors, set them and show toast
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before continuing");
      return;
    }
    
    // Clear errors and proceed
    setValidationErrors({});
    onConfirm({
      name: workflowName,
      autoActivate,
      customizations,
    });
  };

  const renderField = (field: CustomizationField) => {
    const value = customizations[field.id] ?? field.value;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value || ''}
              onChange={(e) => {
                setCustomizations({ ...customizations, [field.id]: e.target.value });
                // Clear error when user starts typing
                if (validationErrors[field.id]) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
              }}
              placeholder={field.description}
              className={validationErrors[field.id] ? "border-destructive" : ""}
            />
            {validationErrors[field.id] && (
              <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value || 0}
              onChange={(e) => {
                setCustomizations({ ...customizations, [field.id]: parseInt(e.target.value) });
                // Clear error when user starts typing
                if (validationErrors[field.id]) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
              }}
              placeholder={field.description}
              className={validationErrors[field.id] ? "border-destructive" : ""}
            />
            {validationErrors[field.id] ? (
              <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
            ) : field.description ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(v) => {
                setCustomizations({ ...customizations, [field.id]: v });
                // Clear error when user makes selection
                if (validationErrors[field.id]) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
              }}
            >
              <SelectTrigger id={field.id} className={validationErrors[field.id] ? "border-destructive" : ""}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors[field.id] ? (
              <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
            ) : field.description ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        );

      case 'multiselect':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <MultiSelect
              options={field.options || []}
              selected={value || []}
              onChange={(values) => {
                setCustomizations({ ...customizations, [field.id]: values });
                // Clear error when user makes selection
                if (validationErrors[field.id]) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
              }}
              placeholder={`Select ${field.label.toLowerCase()}`}
            />
            {validationErrors[field.id] ? (
              <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
            ) : field.description ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.id} className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => setCustomizations({ ...customizations, [field.id]: checked })}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      timing: Clock,
      notifications: Mail,
      forms: FileText,
      filters: Users,
      general: Settings,
    };
    const Icon = icons[category] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customise Workflow</DialogTitle>
          <DialogDescription>
            Would you like to customise any settings before adding this workflow?
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Workflow Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{workflow.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold">{workflow.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {workflow.tags.slice(0, 4).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Settings */}
          <div className="space-y-6 mb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">
                  Workflow Name
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => {
                    setWorkflowName(e.target.value);
                    // Clear error when user starts typing
                    if (validationErrors.workflowName) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.workflowName;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter a custom name for this workflow"
                  className={validationErrors.workflowName ? "border-destructive" : ""}
                />
                {validationErrors.workflowName && (
                  <p className="text-xs text-destructive">{validationErrors.workflowName}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-activate">Activate Immediately</Label>
                  <p className="text-xs text-muted-foreground">
                    Start using this workflow right away
                  </p>
                </div>
                <Switch
                  id="auto-activate"
                  checked={autoActivate}
                  onCheckedChange={setAutoActivate}
                />
              </div>
            </div>
          </div>

          {/* Customization Fields */}
          {fields.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Customizable Settings</h3>
              </div>

              {Object.keys(fieldsByCategory).length > 1 ? (
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid grid-cols-5 w-full mb-4">
                    {Object.keys(fieldsByCategory).map(category => (
                      <TabsTrigger key={category} value={category}>
                        {getCategoryIcon(category)}
                        <span className="ml-2 capitalize">{category}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(fieldsByCategory).map(([category, categoryFields]) => (
                    <TabsContent key={category} value={category} className="space-y-4 mt-4">
                      {categoryFields.map(field => renderField(field))}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="space-y-4">
                  {fields.map(field => renderField(field))}
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This workflow will be added with default settings. You can customise it later in the automation rules.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="w-4 h-4 mr-2" />
            Add Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
