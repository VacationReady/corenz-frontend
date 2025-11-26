/**
 * AI Orchestrator
 * The brain that interprets user intent and coordinates all AI actions
 */

import { getSystemContext, buildAIContextString } from "./system-context";
import { getConversation, addMessage, buildContextString, setEntityContext } from "./conversation-memory";
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
import {
  generateProactiveSuggestions,
  generateRichClarification,
  determineConfidenceStrategy,
  detectUserPatterns,
  generateProactiveInsights,
} from "./advanced-conversational-intelligence";
import { isApprovalRequest } from "./interpreters/confirmation-detector";
import { provideCSVGuidance, generateCSVTemplate, analyzeCSVErrors, suggestFieldMapping } from "./csv-assistant";
import { processSurveyRequest } from "./survey-assistant";
import { processSurveyAutomationRequest } from "./survey-automation-assistant";
import { journeyAssistant } from "./journey-assistant";
import { handlePerformanceAssistantRequest } from "./performance-assistant";
import { handleActionItemsRequest as handleActionItemsAssistantRequest } from "./action-items-assistant";
import { 
  handleIntegratedAutomation,
  handleMultiFunctionWorkflow,
  handleSmartBulkOperations,
  handleIntelligentCommunications,
  handleDynamicFormBuilding
} from "./integration-orchestrator";
import { hrKnowledgeBase } from "./knowledge-base";
import { proactiveIntelligence } from "./proactive-intelligence";
import { reasoningEngine } from "./reasoning-engine";
import { crossDomainIntelligence } from "./cross-domain-intelligence";
import { summarizeConversation, resolveReferences } from "./conversation-memory";
import { personalizationEngine } from "./personalization-engine";
import { notificationEngine } from "./notification-engine";

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
  reasoning?: any; // Chain-of-thought reasoning trace
  confidence?: number; // Confidence score (0-1)
  alternatives?: any[]; // Alternative solutions/approaches
  insights?: any[]; // Proactive insights
}

export async function processUserMessage(
  userMessage: string,
  userId: string,
  companyId: string,
  requestContext?: any
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

    // STEP 0.5: Check if we're in Journey Designer mode from request context
    // If so, route ALL questions to the journey assistant (it will handle them appropriately)
    const isJourneyDesignerMode = requestContext?.mode === "journey_designer" || 
                                   requestContext?.type === "journey_design";
    
    if (isJourneyDesignerMode) {
      console.log("[Orchestrator] Journey Designer mode detected - routing to journey assistant");
      
      // Route directly to journey handler without going through intent classification
      // This ensures ALL questions in the journey designer interface are handled by the journey assistant
      const result = await handleJourneyRequest(userMessage, companyId, userId, { 
        actionType: "journey_design",
        parameters: {},
        context: requestContext 
      });
      
      return result;
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
      // Use typeof check because step 0 is valid but falsy
      if (typeof pending.step === 'number' && userMessage.length > 2 && !userMessage.toLowerCase().startsWith('show') && !userMessage.toLowerCase().startsWith('list')) {
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

      case "create_survey":
      case "send_survey":
      case "analyze_survey":
      case "track_completion":
      case "digest_results":
      case "survey_status":
        result = await handleSurveyRequest(userMessage, companyId, userId);
        break;

      case "create_survey_automation":
      case "create_complex_automation":
        result = await handleSurveyAutomationRequest(userMessage, companyId, userId, intent.parameters);
        break;

      case "conversational_guidance":
        // Handle vague requests by asking intelligent questions
        result = await handleConversationalGuidance(userMessage, companyId, userId, intent.parameters);
        break;

      case "integrated_automation":
        result = await handleIntegratedAutomation(userMessage, companyId, userId, intent.parameters);
        break;

      case "multi_function_workflow":
        result = await handleMultiFunctionWorkflow(userMessage, companyId, userId, intent.parameters);
        break;

      case "smart_bulk_operations":
        result = await handleSmartBulkOperations(userMessage, companyId, userId, intent.parameters);
        break;

      case "intelligent_communications":
        result = await handleIntelligentCommunications(userMessage, companyId, userId, intent.parameters);
        break;

      case "dynamic_form_building":
        result = await handleDynamicFormBuilding(userMessage, companyId, userId, intent.parameters);
        break;

      case "create_journey":
      case "optimize_journey":
      case "add_experience_block":
      case "create_experiment":
      case "analyze_performance":
      case "suggest_improvements":
      case "add_decision_gateway":
      case "generate_content":
      case "journey_design":
        result = await handleJourneyRequest(userMessage, companyId, userId, intent);
        break;

      case "create_objective":
      case "update_objective":
      case "view_objectives":
      case "schedule_one_to_one":
      case "create_review_cycle":
      case "track_action_items":
      case "performance_analytics":
      case "performance_help":
        result = await handlePerformanceRequest(userMessage, companyId, userId, intent);
        break;

      case "action_items_help":
      case "action_items_overview":
      case "action_items_integrations":
      case "action_items_performance":
      case "action_items_admin":
      case "action_items_filter":
      case "action_items_reminder":
      case "action_items_export":
        result = await handleActionItemsRequest(userMessage, companyId, userId, intent);
        break;

      // NEW: Enhanced AI capabilities
      case "get_hr_advice":
      case "check_compliance":
      case "compare_benchmarks":
        result = await handleHRKnowledgeRequest(userMessage, companyId, userId, intent);
        break;

      case "run_health_check":
      case "detect_anomalies":
      case "predict_risks":
        result = await handleProactiveIntelligence(userMessage, companyId, userId, intent);
        break;

      case "solve_complex_problem":
      case "explain_why":
      case "analyze_impact":
        result = await handleReasoningRequest(userMessage, companyId, userId, intent);
        break;

      // NEW: Phase 2 - Cross-Domain Intelligence
      case "analyze_correlations":
      case "find_root_cause":
      case "unified_recommendations":
      case "predict_cross_domain_impact":
        result = await handleCrossDomainAnalysis(userMessage, companyId, userId, intent);
        break;

      // NEW: Phase 2 - Enhanced Memory
      case "summarize_conversation":
        result = await handleConversationSummary(userMessage, companyId, userId);
        break;

      // NEW: Phase 2 - Personalization
      case "show_shortcuts":
      case "show_patterns":
        result = await handlePersonalizationRequest(userMessage, companyId, userId, intent);
        break;

      // NEW: Phase 2 - Proactive Notifications
      case "show_notifications":
      case "daily_digest":
      case "check_alerts":
        result = await handleNotificationRequest(userMessage, companyId, userId, intent);
        break;

      default:
        result = {
          success: true,
          message: "I'm not sure how to help with that.\n\nI can help you with:\n• **Performance Management** - 'Create company objective', 'Schedule 1-2-1s with my team', 'Show objectives at risk', 'Launch annual reviews'\n• **Journey Designer** - 'Create an onboarding journey' or 'Design employee experience for new hires'\n• **Journey Optimization** - 'Optimize the onboarding journey' or 'Suggest improvements for this journey'\n• **Experience Blocks** - 'Add a survey to the journey' or 'Insert training module after welcome email'\n• **A/B Experiments** - 'Test welcome email timing' or 'Create experiment for onboarding journey'\n• **Journey Analytics** - 'Show journey performance' or 'How is the onboarding performing?'\n• **Conversational HR** - Just tell me what you want: 'I need surveys' or 'Help with onboarding'\n• **Survey automation** - 'Send eNPS monthly and email results' or 'Automate engagement surveys'\n• **Integrated workflows** - 'When someone joins, send welcome email and schedule survey'\n• **Smart bulk operations** - 'Give sales a raise but get approval first'\n• **Intelligent communications** - 'Email managers but customize by department'\n• **Dynamic forms** - 'Create form that changes based on department'\n• **Data queries** - 'Show me sales team salaries'\n• **Leave booking** - 'Book holiday for Sarah'\n• **CSV imports** - 'Help me with CSV import'\n\nWhat would you like to do?",
        };
    }

    // Add AI response to conversation
    addMessage(userId, companyId, "assistant", result.message);

    // STEP 3: Generate smart proactive suggestions if action was successful
    if (result.success && result.actionType && !result.requiresConfirmation) {
      try {
        // Use advanced conversational intelligence for better suggestions
        const proactiveSuggestions = await generateProactiveSuggestions(
          result.actionType,
          result.result,
          conversationContext
        );
        
        if (proactiveSuggestions && proactiveSuggestions.length > 0) {
          // Convert to simple string array for backward compatibility
          result.suggestions = proactiveSuggestions
            .filter(s => s.confidence > 0.5)
            .slice(0, 3)
            .map(s => s.text);
        }
      } catch (error) {
        console.error("[Proactive Suggestions Error]", error);
        // Fallback to old system if advanced intelligence fails
        try {
          const followUps = await generateFollowUps(
            `${result.actionType}: ${result.message}`,
            result.result,
            conversationContext
          );
          if (followUps && followUps.length > 0) {
            result.suggestions = followUps.slice(0, 3);
          }
        } catch (fallbackError) {
          console.error("[Fallback Suggestions Error]", fallbackError);
          // Don't fail the whole request if follow-ups fail
        }
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

// Helper utilities
function buildFormattedList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.join(" ");
}

function formatTimesheetEntryBullet(entry: any): string {
  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const pad = (value: number) => value.toString().padStart(2, "0");

  const formatDateLabel = (date: Date | null): string => {
    if (!date) return "Unknown date";
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${pad(date.getDate())}`;
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return "—";
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const suffix = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }
    return `${hours}:${minutes} ${suffix}`;
  };

  const entryDate = parseDate(entry.date);
  const startTime = parseDate(entry.startTime);
  const endTime = parseDate(entry.endTime);

  const dateLabel = formatDateLabel(entryDate);
  const timeLabel = `${formatTime(startTime)} – ${formatTime(endTime)}`;
  const hoursWorked = typeof entry.hours === "number" ? entry.hours.toFixed(2).replace(/\.00$/, "") : "0";
  const breakLabel = entry.breakMinutes ? `, break ${entry.breakMinutes}m` : "";
  const typeLabel = entry.entryType ? ` [${String(entry.entryType).toLowerCase()}]` : "";
  const notesLabel = entry.notes ? ` — ${entry.notes}` : "";

  return `• ${dateLabel}: ${timeLabel} (${hoursWorked}h${breakLabel})${typeLabel}${notesLabel}`;
}

async function handleDataQuery(
  query: string,
  companyId: string,
  userId: string
): Promise<OrchestratorResult> {
  // Get conversation context for follow-up questions
  const conversation = getConversation(userId, companyId);
  const conversationContext = buildContextString(conversation);
  
  // VALIDATION: Detect vague/nonsensical queries that should be clarified
  const vaguePhrases = [
    /^show me (some|the) data$/i,
    /^give me (info|information)$/i,
    /^tell me stuff$/i,
    /^what do (we|you) have$/i,
  ];
  
  const isVague = vaguePhrases.some(pattern => pattern.test(query.trim()));
  
  if (isVague) {
    return {
      success: true,
      message: "I'd be happy to help! What specific information would you like?\n\n**Common queries:**\n• Headcount: \"How many employees in sales?\"\n• Salaries: \"What's the average salary in IT?\"\n• Leave: \"Who is on leave today?\"\n• Reports: \"Who reports to [manager name]?\"\n• Tenure: \"Who has been here more than 5 years?\"\n• Contracts: \"Show expiring contracts\"\n\nWhat would you like to know?",
      actionType: "clarification",
    };
  }
  
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

  // VALIDATION: Check for suspicious results that indicate wrong query execution
  const lowerQuery = query.toLowerCase();
  const isReportingQuery = lowerQuery.includes('reports into') || 
                          lowerQuery.includes('reports to') || 
                          lowerQuery.includes('direct reports') ||
                          lowerQuery.includes("'s team");
  
  // If it's a reporting query but returned generic employee list (not reporting structure)
  if (isReportingQuery && Array.isArray(result.data) && result.data.length > 30 && !('directReports' in (result.data as any))) {
    return {
      success: false,
      message: `I couldn't find that manager. Could you provide their full name? For example: "Who reports to John Smith?"`,
      actionType: "clarification",
    };
  }
  
  // If query asks for a specific person but returns many results
  const nameMentioned = query.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/); // "John Smith" pattern
  if (nameMentioned && Array.isArray(result.data) && result.data.length > 20) {
    return {
      success: false,
      message: `I found too many results. Could you be more specific? For example, provide the full name or add more context like the department.`,
      actionType: "clarification",
    };
  }

  // Format the answer with the actual data
  let answer = "";
  
  const timesheetMeta = (result.meta as any)?.timesheet;
  if (timesheetMeta) {
    if (timesheetMeta.kind === "clarification") {
      const clarificationMessage =
        result.explanation || result.error ||
        (typeof result.data === "string" ? result.data : "I need a bit more detail to answer that.");

      return {
        success: false,
        message: clarificationMessage,
        actionType: "clarification",
      };
    }

    if (timesheetMeta.kind === "hours") {
      const hours = typeof result.data === "number" ? result.data : timesheetMeta.totalHours ?? 0;
      const formattedHours = timesheetMeta.formattedHours ?? hours.toString();
      const periodSnippet = timesheetMeta.dateLabel ? ` ${timesheetMeta.dateLabel}` : "";
      const statusSnippet = timesheetMeta.statusLabel ? ` (${timesheetMeta.statusLabel})` : "";

      answer = `${timesheetMeta.employeeName} worked ${formattedHours} hours${periodSnippet}${statusSnippet}.`;

      setEntityContext(userId, companyId, {
        employees: [
          {
            id: timesheetMeta.employeeId,
            name: timesheetMeta.employeeName,
          },
        ],
      });

      return {
        success: true,
        message: answer,
        actionType: "query",
        result: hours,
      };
    }

    if (timesheetMeta.kind === "entries") {
      const entries: any[] = Array.isArray(result.data)
        ? result.data
        : Array.isArray(timesheetMeta.entries)
        ? timesheetMeta.entries
        : [];

      const totalHours = timesheetMeta.totalHours ?? entries.reduce((sum, entry) => sum + (entry.hours ?? 0), 0);
      const periodSnippet = timesheetMeta.dateLabel ? ` ${timesheetMeta.dateLabel}` : "";
      const statusSnippet = timesheetMeta.statusLabel ? ` (${timesheetMeta.statusLabel})` : "";

      if (entries.length === 0) {
        return {
          success: true,
          message: `I couldn't find any time entries for ${timesheetMeta.employeeName}${periodSnippet}${statusSnippet}.`,
          actionType: "query",
          result: entries,
        };
      }

      const bulletList = entries
        .slice(0, 10)
        .map((entry: any) => formatTimesheetEntryBullet(entry))
        .join("\n");

      const moreCount = entries.length > 10 ? entries.length - 10 : 0;
      const moreText = moreCount > 0 ? `\n…and ${moreCount} more entries.` : "";

      answer = `Here are the recent time entries for ${timesheetMeta.employeeName}${periodSnippet}${statusSnippet} (total ${totalHours.toFixed(2)} hours):\n\n${bulletList}${moreText}`;

      setEntityContext(userId, companyId, {
        employees: [
          {
            id: timesheetMeta.employeeId,
            name: timesheetMeta.employeeName,
          },
        ],
      });

      return {
        success: true,
        message: answer,
        actionType: "query",
        result: entries,
      };
    }

    const count = typeof result.data === "number" ? result.data : timesheetMeta.count ?? 0;
    const statusLabel = timesheetMeta.statusLabel || "timesheets";
    const periodText = timesheetMeta.dateLabel ? ` ${timesheetMeta.dateLabel}` : "";
    const hasAny = count > 0;
    const yesNo = hasAny ? "Yes" : "No";
    answer = `${yesNo}${hasAny ? "" : ", there haven't"} ${hasAny ? `${count} ${statusLabel}${periodText}` : `been any ${statusLabel}${periodText}`}.`;

    if (hasAny) {
      answer += `\n\n• ${count} ${statusLabel}${periodText ? ` (${periodText.trim()})` : ""}`;
    }

    return {
      success: true,
      message: answer,
      actionType: "query",
      result: result.data,
    };
  }

  // Check if it's a reporting structure query
  if (result.data && typeof result.data === 'object' && 'directReports' in result.data) {
    const { manager, directReports, indirectReports, totalDirectReports, totalIndirectReports, totalReports, error } = result.data;
    
    if (error) {
      answer = `❌ ${error}`;
    } else {
      const managerName = manager?.name || 'Unknown Manager';
      
      // Start with summary
      answer = `📊 **Reporting Structure for ${managerName}**\n\n`;
      answer += `**Direct Reports:** ${totalDirectReports}\n`;
      answer += `**Indirect Reports (2nd level):** ${totalIndirectReports}\n`;
      answer += `**Total in Hierarchy:** ${totalReports}\n\n`;
      
      // List direct reports
      if (directReports && directReports.length > 0) {
        answer += `---\n\n### 👥 Direct Reports (${directReports.length})\n\n`;
        directReports.forEach((person: any, index: number) => {
          const name = `${person.firstName} ${person.lastName}`;
          const dept = person.Employee?.Department?.name ? ` (${person.Employee.Department.name})` : '';
          const role = person.Employee?.JobRole?.name ? ` - ${person.Employee.JobRole.name}` : '';
          answer += `${index + 1}. **${name}**${dept}${role}\n`;
          if (person.email) {
            answer += `   📧 ${person.email}\n`;
          }
        });
      } else {
        answer += `### 👥 Direct Reports (0)\n\nNo direct reports found.\n`;
      }
      
      // List indirect reports if any
      if (indirectReports && indirectReports.length > 0) {
        answer += `\n---\n\n### 👤 Indirect Reports - 2nd Level (${indirectReports.length})\n\n`;
        indirectReports.slice(0, 20).forEach((person: any, index: number) => {
          const name = `${person.firstName} ${person.lastName}`;
          const dept = person.Employee?.Department?.name ? ` (${person.Employee.Department.name})` : '';
          const role = person.Employee?.JobRole?.name ? ` - ${person.Employee.JobRole.name}` : '';
          answer += `${index + 1}. ${name}${dept}${role}\n`;
        });
        
        if (indirectReports.length > 20) {
          answer += `\n...and ${indirectReports.length - 20} more indirect reports\n`;
        }
      }
    }
  }
  // If it's a count query, show the number in a conversational way
  else if (typeof result.data === 'number') {
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
    // Check if it's leave requests (has Employee relation and is a leave record)
    const isLeaveData = result.data.length > 0 && 
                        result.data[0].Employee && 
                        (result.data[0].startDate !== undefined || result.data[0].EventCategory);
    
    if (isLeaveData) {
      // Format leave requests with safe date handling
      const validLeaves = result.data.filter((leave: any) => leave.Employee?.User);
      
      if (validLeaves.length === 0) {
        answer = "No one is scheduled to be off during that period.";
      } else {
        answer = `${validLeaves.length} ${validLeaves.length === 1 ? 'person is' : 'people are'} off:\n\n`;
        
        validLeaves.slice(0, 10).forEach((leave: any, index: number) => {
          const firstName = leave.Employee?.User?.firstName || '';
          const lastName = leave.Employee?.User?.lastName || '';
          const name = `${firstName} ${lastName}`.trim() || 'Unknown';
          const dept = leave.Employee?.Department?.name ? ` (${leave.Employee.Department.name})` : '';
          const leaveType = leave.EventCategory?.name || 'Leave';
          
          // Safe date formatting - handle null/undefined dates
          let dateRange = '';
          if (leave.startDate) {
            const startDate = new Date(leave.startDate);
            if (!Number.isNaN(startDate.getTime())) {
              const startStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              if (leave.endDate) {
                const endDate = new Date(leave.endDate);
                if (!Number.isNaN(endDate.getTime())) {
                  const endStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  dateRange = `${startStr} to ${endStr}`;
                } else {
                  dateRange = `from ${startStr}`;
                }
              } else {
                dateRange = `from ${startStr}`;
              }
            }
          }
          
          if (dateRange) {
            answer += `${index + 1}. **${name}**${dept}\n   📅 ${leaveType}: ${dateRange}\n\n`;
          } else {
            answer += `${index + 1}. **${name}**${dept}\n   📅 ${leaveType}\n\n`;
          }
        });
        
        if (validLeaves.length > 10) {
          answer += `...and ${validLeaves.length - 10} more\n`;
        }
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
          const roleSuffix = item.JobRole?.name ? ` - ${item.JobRole.name}` : '';
          const deptSuffix = item.Department?.name ? ` (${item.Department.name})` : '';
          const salarySuffix = item.salaryAmount ? ` - $${Math.round(Number(item.salaryAmount)).toLocaleString()}` : '';

          const extraLines: string[] = [];

          if (item.User?.dateOfBirth) {
            const dob = new Date(item.User.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) {
              const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              extraLines.push(`🎂 Age: ${age} years`);
            }
          }

          if (item.startDate) {
            const start = new Date(item.startDate);
            if (!Number.isNaN(start.getTime())) {
              const totalMonths = Math.max(0, Math.floor((Date.now() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
              const years = Math.floor(totalMonths / 12);
              const months = totalMonths % 12;
              const tenureParts: string[] = [];
              if (years > 0) tenureParts.push(`${years}y`);
              if (months > 0) tenureParts.push(`${months}m`);
              if (tenureParts.length > 0) {
                extraLines.push(`📅 Tenure: ${buildFormattedList(tenureParts)}`);
              }
            }
          }

          const baseLine = `${index + 1}. ${name}${roleSuffix}${deptSuffix}${salarySuffix}`;
          if (extraLines.length > 0) {
            answer += `${baseLine}\n   ${extraLines.join('\n   ')}\n`;
          } else {
            answer += `${baseLine}\n`;
          }
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
    if (pending.step === 0) expectedType = 'employeeName'; // Step 0 = waiting for employee name
    else if (pending.step === 1) expectedType = 'dates';
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
    // Step 0: User is providing employee name
    if (pending.step === 0) {
      return { 
        employeeName: extracted.value || message.trim(),
        value: message.trim(), // Also pass raw message for self-booking detection
      };
    }
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

/**
 * Handle survey-related requests
 */
async function handleSurveyRequest(
  userMessage: string,
  companyId: string,
  userId: string
): Promise<OrchestratorResult> {
  try {
    const result = await processSurveyRequest(userMessage, companyId, userId);
    
    return {
      success: result.success,
      message: result.message,
      actionType: result.actionType,
      result: result.data,
      requiresConfirmation: result.requiresConfirmation,
      preview: result.preview,
      suggestions: result.suggestions,
    };
  } catch (error: any) {
    console.error("[Survey Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with survey management right now. Please try again later.",
    };
  }
}

/**
 * Handle survey automation requests
 */
async function handleSurveyAutomationRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<OrchestratorResult> {
  try {
    const result = await processSurveyAutomationRequest(userMessage, companyId, userId, parameters);
    
    return {
      success: result.success,
      message: result.message,
      actionType: result.actionType,
      result: result.data,
      requiresConfirmation: result.requiresConfirmation,
      preview: result.preview,
      suggestions: result.suggestions,
    };
  } catch (error: any) {
    console.error("[Survey Automation Error]", error);
    return {
      success: false,
      message: "I'm having trouble setting up survey automation right now. Please try again later.",
    };
  }
}

/**
 * Handle conversational guidance for vague requests
 */
async function handleConversationalGuidance(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<OrchestratorResult> {
  try {
    // Use the conversational engine to ask intelligent questions
    const { handleConversationalRequest } = await import("./conversational-engine");
    const result = await handleConversationalRequest(userMessage, companyId, userId);
    
    return {
      success: result.success,
      message: result.message,
      actionType: "conversational_guidance",
      requiresConfirmation: false,
      suggestions: result.suggestions,
    };
  } catch (error: any) {
    console.error("[Conversational Guidance Error]", error);
    return {
      success: true,
      message: "I'd love to help! Could you tell me a bit more about what you're trying to accomplish? For example:\n\n• Setting up surveys or feedback collection\n• Automating HR processes\n• Managing employee communications\n• Building forms or workflows\n\nWhat's your main goal?",
      suggestions: ["Set up surveys", "Automate processes", "Manage communications", "Build forms"]
    };
  }
}

/**
 * Handle journey design requests
 */
async function handleJourneyRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    // Build context with journey information if available from request
    const context = {
      mode: "journey_designer" as const,
      journey: intent.context?.journey || null,
      companyId,
      userId,
    };

    const result = await journeyAssistant.processRequest({
      message: userMessage,
      context,
    });
    
    return {
      success: true,
      message: result.message,
      actionType: intent.actionType || "journey_design",
      result: result.journeyUpdates,
      suggestions: result.suggestions,
    };
  } catch (error: any) {
    console.error("[Journey Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with journey design right now. Please try again later.",
    };
  }
}

/**
 * Handle performance management requests (OKRs, 1-2-1s, reviews)
 */
async function handlePerformanceRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    // Get user session info for context
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth-options");
    
    // Get user details for employee ID and role
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        role: true, 
        companyId: true,
        Employee: { select: { id: true } }
      },
    });

    if (!user) {
      return {
        success: false,
        message: "Unable to identify your user account. Please try again.",
      };
    }

    const result = await handlePerformanceAssistantRequest({
      message: userMessage,
      context: {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        employeeId: user.Employee?.id,
      },
    });
    
    return {
      success: true,
      message: result.response,
      actionType: intent.actionType || "performance_help",
      suggestions: result.suggestedActions?.map(a => a.label),
    };
  } catch (error: any) {
    console.error("[Performance Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with performance management right now. Please try again later.",
    };
  }
}

/**
 * Handle action items requests (overview, help, integrations)
 */
async function handleActionItemsRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    const result = await handleActionItemsAssistantRequest({
      userMessage,
      companyId,
      userId,
      intent,
    });
    
    return {
      success: result.success,
      message: result.message,
      actionType: result.actionType || intent.actionType || "action_items_help",
    };
  } catch (error: any) {
    console.error("[Action Items Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with action items information right now. Please try again later.",
    };
  }
}

/**
 * Handle HR knowledge base requests (compliance, benchmarks, best practices)
 */
async function handleHRKnowledgeRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    const systemContext = await getSystemContext(companyId);

    switch (intent.actionType) {
      case "check_compliance":
        const complianceInsights = await hrKnowledgeBase.checkCompliance(companyId);
        const complianceRules = await hrKnowledgeBase.getRelevantComplianceRules(companyId);
        
        const criticalIssues = complianceInsights.filter(i => i.priority === 'critical' || i.priority === 'high');
        
        let message = "## Compliance Check Results\n\n";
        if (criticalIssues.length === 0) {
          message += "Good news! No critical compliance issues detected.\n\n";
        } else {
          message += `${criticalIssues.length} issue(s) require attention:\n\n`;
          criticalIssues.forEach(issue => {
            message += `### ${issue.title}\n${issue.description}\n\n`;
            message += `**Recommendation:** ${issue.recommendation}\n\n`;
            message += `**Impact:** ${issue.impact}\n\n`;
            message += `---\n\n`;
          });
        }

        message += `\n**Compliance Rules Applied:**\n`;
        complianceRules.slice(0, 3).forEach(rule => {
          message += `• ${rule.title} (${rule.severity})\n`;
        });

        return {
          success: true,
          message,
          actionType: "check_compliance",
          result: { insights: complianceInsights, rules: complianceRules },
          suggestions: criticalIssues.length > 0 ? [
            "Show me how to fix these issues",
            "Run detailed compliance audit",
            "Generate compliance report"
          ] : [
            "Check specific compliance area",
            "View all compliance rules",
            "Schedule regular compliance checks"
          ]
        };

      case "compare_benchmarks":
        // Calculate current metrics
        const turnoverRate = 12; // Would calculate from actual data
        const benchmarkInsights = await hrKnowledgeBase.compareToBenchmarks(companyId, [
          { metric: 'turnover_rate', value: turnoverRate }
        ]);

        message = "## Benchmark Comparison\n\n";
        if (benchmarkInsights.length > 0) {
          benchmarkInsights.forEach(insight => {
            message += `### ${insight.title}\n${insight.description}\n\n`;
            message += `**Recommendation:** ${insight.recommendation}\n\n`;
            message += `**Impact:** ${insight.impact}\n\n`;
          });
        } else {
          message += "Your metrics are in line with industry benchmarks. Keep up the good work!\n\n";
          message += `**Your turnover rate:** ${turnoverRate}% (Industry avg: 13.2%)\n`;
        }

        return {
          success: true,
          message,
          actionType: "compare_benchmarks",
          result: benchmarkInsights
        };

      case "get_hr_advice":
      default:
        const advice = await hrKnowledgeBase.getHRAdvice(userMessage, { companyId });
        
        return {
          success: true,
          message: advice,
          actionType: "get_hr_advice",
          suggestions: [
            "Check compliance status",
            "Compare to industry benchmarks",
            "Get best practice recommendations"
          ]
        };
    }
  } catch (error: any) {
    console.error("[HR Knowledge Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble accessing HR knowledge base right now. Please try again later.",
    };
  }
}

/**
 * Handle proactive intelligence requests (health checks, anomaly detection, predictions)
 */
async function handleProactiveIntelligence(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    const systemContext = await getSystemContext(companyId);

    switch (intent.actionType) {
      case "run_health_check":
        const healthCheck = await proactiveIntelligence.runHealthCheck(companyId);
        
        const statusEmoji = healthCheck.status === 'excellent' ? '' : 
                            healthCheck.status === 'good' ? '' : 
                            healthCheck.status === 'needs_attention' ? '' : '';

        let message = `${statusEmoji} **System Health Check**\n\n`;
        message += `**Overall Score:** ${healthCheck.overallScore}/100 (${healthCheck.status})\n\n`;
        message += `${healthCheck.summary}\n\n`;
        
        message += `### Area Breakdown\n`;
        Object.entries(healthCheck.areas).forEach(([area, health]) => {
          const areaEmoji = health.status === 'excellent' ? '' : 
                           health.status === 'good' ? '' : 
                           health.status === 'needs_attention' ? '' : '';
          message += `\n**${areaEmoji} ${area.charAt(0).toUpperCase() + area.slice(1)}:** ${health.score}/100\n`;
          
          if (health.issues.length > 0) {
            message += `Issues: ${health.issues.slice(0, 2).join(', ')}\n`;
          }
        });

        if (healthCheck.anomalies.length > 0) {
          message += `\n\n### Anomalies Detected (${healthCheck.anomalies.length})\n`;
          healthCheck.anomalies.slice(0, 3).forEach(anomaly => {
            message += `\n**${anomaly.description}**\n`;
            message += `Current: ${anomaly.currentValue} | Expected: ${anomaly.expectedValue}\n`;
            message += `Top recommendation: ${anomaly.recommendations[0]}\n`;
          });
        }

        if (healthCheck.insights.length > 0) {
          message += `\n\n### Predictive Insights (${healthCheck.insights.length})\n`;
          healthCheck.insights.slice(0, 2).forEach(insight => {
            message += `\n**${insight.title}**\n`;
            message += `${insight.prediction}\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "run_health_check",
          result: healthCheck,
          insights: healthCheck.insights,
          suggestions: [
            "Show detailed anomaly analysis",
            "Get recommendations to improve score",
            "Schedule regular health checks"
          ]
        };

      case "detect_anomalies":
        const anomalies = await proactiveIntelligence.detectAnomalies(companyId, systemContext);
        
        message = `## Anomaly Detection Results\n\n`;
        if (anomalies.length === 0) {
          message += "No anomalies detected. All metrics are within normal ranges.\n";
        } else {
          message += `Found **${anomalies.length} anomaly/anomalies**:\n\n`;
          anomalies.forEach((anomaly, idx) => {
            message += `### ${idx + 1}. ${anomaly.description}\n`;
            message += `**Severity:** ${anomaly.severity.toUpperCase()}\n`;
            message += `**Deviation:** ${anomaly.deviation.toFixed(1)}% from expected\n`;
            message += `**Possible causes:** ${anomaly.possibleCauses.slice(0, 2).join(', ')}\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "detect_anomalies",
          result: anomalies
        };

      case "predict_risks":
        const predictions = await proactiveIntelligence.generatePredictiveInsights(companyId, systemContext);
        
        message = `## Risk Predictions & Forecasts\n\n`;
        if (predictions.length === 0) {
          message += "No significant risks detected in the near term.\n";
        } else {
          predictions.forEach((prediction, idx) => {
            message += `### ${idx + 1}. ${prediction.title}\n`;
            message += `${prediction.description}\n\n`;
            message += `**Prediction:** ${prediction.prediction}\n`;
            message += `**Timeframe:** ${prediction.timeframe}\n`;
            message += `**Confidence:** ${(prediction.confidence * 100).toFixed(0)}%\n\n`;
            if (prediction.preventiveActions && prediction.preventiveActions.length > 0) {
              message += `**Preventive actions:**\n`;
              prediction.preventiveActions.slice(0, 3).forEach(action => {
                message += `• ${action}\n`;
              });
            }
            message += `\n---\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "predict_risks",
          result: predictions
        };

      default:
        return {
          success: false,
          message: "Unknown proactive intelligence request type."
        };
    }
  } catch (error: any) {
    console.error("[Proactive Intelligence Error]", error);
    return {
      success: false,
      message: "I'm having trouble running proactive analysis right now. Please try again later.",
    };
  }
}

/**
 * Handle reasoning requests (complex problems, explanations, impact analysis)
 */
async function handleReasoningRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    switch (intent.actionType) {
      case "solve_complex_problem":
        const problem = {
          description: userMessage,
          context: { companyId, userId },
          constraints: intent.parameters?.constraints,
          goals: intent.parameters?.goals
        };

        const solution = await reasoningEngine.solveComplexProblem(problem, companyId, userId);
        
        let message = `## Problem Solution\n\n`;
        message += `**Problem:** ${solution.problem}\n\n`;
        message += `**Solution:** ${solution.solution}\n\n`;
        
        message += `### Reasoning Process\n`;
        if (solution.reasoning.steps.length > 0) {
          solution.reasoning.steps.slice(0, 5).forEach((step, idx) => {
            message += `\n**Step ${step.stepNumber}:**\n`;
            message += `Thought: ${step.thought}\n`;
            if (step.action) message += `Action: ${step.action}\n`;
            if (step.observation) message += `Observation: ${step.observation}\n`;
          });
        }

        message += `\n\n### Implementation Steps\n`;
        solution.implementationSteps.slice(0, 5).forEach((step, idx) => {
          message += `${idx + 1}. ${step}\n`;
        });

        message += `\n\n**Confidence:** ${(solution.reasoning.confidence * 100).toFixed(0)}%\n`;
        message += `**Estimated Time:** ${solution.estimatedTime}\n`;

        return {
          success: true,
          message,
          actionType: "solve_complex_problem",
          result: solution,
          reasoning: solution.reasoning,
          confidence: solution.reasoning.confidence,
          alternatives: solution.reasoning.alternativeSolutions,
          suggestions: [
            "Show alternative approaches",
            "Explain reasoning in detail",
            "Identify potential risks"
          ]
        };

      case "explain_why":
        const decision = intent.parameters?.decision || userMessage;
        const context = { companyId, userId };
        
        const explanation = await reasoningEngine.explainWhy(userMessage, decision, context);
        
        message = `## Why Explanation\n\n`;
        message += `**Question:** ${explanation.question}\n\n`;
        message += `**Short Answer:** ${explanation.shortAnswer}\n\n`;
        message += `**Detailed Reasoning:**\n${explanation.detailedReasoning}\n\n`;
        message += `**Evidence Used:**\n`;
        explanation.evidenceUsed.forEach(evidence => {
          message += `• ${evidence}\n`;
        });

        return {
          success: true,
          message,
          actionType: "explain_why",
          result: explanation
        };

      case "analyze_impact":
        const action = intent.parameters?.action || userMessage;
        const context2 = { companyId, userId };
        
        const impactAnalysis = await reasoningEngine.analyzeImpact(action, context2, companyId);
        
        message = `## Impact Analysis\n\n`;
        message += `**Action:** ${action}\n\n`;
        
        message += `### Direct Impacts\n`;
        impactAnalysis.directImpacts.forEach(impact => {
          message += `• ${impact}\n`;
        });
        
        message += `\n### Indirect Impacts\n`;
        impactAnalysis.indirectImpacts.forEach(impact => {
          message += `• ${impact}\n`;
        });
        
        message += `\n### Risks\n`;
        impactAnalysis.risks.forEach(risk => {
          message += `• ${risk}\n`;
        });
        
        message += `\n### Benefits\n`;
        impactAnalysis.benefits.forEach(benefit => {
          message += `• ${benefit}\n`;
        });

        message += `\n**Time to Realize:** ${impactAnalysis.timeToRealize}\n`;

        return {
          success: true,
          message,
          actionType: "analyze_impact",
          result: impactAnalysis
        };

      default:
        return {
          success: false,
          message: "Unknown reasoning request type."
        };
    }
  } catch (error: any) {
    console.error("[Reasoning Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with advanced reasoning right now. Please try again later.",
    };
  }
}

// ==================== PHASE 2 HANDLERS ====================

/**
 * Handle cross-domain intelligence requests
 */
async function handleCrossDomainAnalysis(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    const systemContext = await getSystemContext(companyId);

    switch (intent.actionType) {
      case "analyze_correlations":
        const correlations = await crossDomainIntelligence.analyzeCorrelations(companyId);
        
        let message = `## 🔗 Cross-Domain Analysis\n\n`;
        if (correlations.length === 0) {
          message += "No significant correlations detected. Your HR data appears well-balanced.\n";
        } else {
          message += `Found **${correlations.length} meaningful correlation${correlations.length > 1 ? 's' : ''}**:\n\n`;
          correlations.forEach((corr, idx) => {
            message += `### ${idx + 1}. ${corr.description}\n`;
            message += `**Domains:** ${corr.domain1} ↔️ ${corr.domain2}\n`;
            message += `**Strength:** ${(corr.strength * 100).toFixed(0)}% | **Confidence:** ${(corr.confidence * 100).toFixed(0)}%\n`;
            message += `**Implication:** ${corr.implication}\n\n`;
            message += `**Evidence:**\n`;
            corr.evidencePoints.slice(0, 3).forEach(evidence => {
              message += `• ${evidence}\n`;
            });
            message += `\n---\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "analyze_correlations",
          result: correlations,
          suggestions: [
            "Find root cause of top correlation",
            "Get unified recommendations",
            "Predict impact of addressing these"
          ]
        };

      case "find_root_cause":
        const symptom = intent.parameters?.symptom || userMessage.replace(/.*(?:root cause|causing|why)/i, '').trim();
        const rootCause = await crossDomainIntelligence.findRootCause(symptom, companyId);
        
        message = `## 🔍 Root Cause Analysis\n\n`;
        message += `**Symptom:** ${rootCause.symptom}\n\n`;
        
        message += `### Root Causes Identified\n\n`;
        rootCause.rootCauses.forEach((cause, idx) => {
          message += `**${idx + 1}. ${cause.description}** (${cause.domain})\n`;
          message += `Likelihood: ${(cause.likelihood * 100).toFixed(0)}% | Impact: ${cause.impact}\n`;
          message += `Evidence:\n`;
          cause.evidence.slice(0, 2).forEach(ev => {
            message += `• ${ev}\n`;
          });
          message += `\n`;
        });

        message += `\n**Contributing Factors:**\n`;
        rootCause.contributingFactors.forEach(factor => {
          message += `• ${factor}\n`;
        });

        message += `\n\n**💡 Recommendation:** ${rootCause.recommendation}\n`;
        message += `**Confidence:** ${(rootCause.confidence * 100).toFixed(0)}%\n`;

        return {
          success: true,
          message,
          actionType: "find_root_cause",
          result: rootCause,
          confidence: rootCause.confidence
        };

      case "unified_recommendations":
        const recommendations = await crossDomainIntelligence.generateUnifiedRecommendations(companyId);
        
        message = `## 💡 Unified HR Recommendations\n\n`;
        if (recommendations.length === 0) {
          message += "Your HR system is performing well. No urgent recommendations at this time.\n";
        } else {
          recommendations.forEach((rec, idx) => {
            const priorityEmoji = rec.priority === 'critical' ? '🔴' : 
                                 rec.priority === 'high' ? '🟠' : 
                                 rec.priority === 'medium' ? '🟡' : '🟢';
            
            message += `### ${priorityEmoji} ${idx + 1}. ${rec.title}\n`;
            message += `**Priority:** ${rec.priority.toUpperCase()}\n`;
            message += `**Affected Areas:** ${rec.affectedDomains.join(', ')}\n\n`;
            message += `${rec.description}\n\n`;
            
            message += `**Reasoning:** ${rec.reasoning}\n\n`;
            
            message += `**Action Steps:**\n`;
            rec.actionSteps.forEach((step, stepIdx) => {
              message += `${stepIdx + 1}. ${step}\n`;
            });
            
            message += `\n**Expected Impact:**\n`;
            rec.expectedImpact.forEach(impact => {
              message += `• ${impact.domain}: ${impact.metric} (${impact.estimatedChange})\n`;
            });
            
            if (rec.estimatedROI) {
              message += `\n💰 **ROI:** ${rec.estimatedROI}\n`;
            }
            message += `\n---\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "unified_recommendations",
          result: recommendations
        };

      case "predict_cross_domain_impact":
        const action = intent.parameters?.action || userMessage;
        const impact = await crossDomainIntelligence.predictCrossDomainImpact(action, companyId);
        
        message = `## 🎯 Cross-Domain Impact Analysis\n\n`;
        message += `**Action:** ${impact.action}\n\n`;
        
        message += `### Direct Impacts\n`;
        impact.directImpacts.forEach(imp => {
          const typeEmoji = imp.impactType === 'positive' ? '✅' : imp.impactType === 'negative' ? '❌' : '➖';
          message += `${typeEmoji} **${imp.domain}** (${imp.severity})\n`;
          message += `${imp.description}\n`;
          message += `Affected: ${imp.affectedMetrics.join(', ')}\n\n`;
        });

        message += `### Cascading Effects\n`;
        impact.cascadingEffects.forEach(imp => {
          message += `• ${imp.domain}: ${imp.description}\n`;
        });

        message += `\n### Timeline\n`;
        message += `**Immediate:** ${impact.timeline.immediate.join(', ')}\n`;
        message += `**1-3 months:** ${impact.timeline.shortTerm.join(', ')}\n`;
        message += `**6+ months:** ${impact.timeline.longTerm.join(', ')}\n`;

        return {
          success: true,
          message,
          actionType: "predict_cross_domain_impact",
          result: impact
        };

      default:
        return {
          success: false,
          message: "Unknown cross-domain analysis type."
        };
    }
  } catch (error: any) {
    console.error("[Cross-Domain Analysis Error]", error);
    return {
      success: false,
      message: "I'm having trouble with cross-domain analysis right now. Please try again later.",
    };
  }
}

/**
 * Handle conversation summary request
 */
async function handleConversationSummary(
  userMessage: string,
  companyId: string,
  userId: string
): Promise<OrchestratorResult> {
  try {
    const summary = await summarizeConversation(userId, companyId);
    
    if (summary.keyPoints.length === 0) {
      return {
        success: true,
        message: "Our conversation is still brief. No summary needed yet.",
        actionType: "summarize_conversation"
      };
    }

    let message = `## 📝 Conversation Summary\n\n`;
    
    message += `### Key Points\n`;
    summary.keyPoints.forEach((point, idx) => {
      message += `${idx + 1}. ${point}\n`;
    });

    if (summary.decisionsMade.length > 0) {
      message += `\n### Decisions Made\n`;
      summary.decisionsMade.forEach(decision => {
        message += `✅ ${decision}\n`;
      });
    }

    if (summary.actionsTaken.length > 0) {
      message += `\n### Actions Taken\n`;
      summary.actionsTaken.forEach(action => {
        message += `• ${action}\n`;
      });
    }

    if (summary.pendingItems.length > 0) {
      message += `\n### Still Pending\n`;
      summary.pendingItems.forEach(item => {
        message += `⏳ ${item}\n`;
      });
    }

    message += `\n**Topics Covered:** ${summary.topics.join(', ')}\n`;

    return {
      success: true,
      message,
      actionType: "summarize_conversation",
      result: summary
    };
  } catch (error: any) {
    console.error("[Conversation Summary Error]", error);
    return {
      success: false,
      message: "I'm having trouble summarizing our conversation. Please try again later.",
    };
  }
}

/**
 * Handle personalization requests
 */
async function handlePersonalizationRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    switch (intent.actionType) {
      case "show_shortcuts":
        const shortcuts = await personalizationEngine.suggestShortcuts(userId, companyId);
        
        let message = `## ⚡ Your Personalized Shortcuts\n\n`;
        if (shortcuts.length === 0) {
          message += "I'm still learning your patterns. Use the system more, and I'll suggest personalized shortcuts!\n";
        } else {
          message += `Based on your usage, here are ${shortcuts.length} shortcuts to save you time:\n\n`;
          shortcuts.forEach((shortcut, idx) => {
            message += `### ${idx + 1}. ${shortcut.name}\n`;
            message += `${shortcut.description}\n`;
            message += `**Trigger:** \`${shortcut.trigger}\`\n`;
            message += `**Saves:** ${shortcut.timeSaved}\n`;
            message += `**Relevance:** ${(shortcut.relevanceScore * 100).toFixed(0)}%\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "show_shortcuts",
          result: shortcuts
        };

      case "show_patterns":
        const patterns = personalizationEngine.detectPatterns(userId, companyId);
        
        message = `## 📊 Your Usage Patterns\n\n`;
        if (patterns.length === 0) {
          message += "I need more data to detect your patterns. Keep using the system!\n";
        } else {
          patterns.forEach((pattern, idx) => {
            message += `### ${idx + 1}. ${pattern.description}\n`;
            message += `**Type:** ${pattern.type}\n`;
            message += `**Frequency:** ${pattern.frequency} times\n`;
            message += `**Confidence:** ${(pattern.confidence * 100).toFixed(0)}%\n`;
            message += `💡 **Suggestion:** ${pattern.suggestion}\n\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "show_patterns",
          result: patterns
        };

      default:
        return {
          success: false,
          message: "Unknown personalization request."
        };
    }
  } catch (error: any) {
    console.error("[Personalization Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with personalization right now. Please try again later.",
    };
  }
}

/**
 * Handle notification requests
 */
async function handleNotificationRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  intent: any
): Promise<OrchestratorResult> {
  try {
    switch (intent.actionType) {
      case "show_notifications":
        const notifications = await notificationEngine.getPendingNotifications(userId, companyId);
        
        let message = `## 🔔 Your Notifications\n\n`;
        if (notifications.length === 0) {
          message += "No pending notifications. You're all caught up! ✅\n";
        } else {
          const critical = notifications.filter(n => n.priority === 'critical');
          const high = notifications.filter(n => n.priority === 'high');
          const others = notifications.filter(n => n.priority === 'medium' || n.priority === 'low');

          if (critical.length > 0) {
            message += `### 🔴 Critical (${critical.length})\n`;
            critical.forEach(notif => {
              message += `**${notif.title}**\n`;
              message += `${notif.message}\n`;
              if (notif.actions && notif.actions.length > 0) {
                message += `Actions: ${notif.actions.map(a => a.label).join(', ')}\n`;
              }
              message += `\n`;
            });
          }

          if (high.length > 0) {
            message += `### 🟠 High Priority (${high.length})\n`;
            high.slice(0, 3).forEach(notif => {
              message += `• **${notif.title}**: ${notif.message}\n`;
            });
            message += `\n`;
          }

          if (others.length > 0) {
            message += `### 📌 Other (${others.length})\n`;
            others.slice(0, 2).forEach(notif => {
              message += `• ${notif.title}\n`;
            });
          }
        }

        return {
          success: true,
          message,
          actionType: "show_notifications",
          result: notifications
        };

      case "daily_digest":
        const digest = await notificationEngine.generateDailyDigest(companyId);
        
        message = `## 📊 Daily HR Digest\n\n`;
        message += digest.summary;
        
        message += `\n\n### 📈 Key Metrics\n`;
        message += `• Active Employees: ${digest.metrics.totalEmployees}\n`;
        message += `• Health Score: ${digest.metrics.healthScore}/100\n`;
        message += `• Active Workflows: ${digest.metrics.activeWorkflows}\n`;
        message += `• Critical Alerts: ${digest.metrics.criticalAlerts}\n`;
        message += `• Opportunities: ${digest.metrics.opportunitiesFound}\n`;

        if (digest.insights.length > 0) {
          message += `\n### 💡 Key Insights\n`;
          digest.insights.slice(0, 3).forEach(insight => {
            message += `• ${insight}\n`;
          });
        }

        if (digest.recommendations.length > 0) {
          message += `\n### 🎯 Recommendations\n`;
          digest.recommendations.slice(0, 3).forEach(rec => {
            message += `• ${rec}\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "daily_digest",
          result: digest
        };

      case "check_alerts":
        const alerts = await notificationEngine.checkForAlerts(companyId);
        
        message = `## ⚠️ Critical Alerts\n\n`;
        if (alerts.length === 0) {
          message += "No critical alerts at this time. System running smoothly! ✅\n";
        } else {
          alerts.forEach((alert, idx) => {
            const emoji = alert.priority === 'critical' ? '🔴' : '🟠';
            message += `### ${emoji} ${idx + 1}. ${alert.title}\n`;
            message += `${alert.message}\n`;
            if (alert.actions && alert.actions.length > 0) {
              message += `**Recommended Actions:**\n`;
              alert.actions.forEach(action => {
                message += `• ${action.label}\n`;
              });
            }
            message += `\n`;
          });
        }

        return {
          success: true,
          message,
          actionType: "check_alerts",
          result: alerts,
          suggestions: alerts.length > 0 ? [
            "Run health check for details",
            "Get unified recommendations",
            "Show daily digest"
          ] : undefined
        };

      default:
        return {
          success: false,
          message: "Unknown notification request."
        };
    }
  } catch (error: any) {
    console.error("[Notification Request Error]", error);
    return {
      success: false,
      message: "I'm having trouble with notifications right now. Please try again later.",
    };
  }
}
