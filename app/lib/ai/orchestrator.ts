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
import { buildFormConversationally } from "./form-builder";
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
        result = await handleWorkflowGeneration(userMessage, companyId, userId);
        break;
      
      case "save_workflow":
        result = await handleAction(intent, userId, companyId);
        break;

      case "add_field":
        result = await handleFieldCreation(userMessage, companyId);
        break;
      
      case "create_form":
      case "deploy_form":
        result = await handleFormCreation(userMessage, userId, companyId);
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
  // Get conversation context for follow-up questions
  const conversation = getConversation(userId, companyId);
  const conversationContext = buildContextString(conversation);
  
  const result = await generateQuery(query, companyId, userId, conversationContext);
  
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
    // Check if it's leave requests
    if (result.data.length > 0 && result.data[0].startDate && result.data[0].Employee) {
      // Format leave requests
      answer = `**${result.data.length}** ${result.data.length === 1 ? 'person is' : 'people are'} on leave:\n\n`;
      
      result.data.slice(0, 10).forEach((leave: any, index: number) => {
        const name = `${leave.Employee.User.firstName} ${leave.Employee.User.lastName}`;
        const dept = leave.Employee.Department?.name ? ` (${leave.Employee.Department.name})` : '';
        const leaveType = leave.EventCategory?.name || 'Leave';
        const start = new Date(leave.startDate).toLocaleDateString();
        const end = new Date(leave.endDate).toLocaleDateString();
        answer += `${index + 1}. **${name}**${dept}\n   ${leaveType}: ${start} to ${end}\n\n`;
      });
      
      if (result.data.length > 10) {
        answer += `_...and ${result.data.length - 10} more_\n\n`;
      }
    }
    // Check if it's a single person lookup (email query)
    else if (result.data.length === 1 && result.data[0].User?.email) {
      const person = result.data[0];
      const name = `${person.User.firstName} ${person.User.lastName}`;
      answer = `**${name}**\n\n`;
      answer += `📧 **Email:** ${person.User.email}\n`;
      if (person.User.phone) {
        answer += `📱 **Phone:** ${person.User.phone}\n`;
      }
      if (person.Department?.name) {
        answer += `🏢 **Department:** ${person.Department.name}\n`;
      }
      if (person.JobRole?.name) {
        answer += `💼 **Role:** ${person.JobRole.name}\n`;
      }
    }
    // General employee list
    else {
      answer = `Found **${result.data.length}** ${result.data.length === 1 ? 'result' : 'results'}`;
      
      if (result.data.length > 0 && result.data.length <= 10) {
        // Show the list if it's small
        answer += ":\n\n";
        result.data.forEach((item: any, index: number) => {
          const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
          const dept = item.Department?.name ? ` (${item.Department.name})` : '';
          const role = item.JobRole?.name ? ` - ${item.JobRole.name}` : '';
          const email = item.User?.email ? `\n   📧 ${item.User.email}` : '';
          answer += `${index + 1}. **${name}**${dept}${role}${email}\n`;
        });
      } else if (result.data.length > 10) {
        answer += " (showing first 10):\n\n";
        result.data.slice(0, 10).forEach((item: any, index: number) => {
          const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
          const dept = item.Department?.name ? ` (${item.Department.name})` : '';
          answer += `${index + 1}. **${name}**${dept}\n`;
        });
      }
    }
    
    if (result.explanation) {
      answer += `\n_${result.explanation}_`;
    }
  }
  // For aggregate results (salary totals, averages, etc.)
  else if (result.data && typeof result.data === 'object' && 'totalSalary' in result.data) {
    const { totalSalary, averageSalary, employeeCount } = result.data;
    answer = `**💰 Salary Analysis:**\n\n`;
    answer += `• **Total:** $${totalSalary.toLocaleString()}\n`;
    answer += `• **Average:** $${averageSalary.toLocaleString()}\n`;
    answer += `• **Employees:** ${employeeCount}\n`;
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
  companyId: string,
  userId: string
): Promise<OrchestratorResult> {
  const result = await generateWorkflow(prompt, companyId);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || "Workflow generation failed",
    };
  }

  // Store workflow in conversation memory for later saving
  const conv = getConversation(userId, companyId);
  conv.entities.lastGeneratedWorkflow = result.workflow;

  return {
    success: true,
    message: `✅ **Workflow Generated!**\n\n**Name:** ${result.workflow?.name}\n**Category:** Custom (AI-generated)\n**Description:** ${result.workflow?.description}\n\n${result.explanation}\n\n💡 **Next Steps:**\n- To save: Say "Save this workflow"\n- To modify: Describe what you'd like to change\n- To start over: Create a new workflow`,
    actionType: "workflow",
    result: result.workflow,
    suggestions: [
      "Save this workflow",
      "Modify the workflow timing",
      "Add more conditions",
      "Create a different workflow",
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

async function handleFormCreation(
  prompt: string,
  userId: string,
  companyId: string
): Promise<OrchestratorResult> {
  const conversation = getConversation(userId, companyId);
  const conversationContext = buildContextString(conversation);
  
  const result = await buildFormConversationally(prompt, companyId, conversationContext);
  
  if (!result.success) {
    // If needs more info, continue conversation
    if (result.needsInfo) {
      return {
        success: true,
        message: result.needsInfo.question,
        actionType: "form_conversation",
        suggestions: result.needsInfo.options || [
          "Data Screen (editable)",
          "Submission Form (one-time)",
        ],
      };
    }
    
    return {
      success: false,
      message: result.error || "Form creation failed",
    };
  }

  // Store form in conversation for deployment
  conversation.entities.lastGeneratedForm = result.form;

  return {
    success: true,
    message: result.message || "Form designed successfully!",
    actionType: "form",
    result: result.form,
    suggestions: [
      "Deploy this form",
      "Modify the fields",
      "Change visibility settings",
      "Start over",
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

