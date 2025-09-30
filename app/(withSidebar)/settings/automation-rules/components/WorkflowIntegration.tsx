/**
 * Integration component to bridge the enhanced workflow canvas with the existing automation rules page
 */

"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// Dynamically import the enhanced canvas to avoid SSR issues with ReactFlow
const EnhancedWorkflowCanvas = dynamic(
  () => import("./EnhancedWorkflowCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-[800px]" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    ),
  }
);

interface WorkflowIntegrationProps {
  formData: any;
  setFormData: (data: any) => void;
  validationErrors: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
  onTest?: () => void;
  isFormValid: boolean;
  selectedRule?: any;
  previewMode?: boolean;
  readOnly?: boolean;
}

export function WorkflowIntegration({
  formData,
  setFormData,
  validationErrors,
  onSave,
  onCancel,
  onTest,
  isFormValid,
  selectedRule,
  previewMode = false,
  readOnly = false,
}: WorkflowIntegrationProps) {
  // Convert old format to new workflow definition if needed
  const workflowDefinition = formData.workflowDefinition || {
    nodes: [],
    edges: [],
    metadata: {
      name: formData.name,
      description: formData.description,
      isActive: formData.isActive,
    },
  };

  // Handle workflow changes
  const handleWorkflowChange = (workflow: any) => {
    setFormData({
      ...formData,
      workflowDefinition: workflow,
      // Update trigger/action/condition data for backward compatibility
      triggerType: extractTriggerType(workflow),
      triggerConfig: extractTriggerConfig(workflow),
      conditions: extractConditions(workflow),
      actions: extractActions(workflow),
    });
  };

  // Check if workflow has unsaved changes
  const isDirty = selectedRule
    ? JSON.stringify(formData) !== JSON.stringify(selectedRule)
    : formData.workflowDefinition?.nodes?.length > 0;

  return (
    <EnhancedWorkflowCanvas
      workflow={{
        id: selectedRule?.id || formData.id,
        name: formData.name,
        description: formData.description,
        ...workflowDefinition,
      }}
      onWorkflowChange={handleWorkflowChange}
      onSave={onSave}
      onTest={onTest}
      isValid={isFormValid}
      isDirty={isDirty}
      readOnly={readOnly}
      previewMode={previewMode}
    />
  );
}

// Helper functions to extract data for backward compatibility
function extractTriggerType(workflow: any): string {
  const triggerNode = workflow.nodes?.find((n: any) => n.type === "trigger");
  return triggerNode?.data?.config?.triggerType || "MANUAL";
}

function extractTriggerConfig(workflow: any): any {
  const triggerNode = workflow.nodes?.find((n: any) => n.type === "trigger");
  return triggerNode?.data?.config || {};
}

function extractConditions(workflow: any): any[] {
  return (workflow.nodes || [])
    .filter((n: any) => n.type === "condition")
    .map((n: any) => ({
      type: n.data?.config?.conditionType,
      config: n.data?.config || {},
    }));
}

function extractActions(workflow: any): any[] {
  return (workflow.nodes || [])
    .filter((n: any) => n.type === "action")
    .map((n: any) => ({
      type: n.data?.config?.actionType,
      config: n.data?.config || {},
    }))
    .sort((a: any, b: any) => {
      // Sort by position if available
      const nodeA = workflow.nodes.find((n: any) => n.data?.config === a.config);
      const nodeB = workflow.nodes.find((n: any) => n.data?.config === b.config);
      return (nodeA?.position?.y || 0) - (nodeB?.position?.y || 0);
    });
}
