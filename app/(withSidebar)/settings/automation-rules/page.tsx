"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { toast } from "@/hooks/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutomationRuleList } from "./components/AutomationRuleList";
import { WorkflowAppStore } from "./components/WorkflowAppStore";
import { DryRunResultsDialog } from "./components/DryRunResultsDialog";
import { PreflightDialog } from "./components/PreflightDialog";
import EnhancedWorkflowCanvas from "./components/EnhancedWorkflowCanvas";
import { TestRunLauncher } from "./components/TestRunLauncher";
import { TestExecutionViewer } from "./components/TestExecutionViewer";
import {
  Plus,
  Zap,
  Store,
  Layers,
  Sparkles,
  ArrowRight,
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
    icon: <Zap className="w-4 h-4" />,
    configFields: [
      { key: "daysBefore", label: "Days Before Expiry", type: "number", required: true, placeholder: "30" },
      { key: "documentTypes", label: "Document Types", type: "multiselect", options: [] },
    ],
  },
  {
    id: "FORM_SUBMITTED",
    name: "Form Submitted",
    description: "Triggered when a specific form is submitted",
    icon: <Zap className="w-4 h-4" />,
    configFields: [{ key: "formId", label: "Form", type: "select", required: true, options: [] }],
  },
  {
    id: "EMPLOYEE_CREATED",
    name: "Employee Created",
    description: "Triggered when a new employee is added to the system",
    icon: <Zap className="w-4 h-4" />,
    configFields: [],
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
  const [activeTab, setActiveTab] = useState("store");
  
  const [testLauncherOpen, setTestLauncherOpen] = useState(false);
  const [testExecutionOpen, setTestExecutionOpen] = useState(false);
  const [currentTestSessionId, setCurrentTestSessionId] = useState<string | null>(null);
  const [testingRule, setTestingRule] = useState<AutomationRule | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState<AutomationRule>({
    name: "",
    description: "",
    isActive: false,
    triggerType: "",
    triggerConfig: {},
    conditions: [],
    actions: [],
  });

  const [formsOptions, setFormsOptions] = useState<{ value: string; label: string }[]>([]);
  const [usersOptions, setUsersOptions] = useState<{ value: string; label: string }[]>([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRules();
    loadOptions();
    
    const handleRuleIdParam = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const ruleId = params.get("ruleId");
        if (ruleId) {
          try {
            const res = await fetch(`/api/automation-rules/${ruleId}`);
            if (res.ok) {
              const rule = await res.json();
              setFormData(rule as any);
              setSelectedRule(rule as any);
              setBuilderMode("edit");
              setPreviewMode(false);
              const newUrl = window.location.pathname;
              window.history.replaceState({}, "", newUrl);
            }
          } catch (error) {
            console.error("Failed to load rule:", error);
          }
          return true;
        }
      } catch (error) {
        console.error("Error parsing URL parameters:", error);
      }
      return false;
    };
    
    (async () => {
      const handledRuleId = await handleRuleIdParam();
      if (handledRuleId) return;
      
      try {
        const params = new URLSearchParams(window.location.search);
        const previewId = params.get("preview");
        if (previewId) {
          const res = await fetch("/api/automation-rules/templates");
          if (res.ok) {
            const data = await res.json();
            const tpl = (data.templates || []).find((t: any) => t.id === previewId);
            if (tpl) {
              setFormData({
                name: tpl.name,
                description: tpl.description,
                isActive: false,
                triggerType: (tpl.nodes || []).find((n: any) => n.type === "trigger")?.data?.config?.triggerType || "MANUAL",
                triggerConfig: (tpl.nodes || []).find((n: any) => n.type === "trigger")?.data?.config || {},
                conditions: [],
                actions: [],
                workflowDefinition: { nodes: tpl.nodes || [], edges: tpl.edges || [] },
              } as any);
              setSelectedRule(null);
              setBuilderMode("edit");
              setPreviewMode(true);
              toast({
                title: "Template Preview",
                description: "Click the Preview Mode badge to enable editing.",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading template preview:", error);
      }
    })();
  }, []);

  const loadOptions = async () => {
    try {
      const [formsRes, usersRes, docTypesRes] = await Promise.all([
        fetch("/api/forms"),
        fetch("/api/users?limit=1000"),
        fetch("/api/employment-checks/types"),
      ]);

      if (formsRes.ok) {
        const forms = await formsRes.json();
        setFormsOptions(forms.map((f: any) => ({ value: f.id, label: f.name })));
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
      console.warn("Failed loading options:", e);
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
        toast({ title: "Success", description: "Rule deleted successfully" });
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
    setTestingRule(rule);
    setTestLauncherOpen(true);
  };

  const startTestRun = async (config: { skipDelays: boolean; inputOverrides?: any }) => {
    if (!testingRule) return;

    try {
      const ruleId = testingRule.id || "draft";
      const response = await fetch(`/api/automation-rules/${ruleId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(testingRule.id ? {} : {
            workflowDefinition: (testingRule as any).workflowDefinition,
            triggerType: testingRule.triggerType,
            triggerConfig: testingRule.triggerConfig,
            conditions: testingRule.conditions || [],
            actions: testingRule.actions || [],
          }),
          skipDelays: config.skipDelays,
          inputOverrides: config.inputOverrides,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentTestSessionId(result.sessionId);
        setTestLauncherOpen(false);
        setTestExecutionOpen(true);
      } else {
        const error = await response.json().catch(() => ({ error: "Failed to start test" }));
        toast({
          title: "Test Failed",
          description: error.error || "Failed to start test run",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start test",
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
    setPreviewMode(false);
  };

  const openEditDialog = async (rule: AutomationRule, opts?: { preview?: boolean }) => {
    try {
      const res = await fetch(`/api/automation-rules/${rule.id}`);
      const full = res.ok ? await res.json() : rule;
      setFormData(full as any);
      setSelectedRule(full as any);
      setBuilderMode("edit");
      setPreviewMode(!!opts?.preview);
    } catch {
      setFormData(rule);
      setSelectedRule(rule);
      setBuilderMode("edit");
      setPreviewMode(!!opts?.preview);
    }
  };

  const getTriggerTypeInfo = (triggerType: string) => {
    return triggerTypes.find((t) => t.id === triggerType);
  };

  const computeErrors = (data: AutomationRule) => {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors["name"] = "Give your automation a clear name.";
    if (!data.triggerType) errors["triggerType"] = "Select a trigger.";
    return { errors, isValid: Object.keys(errors).length === 0 };
  };

  useEffect(() => {
    const { errors } = computeErrors(formData);
    setValidationErrors(errors);
  }, [formData]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const attemptSave = () => {
    if (!isFormValid) {
      toast({ title: "Check required fields", description: "Please fix the highlighted items.", variant: "destructive" });
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

  // Builder view
  if (builderMode) {
    return (
      <PageShell
        title="Workflow Builder"
        description="Design your automation workflow with the visual builder"
        breadcrumbs={breadcrumbConfigs.settingsSection("Automation Rules")}
        showHomeIcon={false}
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-[calc(100vh-12rem)]"
        >
          <div className="flex-1 flex">
            <div className="flex-1">
              <EnhancedWorkflowCanvas
                workflow={{
                  id: selectedRule?.id || formData.id,
                  name: formData.name,
                  description: formData.description,
                  nodes: ((formData as any).workflowDefinition?.nodes || []),
                  edges: ((formData as any).workflowDefinition?.edges || []),
                }}
                onWorkflowChange={(workflow) => {
                  if (previewMode) return;
                  setFormData({ 
                    ...(formData as any), 
                    workflowDefinition: { 
                      nodes: workflow.nodes, 
                      edges: workflow.edges 
                    } 
                  } as any);
                }}
                onSave={attemptSave}
                onTest={() => {
                  if (selectedRule?.id) {
                    runDryTest(selectedRule);
                  } else {
                    setTestingRule(formData as any);
                    setTestLauncherOpen(true);
                  }
                }}
                onExit={() => {
                  setBuilderMode(null);
                  setSelectedRule(null);
                  setPreviewMode(false);
                }}
                isValid={isFormValid}
                isDirty={JSON.stringify(formData) !== JSON.stringify(selectedRule || {})}
                readOnly={previewMode}
                previewMode={previewMode}
                onRequestEdit={() => setPreviewMode(false)}
              />
            </div>
          </div>
        </motion.div>

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

        <TestRunLauncher
          open={testLauncherOpen}
          onOpenChange={setTestLauncherOpen}
          rule={testingRule || undefined}
          onStartTest={startTestRun}
          employeesOptions={usersOptions}
          formsOptions={formsOptions}
        />

        <TestExecutionViewer
          open={testExecutionOpen}
          onOpenChange={setTestExecutionOpen}
          sessionId={currentTestSessionId || undefined}
          ruleId={testingRule?.id || "draft"}
          ruleName={testingRule?.name}
          onReRun={() => {
            setTestExecutionOpen(false);
            setTestLauncherOpen(true);
          }}
        />
      </PageShell>
    );
  }

  // Main view with beautiful tabs
  return (
    <PageShell
      title="Automation Rules"
      description="Create and manage no-code automation workflows to streamline HR processes"
      breadcrumbs={breadcrumbConfigs.settingsSection("Automation Rules")}
      showHomeIcon={false}
      action={
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={openCreateDialog} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            Build Custom Workflow
          </Button>
        </motion.div>
      }
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-[calc(100vh-12rem)]"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          {/* Beautiful Tab Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 sticky top-0 z-10"
          >
            <TabsList className="h-14 bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="store"
                className="relative px-5 py-3 rounded-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-slate-500 data-[state=active]:text-slate-900 transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 group-data-[state=active]:from-violet-500 group-data-[state=active]:to-purple-500">
                    <Store className="w-4 h-4 text-violet-600 group-data-[state=active]:text-white" />
                  </div>
                  <span>Marketplace</span>
                </span>
                {activeTab === "store" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500"
                    initial={false}
                  />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="my-workflows"
                className="relative px-5 py-3 rounded-lg data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-slate-500 data-[state=active]:text-slate-900 transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>My Workflows</span>
                  {rules.length > 0 && (
                    <Badge className="ml-1.5 bg-blue-100 text-blue-700 border-0 px-2 py-0.5 text-xs font-semibold">
                      {rules.length}
                    </Badge>
                  )}
                </span>
                {activeTab === "my-workflows" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={false}
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Tab Content */}
          <TabsContent value="my-workflows" className="flex-1 m-0 border-0 data-[state=inactive]:hidden">
            <AutomationRuleList
              rules={rules}
              loading={loading}
              onCreateNew={() => {
                setActiveTab("store");
              }}
              onSelectRule={(rule) => setSelectedRule(rule)}
              onEditRule={(rule) => openEditDialog(rule)}
              onDeleteRule={deleteRule}
              onToggleStatus={toggleRuleStatus}
              onRunTest={runDryTest}
              onDuplicateRule={handleDuplicateRule}
              selectedRuleId={selectedRule?.id}
            />
          </TabsContent>

          <TabsContent value="store" className="flex-1 m-0 border-0 data-[state=inactive]:hidden overflow-auto bg-gradient-to-br from-slate-50/50 via-white to-violet-50/30">
            <WorkflowAppStore
              onPreviewWorkflow={(templateId) => {
                const url = `/settings/automation-rules?preview=${encodeURIComponent(templateId)}`;
                window.location.href = url;
              }}
              onInstallWorkflow={async (templateId) => {
                const res = await fetch("/api/automation-rules/templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ templateId, customizations: { autoActivate: true } }),
                });
                if (res.ok) {
                  const data = await res.json();
                  toast({
                    title: "Workflow Installed",
                    description: data.message || "Workflow has been added successfully!",
                  });
                  await fetchRules();
                  setActiveTab("my-workflows");
                } else {
                  toast({
                    title: "Installation Failed",
                    description: "Could not install workflow",
                    variant: "destructive",
                  });
                }
              }}
              onCreateCustom={openCreateDialog}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialogs */}
      <DryRunResultsDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        results={dryRunResults}
        ruleName={selectedRule?.name}
        onEditRule={() => setTestDialogOpen(false)}
      />

      <TestRunLauncher
        open={testLauncherOpen}
        onOpenChange={setTestLauncherOpen}
        rule={testingRule || undefined}
        onStartTest={startTestRun}
        employeesOptions={usersOptions}
        formsOptions={formsOptions}
      />

      <TestExecutionViewer
        open={testExecutionOpen}
        onOpenChange={setTestExecutionOpen}
        sessionId={currentTestSessionId || undefined}
        ruleId={testingRule?.id || "draft"}
        ruleName={testingRule?.name}
        onReRun={() => {
          setTestExecutionOpen(false);
          setTestLauncherOpen(true);
        }}
      />
    </PageShell>
  );
}
