/**
 * AI Orchestrator
 * The brain that interprets user intent and coordinates all AI actions
 */

import { getSystemContext, buildAIContextString } from "./system-context";
import { getConversation, addMessage, buildContextString } from "./conversation-memory";
import { executeAction, AIAction, ActionType } from "./action-executor";
import { generateQuery } from "./query-generator";
import { generateWorkflow } from "./workflow-generator";
import { generateCustomField } from "./field-generator";
import { interpretIntent } from "./interpreters/intent-classifier";

export interface OrchestratorResult {
  success: boolean;
  message: string;
  actionType?: string;
  result?: any;
  suggestions?: string[];
  requiresConfirmation?: boolean;
  preview?: any;
  undoable?: boolean;
  undoId?: string;
}

export async function processUserMessage(
  userMessage: string,
  userId: string,
  companyId: string
): Promise<OrchestratorResult> {
  try {
    // Add to conversation history
    addMessage(userId, companyId, "user", userMessage);

    // Get system context and conversation history
    const systemContext = await getSystemContext(companyId);
    const conversation = getConversation(userId, companyId);
    const conversationContext = buildContextString(conversation);
    const systemContextString = buildAIContextString(systemContext);

    // Step 1: AI interprets intent and determines action
    const intent = await interpretIntent(
      userMessage,
      conversationContext,
      systemContextString
    );

    console.log("[AI Orchestrator] Intent:", intent);

    // Step 2: Route to appropriate handler
    let result: OrchestratorResult;

    switch (intent.actionType) {
      case "query_data":
        result = await handleDataQuery(userMessage, companyId, userId);
        break;

      case "update_employee":
      case "book_leave":
      case "schedule_report":
      case "bulk_update":
      case "send_email":
        result = await handleAction(intent, userId, companyId);
        break;

      case "create_workflow":
        result = await handleWorkflowGeneration(userMessage, companyId);
        break;

      case "add_field":
        result = await handleFieldCreation(userMessage, companyId);
        break;

      default:
        result = {
          success: true,
          message: "I'm not sure how to help with that. Try asking about employee data, creating workflows, or adding custom fields.",
          suggestions: [
            "Show me employees without IRD numbers",
            "Create a workflow to alert about expiring contracts",
            "Add a custom field to employee profiles",
          ],
        };
    }

    // Add AI response to conversation
    addMessage(userId, companyId, "assistant", result.message);

    return result;
  } catch (error: any) {
    console.error("[Orchestrator Error]", error);
    return {
      success: false,
      message: `Something went wrong: ${error.message}`,
    };
  }
}


async function handleDataQuery(
  query: string,
  companyId: string,
  userId: string
): Promise<OrchestratorResult> {
  const result = await generateQuery(query, companyId, userId);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || "Query failed",
    };
  }

  // Format the answer with the actual data
  let answer = "";
  
  // If it's a count query, show the number prominently
  if (typeof result.data === 'number') {
    answer = `**${result.data}** ${result.data === 1 ? 'person' : 'people'}`;
    if (result.explanation) {
      answer += `\n\n_${result.explanation}_`;
    }
  } 
  // If it's a list of employees
  else if (Array.isArray(result.data)) {
    answer = `Found **${result.data.length}** ${result.data.length === 1 ? 'result' : 'results'}`;
    
    if (result.data.length > 0 && result.data.length <= 10) {
      // Show the list if it's small
      answer += ":\n\n";
      result.data.forEach((item: any, index: number) => {
        const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
        const dept = item.Department?.name ? ` (${item.Department.name})` : '';
        const role = item.JobRole?.name ? ` - ${item.JobRole.name}` : '';
        answer += `${index + 1}. ${name}${dept}${role}\n`;
      });
    } else if (result.data.length > 10) {
      answer += " (showing first 10):\n\n";
      result.data.slice(0, 10).forEach((item: any, index: number) => {
        const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
        const dept = item.Department?.name ? ` (${item.Department.name})` : '';
        answer += `${index + 1}. ${name}${dept}\n`;
      });
    }
    
    if (result.explanation) {
      answer += `\n_${result.explanation}_`;
    }
  }
  // For other data types
  else if (result.data) {
    answer = JSON.stringify(result.data, null, 2);
    if (result.explanation) {
      answer = `${result.explanation}\n\n\`\`\`\n${answer}\n\`\`\``;
    }
  }
  // Fallback to just explanation
  else {
    answer = result.explanation || "Query executed successfully";
  }

  // Generate contextual suggestions
  const suggestions = generateQuerySuggestions(query, result);

  return {
    success: true,
    message: answer,
    actionType: "query",
    result: result.data,
    suggestions,
  };
}

async function handleAction(
  intent: any,
  userId: string,
  companyId: string
): Promise<OrchestratorResult> {
  const action: AIAction = {
    type: intent.actionType,
    intent: "",
    parameters: intent.parameters,
    userId,
    companyId,
  };

  const result = await executeAction(action);

  return {
    success: result.success,
    message: result.message,
    actionType: intent.actionType,
    result: result.data,
    suggestions: result.nextStep ? [] : generateActionSuggestions(intent.actionType),
    requiresConfirmation: result.requiresConfirmation,
    preview: result.preview,
    undoable: result.undoable,
    undoId: result.undoId,
  };
}

async function handleWorkflowGeneration(
  prompt: string,
  companyId: string
): Promise<OrchestratorResult> {
  const result = await generateWorkflow(prompt, companyId);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || "Workflow generation failed",
    };
  }

  return {
    success: true,
    message: `✅ **Workflow Generated!**\n\n${result.workflow?.name}\n\n${result.explanation}`,
    actionType: "workflow",
    result: result.workflow,
    suggestions: [
      "Save this workflow",
      "Modify the workflow timing",
      "Add more conditions",
    ],
  };
}

async function handleFieldCreation(
  prompt: string,
  companyId: string
): Promise<OrchestratorResult> {
  const result = await generateCustomField(prompt, "custom", companyId);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || "Field creation failed",
    };
  }

  return {
    success: true,
    message: `✅ **Field Created!**\n\n${result.message}`,
    actionType: "field",
    result: result.field,
    suggestions: [
      "Make this field required",
      "Add validation rules",
      "Add another field",
    ],
  };
}

function generateQuerySuggestions(query: string, result: any): string[] {
  const lower = query.toLowerCase();
  
  if (lower.includes("ird") || lower.includes("tax")) {
    return [
      "Create a reminder workflow for employees without IRD",
      "Show me which departments are affected",
      "Email these employees to update their details",
    ];
  }
  
  if (lower.includes("contract") || lower.includes("expir")) {
    return [
      "Create an alert workflow 60 days before expiry",
      "Email these employees about renewal",
      "Show me which departments have expiring contracts",
    ];
  }
  
  if (lower.includes("leave")) {
    return [
      "Show me leave patterns by department",
      "Book leave for an employee",
      "Adjust leave balances",
    ];
  }
  
  return [
    "Create a workflow to automate this",
    "Export this data to Excel",
    "Show me more details",
  ];
}

function generateActionSuggestions(actionType: string): string[] {
  const suggestions: Record<string, string[]> = {
    update_employee: [
      "Update another employee",
      "Undo this change",
      "View employee profile",
    ],
    book_leave: [
      "Book leave for another employee",
      "Check leave balances",
      "View upcoming absences",
    ],
    schedule_report: [
      "Schedule another report",
      "View all scheduled reports",
      "Modify this schedule",
    ],
  };

  return suggestions[actionType] || [
    "What else can I help with?",
    "Show me what you can do",
  ];
}

