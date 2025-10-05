/**
 * AI Orchestrator
 * The brain that interprets user intent and coordinates all AI actions
 */

import { getSystemContext, buildAIContextString } from "./system-context";
import { getConversation, addMessage, buildContextString } from "./conversation-memory";
import { executeAction, type AIAction, type ActionType } from "./action-executor";
import { generateQuery } from "./query-generator";
import { generateWorkflow } from "./workflow-generator";
import { generateCustomField } from "./field-generator";
import { buildFormConversationally } from "./form-builder";
import { interpretIntent } from "./interpreters/intent-classifier";
import { directListEmployees } from "./direct-queries";
import { isUserConfirming, extractParameters } from "./interpreters/confirmation-detector";
import { 
  needsClarification, 
  expandIntent, 
  generateFollowUps, 
  detectFrustration,
  suggestBetterPhrasing 
} from "./conversational-intelligence";
import { isApprovalRequest } from "./interpreters/confirmation-detector";
import { provideCSVGuidance, generateCSVTemplate, analyzeCSVErrors, suggestFieldMapping } from "./csv-assistant";

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

    // STEP 0: Detect frustration and respond empathetically
    const frustrationCheck = await detectFrustration(userMessage, conversationContext);
    if (frustrationCheck.isFrustrated && frustrationCheck.empatheticResponse) {
      addMessage(userId, companyId, "assistant", frustrationCheck.empatheticResponse);
      return {
        success: true,
        message: frustrationCheck.empatheticResponse,
      };
    }

    // CRITICAL: Check for pending actions FIRST before intent classification
    const pending = conversation.entities.pendingAction;
    
    // Use AI to detect confirmation (handles slang, typos, variations)
    const isConfirmation = pending 
      ? await isUserConfirming(userMessage, `Pending: ${pending.type} at step ${pending.step}`)
      : false;
    
    console.log('[Orchestrator] Pending action:', pending?.type, 'Step:', pending?.step, 'User said:', userMessage, 'Is confirmation:', isConfirmation);
    
    // Also check if user is providing info for pending action (dates, leave type, etc.)
    if (pending) {
      // Check if it's a confirmation
      if (isConfirmation) {
        console.log("[AI Orchestrator] Confirming pending action:", pending.type);
        
        // Check if they want to send for approval (for bulk updates)
        const wantsApproval = pending.type === 'bulk_update' && await isApprovalRequest(userMessage, `Bulk update pending`);
        
        const action: AIAction = {
          type: pending.type as ActionType,
          intent: userMessage,
          parameters: { 
            confirmed: true,
            sendForApproval: wantsApproval, // NEW: Flag for approval flow
          },
          userId,
          companyId,
        };
        
        const result = await executeAction(action);
        
        // Add AI response to conversation
        addMessage(userId, companyId, "assistant", result.message);
        
        return {
          success: result.success,
          message: result.message,
          actionType: pending.type,
          result: result.data,
          undoable: result.undoable,
          undoId: result.undoId,
          suggestions: result.suggestions,
        };
      }
      
      // Check if it's a continuation (providing requested info)
      if (pending.step && userMessage.length > 2 && !userMessage.toLowerCase().startsWith('show') && !userMessage.toLowerCase().startsWith('list')) {
        console.log("[AI Orchestrator] Continuing multi-step action:", pending.type, "step", pending.step);
        
        // Continue the pending action with the user's message as additional info
        const parsedParams = await parseContextualParameters(userMessage, pending);
        
        const action: AIAction = {
          type: pending.type as ActionType,
          intent: userMessage,
          parameters: parsedParams,
          userId,
          companyId,
        };
        
        const result = await executeAction(action);
        
        console.log('[Orchestrator] Action result:', result);
        
        // Add AI response to conversation
        if (result.message) {
          addMessage(userId, companyId, "assistant", result.message);
        }
        
        // If there's a nextStep, return success even if action didn't complete
        return {
          success: result.nextStep ? true : result.success,
          message: result.message || "Let's continue...",
          actionType: pending.type,
          result: result.data,
          requiresConfirmation: result.requiresConfirmation,
          preview: result.preview,
          undoable: result.undoable,
          undoId: result.undoId,
        };
      }
    }

    // STEP 1: Skip clarification for now - let intent classifier handle it
    // The intent classifier is already smart enough to handle vague requests
    // and the individual handlers (workflow, field) have their own vague detection

    // Step 2: AI interprets intent and determines action
    const intent = await interpretIntent(
      userMessage,
      conversationContext,
      systemContextString
    );

    console.log("[AI Orchestrator] Intent:", intent);
    
    // Skip low-confidence expansion - the individual handlers already handle vague requests
    // (handleWorkflowGeneration, handleFieldCreation have built-in vague detection)

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
      case "compliance_sweep":
      case "analytics_digest":
      case "targeted_comms":
      case "policy_rollout":
      case "check_approval_status":
      case "list_pending_approvals":
      case "execute_workflow":
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

      case "csv_help":
      case "csv_guidance":
      case "csv_template":
      case "csv_errors":
      case "csv_mapping":
        result = await handleCSVAssistance(userMessage, companyId, intent.actionType);
        break;

      default:
        result = {
          success: true,
          message: "I'm not sure how to help with that.\n\nI can help you with:\n• **Data queries** - 'Show me sales team salaries'\n• **Bulk actions** - 'Give IT a 10% raise'\n• **Leave booking** - 'Book holiday for Sarah'\n• **CSV imports** - 'Help me with CSV import' or 'Show me CSV template'\n• **Document upload** - Drag & drop files\n• **Workflows** - 'Create alert for expiring contracts'\n\nWhat would you like to do?",
        };
    }

    // Add AI response to conversation
    addMessage(userId, companyId, "assistant", result.message);

    // STEP 3: Generate smart follow-ups if action was successful
    if (result.success && result.actionType && !result.requiresConfirmation) {
      try {
        const followUps = await generateFollowUps(
          `${result.actionType}: ${result.message}`,
          result.result,
          conversationContext
        );
        
        if (followUps && followUps.length > 0) {
          result.suggestions = followUps.slice(0, 3);
        }
      } catch (error) {
        console.error("[Follow-up Generation Error]", error);
        // Don't fail the whole request if follow-ups fail
      }
    }

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
  
  // DIRECT HANDLING: If user says "list them", "show them" after a count query
  const isFollowUpList = /^(list|show|display|who are|what are|names?of|tell me about)\s+(them|those|people|individuals|employees|their|the)/i.test(query) ||
                         /^(list|show|display)\s+(?:individuals|people|employees|names)/i.test(query) ||
                         query.toLowerCase().includes('list them') ||
                         query.toLowerCase().includes('show them') ||
                         (query.toLowerCase().includes('list') && query.toLowerCase().includes('their'));
  
  if (isFollowUpList && conversation.entities.departments && conversation.entities.departments.length > 0) {
    // User wants to list what they just counted - use direct query (server-side only)
    const dept = conversation.entities.departments[conversation.entities.departments.length - 1];
    console.log('[Direct List] Bypassing AI - listing department:', dept);
    
    const directResult = await directListEmployees(companyId, dept);
    
    if (directResult.success) {
      return {
        success: true,
        message: directResult.message,
        actionType: "query",
        result: directResult.data,
      };
    }
    // If direct query failed, fall through to AI query
  }
  
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
          
          // Calculate age if DOB available
          let ageInfo = '';
          if (item.User?.dateOfBirth) {
            const dob = new Date(item.User.dateOfBirth);
            const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            ageInfo = `\n   🎂 Age: ${age} years`;
          }
          
          // Calculate tenure if start date available
          let tenureInfo = '';
          if (item.startDate) {
            const start = new Date(item.startDate);
            const years = Math.floor((new Date().getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            const months = Math.floor(((new Date().getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) % 12);
            if (years > 0) {
              tenureInfo = `\n   📅 Tenure: ${years}y ${months}m`;
            } else {
              tenureInfo = `\n   📅 Tenure: ${months} months`;
            }
          }
          
          const salary = item.salaryAmount ? `\n   💰 Salary: $${Math.round(Number(item.salaryAmount)).toLocaleString()}/year` : '';
          const email = item.User?.email ? `\n   📧 Email: ${item.User.email}` : '';
          answer += `${index + 1}. ${name}${role}${ageInfo}${tenureInfo}${salary}${email}\n`;
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
  // Check if it's a vague request
  const isVague = prompt.toLowerCase().includes('i want to create') || 
                  prompt.toLowerCase().includes('create a workflow') ||
                  prompt.toLowerCase().includes('build a workflow') ||
                  prompt.trim().split(' ').length <= 6;
  
  if (isVague) {
    return {
      success: true,
      message: `What type of workflow would you like to create?\n\nExamples:\n• "Alert HR 60 days before contracts expire"\n• "Send welcome email to new employees"\n• "Remind managers about probation reviews"\n• "Notify team when someone is on leave"`,
      actionType: "workflow",
    };
  }
  
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
    message: `✅ Workflow Generated!\n\n${result.workflow?.name}\n${result.workflow?.description}\n\nSay "Save this workflow" when you're ready to activate it.`,
    actionType: "workflow",
    result: result.workflow,
  };
}

async function handleFieldCreation(
  prompt: string,
  companyId: string
): Promise<OrchestratorResult> {
  // Check if it's a vague request
  const isVague = prompt.toLowerCase().includes('i want to add') || 
                  prompt.toLowerCase().includes('add a field') ||
                  prompt.toLowerCase().includes('custom field') ||
                  prompt.trim().split(' ').length <= 5;
  
  if (isVague) {
    return {
      success: true,
      message: `What type of field would you like to add?\n\nExamples:\n• "Add a T-Shirt Size dropdown"\n• "Add a Parking Space text field"\n• "Add Dietary Requirements"\n• "Add LinkedIn Profile URL"`,
      actionType: "field",
    };
  }
  
  // Detect which section/form the user is referring to
  const promptLower = prompt.toLowerCase();
  let targetSection: "personal-information" | "bank-payroll" | "emergency-contacts" | "custom" = "custom";
  let sectionDisplayName = "Custom Fields";
  
  if (promptLower.includes('personal information') || promptLower.includes('personal info') || 
      promptLower.includes('person details') || promptLower.includes('personal details') ||
      promptLower.includes('personal data')) {
    targetSection = "personal-information";
    sectionDisplayName = "Personal Information";
  } else if (promptLower.includes('bank') || promptLower.includes('payroll') || 
             promptLower.includes('payment')) {
    targetSection = "bank-payroll";
    sectionDisplayName = "Bank & Payroll";
  } else if (promptLower.includes('emergency') || promptLower.includes('contact')) {
    targetSection = "emergency-contacts";
    sectionDisplayName = "Emergency Contacts";
  }
  
  const result = await generateCustomField(prompt, targetSection, companyId);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || "Field creation failed",
    };
  }

  return {
    success: true,
    message: `✅ Field Created!\n\nAdded "${result.field?.label}" to **${sectionDisplayName}**\n\n📍 You can find it in: **Employees > [Any Employee] > ${sectionDisplayName}**\n\n💡 All employees will now have this field available to fill in.`,
    actionType: "field",
    result: result.field,
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
  };
}

// Parse parameters from user message using AI (handles slang, typos, natural language)
async function parseContextualParameters(message: string, pending: any): Promise<any> {
  console.log('[Parse Params] Pending type:', pending.type, 'Step:', pending.step, 'Message:', message);
  
  let expectedType: 'dates' | 'leaveType' | 'employeeName' | 'category' | 'general' = 'general';
  
  if (pending.type === 'book_leave') {
    if (pending.step === 1) expectedType = 'dates';
    else if (pending.step === 2) expectedType = 'leaveType';
  } else if (pending.type === 'document_upload') {
    if (pending.step === 1) expectedType = 'employeeName';
    else if (pending.step === 2) expectedType = 'category';
  }
  
  // Use AI to extract parameters intelligently
  const extracted = await extractParameters(
    message,
    expectedType,
    `Pending action: ${pending.type} at step ${pending.step}\nData so far: ${JSON.stringify(pending.data)}`
  );
  
  console.log('[Parse Params] AI extracted:', extracted);
  
  // Map AI response to expected parameter names
  if (pending.type === 'book_leave') {
    if (pending.step === 1 && extracted.startDate) {
      return {
        startDate: extracted.startDate,
        endDate: extracted.endDate || extracted.startDate,
        dates: message,
      };
    } else if (pending.step === 2 && extracted.value) {
      return { leaveType: extracted.value };
    }
  }
  
  if (pending.type === 'document_upload') {
    if (pending.step === 1 && extracted.value) {
      return { employeeName: extracted.value };
    } else if (pending.step === 2 && extracted.value) {
      return { category: extracted.value };
    }
  }
  
  // Fallback to simple extraction
  return { value: message.trim() };
}

async function handleCSVAssistance(
  userMessage: string,
  companyId: string,
  actionType: string
): Promise<OrchestratorResult> {
  try {
    let result;
    
    switch (actionType) {
      case "csv_template":
        // Extract fields from user message if provided
        const fieldMatch = userMessage.match(/(?:fields?|columns?)\s*[:\-]?\s*([^.]+)/i);
        const fields = fieldMatch 
          ? fieldMatch[1].split(/[,\s]+/).map(f => f.trim()).filter(Boolean)
          : ["firstName", "lastName", "email", "departmentName", "jobRoleName", "startDate"];
        
        result = await generateCSVTemplate(fields, companyId);
        break;
        
      case "csv_errors":
        // This would need error data passed in - for now provide general guidance
        result = await provideCSVGuidance("I'm having errors with my CSV import. What are the most common issues?", companyId);
        break;
        
      case "csv_mapping":
        // Extract user fields from message
        const userFieldsMatch = userMessage.match(/(?:fields?|columns?)\s*[:\-]?\s*([^.]+)/i);
        const userFields = userFieldsMatch 
          ? userFieldsMatch[1].split(/[,\s]+/).map(f => f.trim()).filter(Boolean)
          : [];
        
        if (userFields.length > 0) {
          result = await suggestFieldMapping(userFields, companyId);
        } else {
          result = await provideCSVGuidance("Help me map my CSV fields to the system fields", companyId);
        }
        break;
        
      default:
        result = await provideCSVGuidance(userMessage, companyId);
    }
    
    return {
      success: result.success,
      message: result.message,
      actionType: "csv_help",
      result: result,
    };
  } catch (error: any) {
    console.error("[CSV Assistance Error]", error);
    return {
      success: false,
      message: "I'm having trouble helping with CSV imports right now. Please try again later.",
    };
  }
}

// Removed - users just want their answers, not suggestions

