/**
 * NEXT-GENERATION HR AI ORCHESTRATOR
 * Revolutionary AI that seamlessly integrates ALL HR functions with conversational intelligence
 */

import { openai, AI_CONFIG } from "./openai-client";
import { handleConversationalRequest, matchConversationPattern } from "./conversational-engine";
import { processSurveyAutomationRequest } from "./survey-automation-assistant";
import { processSurveyRequest } from "./survey-assistant";
import { generateWorkflow } from "./workflow-generator";
import { buildFormConversationally } from "./form-builder";
import { generateCustomField } from "./field-generator";

export interface NextGenHRResponse {
  success: boolean;
  message: string;
  actionType?: string;
  conversationType?: 'question' | 'action' | 'guidance' | 'confirmation';
  data?: any;
  suggestions?: string[];
  requiresInput?: boolean;
  preview?: any;
  nextSteps?: string[];
  integrations?: string[];
  smartActions?: any[];
}

/**
 * REVOLUTIONARY HR AI ORCHESTRATOR
 * Handles EVERYTHING with conversational intelligence
 */
export async function processNextGenHRRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  conversationHistory?: any[]
): Promise<NextGenHRResponse> {

  // First, check for conversation patterns (vague requests that need guidance)
  const pattern = matchConversationPattern(userMessage);
  if (pattern) {
    return {
      success: true,
      message: pattern.response,
      conversationType: 'question',
      requiresInput: true,
      suggestions: generateSmartSuggestions(pattern.key, companyId)
    };
  }

  // Analyze the request with REVOLUTIONARY AI intelligence
  const analysis = await analyzeNextGenIntent(userMessage, conversationHistory || [], companyId);
  
  // Route to appropriate next-gen handler
  switch (analysis.primaryIntent) {
    case "conversational_guidance":
      return await handleConversationalGuidance(userMessage, analysis, companyId, userId);
    
    case "integrated_automation":
      return await handleIntegratedAutomation(userMessage, analysis, companyId, userId);
    
    case "multi_function_workflow":
      return await handleMultiFunctionWorkflow(userMessage, analysis, companyId, userId);
    
    case "smart_bulk_operations":
      return await handleSmartBulkOperations(userMessage, analysis, companyId, userId);
    
    case "intelligent_communications":
      return await handleIntelligentCommunications(userMessage, analysis, companyId, userId);
    
    case "dynamic_form_building":
      return await handleDynamicFormBuilding(userMessage, analysis, companyId, userId);
    
    default:
      return await handleConversationalRequest(userMessage, companyId, userId, conversationHistory || []);
  }
}

/**
 * REVOLUTIONARY AI INTENT ANALYSIS
 * Understands complex, multi-function HR requests
 */
async function analyzeNextGenIntent(userMessage: string, conversationHistory: any[], companyId: string) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are a REVOLUTIONARY HR AI that analyzes complex, multi-function requests.

NEXT-GEN INTENT CATEGORIES:

**conversational_guidance**: Vague requests needing intelligent questions
- "I want to send surveys" → Ask what type, frequency, audience
- "Help me with onboarding" → Guide through options
- "I need to communicate something" → Clarify audience, message, timing

**integrated_automation**: Multi-system automation workflows  
- "Survey employees monthly and email results to managers"
- "Onboard new hires with forms, workflows, and notifications"
- "Automate performance reviews with surveys, reminders, and reporting"

**multi_function_workflow**: Complex workflows spanning multiple HR functions
- "When someone joins, send welcome email, create onboarding tasks, schedule 30-day survey"
- "For contract renewals, notify HR, send forms, track responses, generate reports"

**smart_bulk_operations**: Intelligent bulk actions with conditions
- "Give everyone in sales a raise but send for approval first"
- "Move all remote workers to new location and update their contracts"
- "Send training reminders to everyone who hasn't completed compliance"

**intelligent_communications**: Smart, targeted communications
- "Email all managers about new policy but customize by department"
- "Send different onboarding messages based on role and location"
- "Notify teams about changes but only relevant ones"

**dynamic_form_building**: Conversational form creation with logic
- "Create onboarding form that changes based on department"
- "Build survey that asks different questions for managers vs employees"
- "Make feedback form that routes to different people"

ANALYZE FOR:
1. **Complexity Level** (simple/moderate/complex/revolutionary)
2. **Functions Involved** (surveys, workflows, forms, communications, bulk actions, analytics)
3. **Integration Points** (email, notifications, approvals, scheduling, reporting)
4. **Conversation Needs** (complete info vs needs questions)
5. **Smart Features** (automation, personalization, conditions, triggers)

Respond with JSON:
{
  "primaryIntent": "integrated_automation",
  "complexity": "complex", 
  "functionsInvolved": ["surveys", "email", "scheduling"],
  "integrationPoints": ["email_automation", "survey_deployment", "analytics"],
  "conversationNeeds": "needs_clarification",
  "smartFeatures": ["scheduling", "automation", "reporting"],
  "confidence": 0.85,
  "reasoning": "User wants monthly survey automation with email results"
}`
      },
      {
        role: "user",
        content: `Analyze this HR request: "${userMessage}"\n\nConversation history: ${JSON.stringify(conversationHistory || [])}`
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    return { primaryIntent: "conversational_guidance", complexity: "simple" };
  }
}

/**
 * Handle conversational guidance for vague requests
 */
async function handleConversationalGuidance(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  const guidance = await generateIntelligentGuidance(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: guidance.message,
    conversationType: 'question',
    requiresInput: true,
    suggestions: guidance.suggestions,
    smartActions: guidance.smartActions
  };
}

/**
 * Handle integrated automation (surveys + workflows + email)
 */
async function handleIntegratedAutomation(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  // This is where the magic happens - integrated automation!
  const automation = await buildIntegratedAutomation(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: automation.message,
    actionType: "integrated_automation",
    conversationType: 'confirmation',
    preview: automation.preview,
    integrations: automation.integrations,
    smartActions: automation.smartActions,
    suggestions: [
      "Customize the automation flow",
      "Add more integration points",
      "Set up advanced analytics",
      "Configure approval workflows"
    ]
  };
}

/**
 * Handle multi-function workflows
 */
async function handleMultiFunctionWorkflow(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  const workflow = await buildMultiFunctionWorkflow(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: workflow.message,
    actionType: "multi_function_workflow",
    conversationType: 'confirmation',
    preview: workflow.preview,
    nextSteps: workflow.nextSteps,
    integrations: workflow.integrations
  };
}

/**
 * Handle smart bulk operations
 */
async function handleSmartBulkOperations(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  const bulkOp = await buildSmartBulkOperation(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: bulkOp.message,
    actionType: "smart_bulk_operation",
    conversationType: 'confirmation',
    preview: bulkOp.preview,
    smartActions: bulkOp.smartActions
  };
}

/**
 * Handle intelligent communications
 */
async function handleIntelligentCommunications(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  const communication = await buildIntelligentCommunication(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: communication.message,
    actionType: "intelligent_communication",
    conversationType: 'confirmation',
    preview: communication.preview,
    smartActions: communication.smartActions
  };
}

/**
 * Handle dynamic form building
 */
async function handleDynamicFormBuilding(
  userMessage: string,
  analysis: any,
  companyId: string,
  userId: string
): Promise<NextGenHRResponse> {
  
  const form = await buildDynamicForm(userMessage, analysis, companyId);
  
  return {
    success: true,
    message: form.message,
    actionType: "dynamic_form_building",
    conversationType: 'confirmation',
    preview: form.preview,
    smartActions: form.smartActions
  };
}

// REVOLUTIONARY AI BUILDERS

/**
 * Generate intelligent guidance for vague requests
 */
async function generateIntelligentGuidance(userMessage: string, analysis: any, companyId: string) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are a next-gen HR AI that provides AMAZING guidance for vague requests.

Be enthusiastic, helpful, and show you understand their business needs.
Ask ONE perfect question that moves them forward.
Provide smart suggestions that show your expertise.

GUIDANCE PRINCIPLES:
- Show excitement about helping them
- Ask focused, actionable questions  
- Provide relevant examples from their industry
- Suggest smart automation opportunities
- Make it feel like talking to an expert consultant

Current analysis: ${JSON.stringify(analysis)}`
      },
      {
        role: "user",
        content: `User said: "${userMessage}"\n\nProvide intelligent guidance.`
      }
    ]
  });

  const message = completion.choices[0].message.content || "";
  
  return {
    message,
    suggestions: generateContextualSuggestions(analysis),
    smartActions: generateSmartActions(analysis, userMessage)
  };
}

/**
 * Build integrated automation workflows
 */
async function buildIntegratedAutomation(userMessage: string, analysis: any, companyId: string) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You are building REVOLUTIONARY integrated automation that combines multiple HR functions.

Create automation that includes:
- Survey deployment and management
- Email automation and notifications  
- Workflow triggers and actions
- Analytics and reporting
- Approval processes
- Scheduling and reminders

Show the user a comprehensive automation plan that will blow their mind with how integrated and smart it is.

Analysis: ${JSON.stringify(analysis)}`
      },
      {
        role: "user",
        content: `Build integrated automation for: "${userMessage}"`
      }
    ]
  });

  const message = completion.choices[0].message.content || "";
  
  return {
    message,
    preview: buildAutomationPreview(analysis),
    integrations: extractIntegrations(analysis),
    smartActions: generateAutomationActions(analysis)
  };
}

/**
 * Build multi-function workflows
 */
async function buildMultiFunctionWorkflow(userMessage: string, analysis: any, companyId: string) {
  // Implementation for complex multi-function workflows
  return {
    message: "Building revolutionary multi-function workflow...",
    preview: {},
    nextSteps: [],
    integrations: []
  };
}

/**
 * Build smart bulk operations
 */
async function buildSmartBulkOperation(userMessage: string, analysis: any, companyId: string) {
  // Implementation for intelligent bulk operations
  return {
    message: "Creating smart bulk operation...",
    preview: {},
    smartActions: []
  };
}

/**
 * Build intelligent communications
 */
async function buildIntelligentCommunication(userMessage: string, analysis: any, companyId: string) {
  // Implementation for smart communications
  return {
    message: "Building intelligent communication system...",
    preview: {},
    smartActions: []
  };
}

/**
 * Build dynamic forms
 */
async function buildDynamicForm(userMessage: string, analysis: any, companyId: string) {
  // Implementation for dynamic form building
  return {
    message: "Creating dynamic form with smart logic...",
    preview: {},
    smartActions: []
  };
}

// HELPER FUNCTIONS

function generateSmartSuggestions(patternKey: string, companyId: string): string[] {
  const suggestionMap: { [key: string]: string[] } = {
    SURVEY_MONTHLY_VAGUE: [
      "Monthly pulse survey for team engagement",
      "eNPS survey to track employee loyalty",
      "Department-specific feedback collection",
      "Leadership effectiveness survey"
    ],
    WORKFLOW_VAGUE: [
      "Onboarding automation for new hires",
      "Contract renewal reminder system",
      "Performance review scheduling",
      "Leave approval workflows"
    ],
    FORM_VAGUE: [
      "Employee onboarding checklist",
      "Feedback collection form",
      "Equipment request form",
      "Performance evaluation form"
    ],
    COMMUNICATION_VAGUE: [
      "Company-wide announcements",
      "Department-specific updates",
      "Policy change notifications",
      "Training reminders"
    ]
  };
  
  return suggestionMap[patternKey] || [];
}

function generateContextualSuggestions(analysis: any): string[] {
  const suggestions: string[] = [];
  
  if (analysis.functionsInvolved?.includes('surveys')) {
    suggestions.push("Set up automated survey deployment");
  }
  if (analysis.functionsInvolved?.includes('email')) {
    suggestions.push("Configure smart email automation");
  }
  if (analysis.functionsInvolved?.includes('workflows')) {
    suggestions.push("Build approval workflows");
  }
  
  return suggestions;
}

function generateSmartActions(analysis: any, userMessage: string): any[] {
  return [
    {
      title: "Quick Setup",
      description: "Get started with a template",
      action: "use_template"
    },
    {
      title: "Custom Build", 
      description: "Build from scratch with guidance",
      action: "custom_build"
    },
    {
      title: "See Examples",
      description: "View similar automations",
      action: "show_examples"
    }
  ];
}

function buildAutomationPreview(analysis: any): any {
  return {
    name: "Integrated HR Automation",
    functions: analysis.functionsInvolved || [],
    integrations: analysis.integrationPoints || [],
    complexity: analysis.complexity,
    estimatedSetupTime: "10-15 minutes"
  };
}

function extractIntegrations(analysis: any): string[] {
  return analysis.integrationPoints || [];
}

function generateAutomationActions(analysis: any): any[] {
  return [
    {
      title: "Deploy Automation",
      description: "Activate the integrated workflow",
      action: "deploy"
    },
    {
      title: "Test First",
      description: "Run a test with sample data",
      action: "test"
    },
    {
      title: "Schedule Later",
      description: "Set up for future activation",
      action: "schedule"
    }
  ];
}
