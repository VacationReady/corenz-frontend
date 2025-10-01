/**
 * AI-Powered Workflow Generator
 * Converts natural language to workflow node/edge definitions
 */

import { openai, AI_CONFIG } from "./openai-client";
import { Node, Edge } from "reactflow";
import { actionTypes } from "@/app/(withSidebar)/settings/automation-rules/config/actionTypes";
import { conditionTypes } from "@/app/(withSidebar)/settings/automation-rules/config/conditionTypes";

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

// Build context for AI
function buildWorkflowContext() {
  return `You are a workflow automation expert for an HR system.

Available Trigger Types:
${TRIGGER_TYPES.map((t) => `- ${t}`).join("\n")}

Available Actions (${actionTypes.length} total):
${actionTypes
  .map((a) => `- ${a.id}: ${a.name} - ${a.description}`)
  .join("\n")}

Available Conditions (${conditionTypes.length} total):
${conditionTypes
  .map((c) => `- ${c.id}: ${c.name} - ${c.description}`)
  .join("\n")}

Generate workflows as ReactFlow node/edge structures following this format:
- Triggers start at top (y: 0)
- Each subsequent node is 120px below previous
- All nodes are x: 250 (centered)
- Edges connect source to target with animated: true
- Node IDs must be unique (use trigger-1, action-1, condition-1, etc.)

Node data structure:
{
  id: string,
  type: "trigger" | "action" | "condition" | "delay" | "branch",
  position: { x: number, y: number },
  data: {
    label: string,
    icon: string,
    triggerType?: string,
    actionType?: string,
    conditionType?: string,
    config: { /* field values */ }
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
  "category": "onboarding-probation|leave-time|compliance-documentation|etc",
  "estimatedTime": "Time saved per execution",
  "nodes": [/* array of node objects */],
  "edges": [/* array of edge objects */],
  "explanation": "Step-by-step what happens"
}

Ensure:
1. Start with exactly ONE trigger node
2. Add at least ONE action node
3. Use real action/condition IDs from the available lists
4. Nodes flow vertically (increment y by 120)
5. All IDs are unique`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

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
        category: aiResponse.category,
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

