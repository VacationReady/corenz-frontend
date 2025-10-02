/**
 * AI-Powered Workflow Generator
 * Converts natural language to workflow node/edge definitions
 * with conversational multi-turn interactions
 */

import { openai, AI_CONFIG } from "./openai-client";
import { Node, Edge } from "reactflow";
import { actionTypes } from "@/(withSidebar)/settings/automation-rules/config/actionTypes";
import { conditionTypes } from "@/(withSidebar)/settings/automation-rules/config/conditionTypes";
import { prisma } from "@/lib/prisma";

export interface WorkflowGenerationResult {
  success: boolean;
  workflow?: {
    name: string;
    description: string;
    nodes: Node[];
    edges: Edge[];
    category?: string;
    estimatedTime?: string;
  };
  explanation?: string;
  error?: string;
}

// Available trigger types from your system
const TRIGGER_TYPES = [
  "EMPLOYEE_CREATED",
  "EMPLOYEE_START_DATE",
  "CONTRACT_EXPIRING",
  "DOCUMENT_EXPIRING",
  "PROBATION_ENDING",
  "LEAVE_REQUEST_SUBMITTED",
  "FORM_SUBMITTED",
  "MANUAL",
  "SCHEDULED",
];

// Build context for AI - Enhanced for conversational workflow building
function buildWorkflowContext() {
  return `You are a friendly HR automation assistant helping non-technical users build workflows.

Your job is to understand what they want to automate and ask simple, clear questions to build the workflow step-by-step.

WORKFLOW BUILDER UNDERSTANDING:
=================================

1. **TRIGGERS** (When should this workflow start?)
   Ask: "When should this happen?" or "What triggers this?"
   
   Available triggers:
   - EMPLOYEE_CREATED: When a new employee is hired
   - EMPLOYEE_START_DATE: On an employee's start date
   - CONTRACT_EXPIRING: When contracts are about to expire
   - DOCUMENT_EXPIRING: When documents (like passports) expire soon
   - PROBATION_ENDING: When probation period is ending
   - LEAVE_REQUEST_SUBMITTED: When someone requests leave
   - FORM_SUBMITTED: When a form is completed
   - SCHEDULED: At specific times (daily, weekly, monthly)
   - MANUAL: When someone manually triggers it

2. **ACTIONS** (What should happen?)
   Ask: "What should happen next?" or "What would you like to do?"
   
   Available actions (use conversational names):
   - send_email: Send an email to someone
   - create_task: Create a to-do task
   - update_employee: Update employee information
   - send_notification: Send an in-app notification
   - assign_buddy: Assign an onboarding buddy
   - create_training: Assign training course
   - schedule_performance_review: Set up a review
   - send_slack_message: Send Slack notification
   - create_document: Generate a document
   - update_leave_balance: Adjust leave days
   - send_calendar_invite: Send calendar invitation
   - webhook: Send data to external system

3. **CONDITIONS** (Should we check something first?)
   Ask: "Do you want to only do this for certain people?" or "Any conditions?"
   
   Available conditions (use conversational names):
   - department_is: Check department (e.g., "only for Sales")
   - job_role_is: Check job role (e.g., "only for Managers")
   - employment_type_is: Check contract type
   - contract_end_date: Check contract dates
   - probation_status: Check if in probation
   - leave_balance: Check leave days remaining
   - tenure: Check how long they've worked here
   - salary_range: Check salary bracket
   - location: Check office location
   - manager: Check who their manager is

4. **WORKFLOW STRUCTURE**
   - Start with ONE trigger
   - Add actions (what happens)
   - Optionally add conditions (filters)
   - Optionally add delays (wait before doing something)
   - Optionally add branches (if/else logic)

CONVERSATIONAL GUIDANCE:
========================

When building workflows, ask simple questions like:
- "When should this workflow start?"
- "Who should receive the email?"
- "What should the email say?"
- "Do you want to add any conditions? For example, only for certain departments?"
- "Should this happen immediately or after a delay?"
- "Would you like to add anything else?"

Always use friendly, non-technical language. Translate technical terms:
- "trigger" → "when should this start?"
- "action" → "what should happen?"
- "condition" → "who should this apply to?"
- "node" → "step"
- "edge" → "connection"

TECHNICAL OUTPUT FORMAT:
========================

Generate ReactFlow nodes/edges:
- Triggers: y: 0, x: 250
- Each node: 120px below previous
- Node IDs: trigger-1, action-1, condition-1, etc.
- Edges: { source, target, animated: true }

Node structure:
{
  id: string,
  type: "trigger" | "action" | "condition" | "delay" | "branch",
  position: { x: number, y: number },
  data: {
    label: string (user-friendly name),
    icon: string (emoji or icon name),
    triggerType/actionType/conditionType: string,
    config: { field: value, ... }
  }
}`;
}

export async function generateWorkflow(
  prompt: string,
  companyId: string
): Promise<WorkflowGenerationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: buildWorkflowContext(),
        },
        {
          role: "user",
          content: `Create a workflow for: "${prompt}"

Respond with JSON in this exact format:
{
  "name": "Workflow name",
  "description": "What this workflow does",
  "category": "custom",
  "estimatedTime": "Time saved per execution",
  "nodes": [/* array of node objects */],
  "edges": [/* array of edge objects */],
  "explanation": "Step-by-step what happens"
}

IMPORTANT:
- Always set category to "custom" for AI-generated workflows
- Start with exactly ONE trigger node
- Add at least ONE action node
- Use real action/condition IDs from the available lists
- Nodes flow vertically (increment y by 120)
- All IDs are unique
- Use friendly, conversational labels for nodes`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Force category to "custom" for AI-generated workflows
    aiResponse.category = "custom";

    // Validate the workflow structure
    const validationResult = validateWorkflow(aiResponse);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    return {
      success: true,
      workflow: {
        name: aiResponse.name,
        description: aiResponse.description,
        nodes: aiResponse.nodes,
        edges: aiResponse.edges,
        category: "custom", // Always custom for AI workflows
        estimatedTime: aiResponse.estimatedTime,
      },
      explanation: aiResponse.explanation,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate workflow",
    };
  }
}

// Save AI-generated workflow to database
export async function saveWorkflowToDatabase(
  workflow: any,
  userId: string,
  companyId: string
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert ReactFlow nodes/edges to workflow definition
    const workflowDefinition = {
      nodes: workflow.nodes,
      edges: workflow.edges,
    };

    // Create automation rule in database
    const automationRule = await prisma.automationRule.create({
      data: {
        id: workflowId,
        companyId,
        name: workflow.name,
        description: workflow.description || "AI-generated workflow",
        isActive: false, // Start inactive, user can activate
        triggerType: "MANUAL", // Default, will be updated based on trigger node
        triggerConfig: extractTriggerConfig(workflow.nodes),
        conditions: {},
        actions: extractActionsConfig(workflow.nodes),
        workflowDefinition,
        tags: ["ai-generated", "custom"],
        category: "custom", // Always save to custom category
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      workflowId: automationRule.id,
    };
  } catch (error: any) {
    console.error("[Save Workflow Error]", error);
    return {
      success: false,
      error: error.message || "Failed to save workflow",
    };
  }
}

// Extract trigger configuration from nodes
function extractTriggerConfig(nodes: any[]): any {
  const triggerNode = nodes.find(n => n.type === "trigger");
  if (!triggerNode) return {};
  
  return {
    type: triggerNode.data.triggerType,
    config: triggerNode.data.config || {},
  };
}

// Extract actions configuration from nodes
function extractActionsConfig(nodes: any[]): any {
  const actionNodes = nodes.filter(n => n.type === "action");
  
  return {
    actions: actionNodes.map(node => ({
      type: node.data.actionType,
      config: node.data.config || {},
    })),
  };
}

function validateWorkflow(workflow: any): { valid: boolean; error?: string } {
  // Check required fields
  if (!workflow.name || !workflow.nodes || !workflow.edges) {
    return { valid: false, error: "Missing required fields (name, nodes, edges)" };
  }

  // Must have at least one trigger
  const triggers = workflow.nodes.filter((n: any) => n.type === "trigger");
  if (triggers.length === 0) {
    return { valid: false, error: "Workflow must have at least one trigger node" };
  }

  // Must have at least one action
  const actions = workflow.nodes.filter((n: any) => n.type === "action");
  if (actions.length === 0) {
    return { valid: false, error: "Workflow must have at least one action node" };
  }

  // Validate node IDs are unique
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate node ID: ${node.id}` };
    }
    nodeIds.add(node.id);
  }

  // Validate edges reference existing nodes
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      return { valid: false, error: `Edge references non-existent source: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { valid: false, error: `Edge references non-existent target: ${edge.target}` };
    }
  }

  return { valid: true };
}

// Refine an existing workflow based on feedback
export async function refineWorkflow(
  existingWorkflow: any,
  refinementPrompt: string
): Promise<WorkflowGenerationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: buildWorkflowContext(),
        },
        {
          role: "user",
          content: `Here's an existing workflow:
${JSON.stringify(existingWorkflow, null, 2)}

Modify it based on this request: "${refinementPrompt}"

Return the complete updated workflow in the same JSON format.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    const validationResult = validateWorkflow(aiResponse);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    return {
      success: true,
      workflow: aiResponse,
      explanation: `Updated workflow: ${refinementPrompt}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Explain what an existing workflow does
export async function explainWorkflow(workflow: any): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: "You explain HR workflows in simple, non-technical language.",
        },
        {
          role: "user",
          content: `Explain what this workflow does in 2-3 sentences:
${JSON.stringify(workflow, null, 2)}`,
        },
      ],
    });

    return completion.choices[0].message.content || "Unable to explain workflow";
  } catch (error) {
    return "Failed to generate explanation";
  }
}

