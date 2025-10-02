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
          message: "I'm not sure how to help with that.\n\nI can help you with:\n• **Data queries** - 'Show me sales team salaries'\n• **Bulk actions** - 'Give IT a 10% raise'\n• **Leave booking** - 'Book holiday for Sarah'\n• **Document upload** - Drag & drop files\n• **Workflows** - 'Create alert for expiring contracts'\n\nWhat would you like to do?",
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
  
  // If it's a count query, show the number in a conversational way
  if (typeof result.data === 'number') {
    // Extract department from query if present
    const deptMatch = query.match(/(?:in|for)\s+(?:the\s+)?(\w+)\s*(?:team|department)?/i);
    const dept = deptMatch ? deptMatch[1] : null;
    
    if (dept) {
      answer = `There ${result.data === 1 ? 'is' : 'are'} ${result.data} ${result.data === 1 ? 'person' : 'people'} in ${dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase()}.`;
    } else {
      answer = `${result.data} ${result.data === 1 ? 'person' : 'people'}`;
    }
  } 
  // If it's a list of employees
  else if (Array.isArray(result.data)) {
    // Check if it's leave requests
    if (result.data.length > 0 && result.data[0].startDate && result.data[0].Employee) {
      // Format leave requests
      answer = `${result.data.length} ${result.data.length === 1 ? 'person is' : 'people are'} on leave:\n\n`;
      
      result.data.slice(0, 10).forEach((leave: any, index: number) => {
        const name = `${leave.Employee.User.firstName} ${leave.Employee.User.lastName}`;
        const dept = leave.Employee.Department?.name ? ` (${leave.Employee.Department.name})` : '';
        const leaveType = leave.EventCategory?.name || 'Leave';
        const start = new Date(leave.startDate).toLocaleDateString();
        const end = new Date(leave.endDate).toLocaleDateString();
        answer += `${index + 1}. ${name}${dept}\n   ${leaveType}: ${start} to ${end}\n\n`;
      });
      
      if (result.data.length > 10) {
        answer += `...and ${result.data.length - 10} more\n`;
      }
    }
    // Check if it's a single person lookup (email query)
    else if (result.data.length === 1 && result.data[0].User?.email) {
      const person = result.data[0];
      const name = `${person.User.firstName} ${person.User.lastName}`;
      answer = `${name}\n\n`;
      answer += `📧 Email: ${person.User.email}\n`;
      if (person.User.phone) {
        answer += `📱 Phone: ${person.User.phone}\n`;
      }
      if (person.Department?.name) {
        answer += `🏢 Department: ${person.Department.name}\n`;
      }
      if (person.JobRole?.name) {
        answer += `💼 Role: ${person.JobRole.name}\n`;
      }
      if (person.salaryAmount) {
        answer += `💰 Salary: $${Math.round(Number(person.salaryAmount)).toLocaleString()}/year\n`;
      }
    }
    // General employee list
    else {
      if (result.data.length > 0 && result.data.length <= 20) {
        // Extract department from conversation or data
        const deptName = result.data[0]?.Department?.name;
        const headerText = deptName 
          ? `${result.data.length} ${result.data.length === 1 ? 'person' : 'people'} in ${deptName}:`
          : `${result.data.length} ${result.data.length === 1 ? 'person' : 'people'}:`;
        
        answer = `${headerText}\n\n`;
        result.data.forEach((item: any, index: number) => {
          const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
          const role = item.JobRole?.name ? ` - ${item.JobRole.name}` : '';
          const salary = item.salaryAmount ? `\n   💰 Salary: $${Math.round(Number(item.salaryAmount)).toLocaleString()}/year` : '';
          const email = item.User?.email ? `\n   📧 Email: ${item.User.email}` : '';
          answer += `${index + 1}. ${name}${role}${salary}${email}\n`;
        });
      } else if (result.data.length > 20) {
        answer = `${result.data.length} people (showing first 20):\n\n`;
        result.data.slice(0, 20).forEach((item: any, index: number) => {
          const name = item.User ? `${item.User.firstName} ${item.User.lastName}` : item.name || 'Unknown';
          const dept = item.Department?.name ? ` (${item.Department.name})` : '';
          const salary = item.salaryAmount ? ` - $${Math.round(Number(item.salaryAmount)).toLocaleString()}` : '';
          answer += `${index + 1}. ${name}${dept}${salary}\n`;
        });
      } else {
        answer = `${result.data.length} ${result.data.length === 1 ? 'result' : 'results'}`;
      }
    }
    
    // No technical explanation needed for lists
  }
  // For aggregate results (salary totals, averages, etc.)
  else if (result.data && typeof result.data === 'object' && 'totalSalary' in result.data) {
    const { totalSalary, averageSalary, employeeCount } = result.data;
    answer = `💰 Salary Analysis:\n\n`;
    answer += `Total: $${Math.round(totalSalary).toLocaleString()}\n`;
    answer += `Average: $${Math.round(averageSalary).toLocaleString()}\n`;
    answer += `Employees: ${employeeCount}`;
  }
  // For other data types
  else if (result.data) {
    // Format as clean JSON without technical explanation
    answer = `\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
  }
  // Fallback - just say success
  else {
    answer = "✅ Query completed successfully";
  }

  // No suggestions - users just want their data
  return {
    success: true,
    message: answer,
    actionType: "query",
    result: result.data,
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
    message: `✅ **Workflow Generated!**\n\n**${result.workflow?.name}**\n_${result.workflow?.description}_\n\n💡 **Next Steps:**\n- Say "Save this workflow" to activate it\n- Or: "Modify the timing" / "Add more conditions"`,
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

// Removed - users just want their answers, not suggestions

