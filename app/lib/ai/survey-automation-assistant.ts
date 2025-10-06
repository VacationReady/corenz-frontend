/**
 * Survey Automation Assistant
 * Handles complex survey automation workflows combining surveys, scheduling, and email automation
 */

import { generateWorkflow } from "./workflow-generator";
import { processSurveyRequest } from "./survey-assistant";
import { openai, AI_CONFIG } from "./openai-client";

export interface SurveyAutomationResult {
  success: boolean;
  message: string;
  data?: any;
  actionType?: string;
  requiresConfirmation?: boolean;
  preview?: any;
  suggestions?: string[];
  workflow?: any;
  survey?: any;
}

/**
 * Main survey automation orchestrator
 */
export async function processSurveyAutomationRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any = {}
): Promise<SurveyAutomationResult> {
  
  // Analyze the automation request
  const analysis = await analyzeSurveyAutomationRequest(userMessage, parameters);
  
  if (!analysis.success) {
    return {
      success: false,
      message: analysis.error || "I couldn't understand the automation request. Please be more specific."
    };
  }

  // Handle different types of survey automation
  switch (analysis.automationType) {
    case "recurring_survey_with_email":
      return await handleRecurringSurveyWithEmail(userMessage, companyId, userId, analysis.components);
    
    case "survey_workflow_integration":
      return await handleSurveyWorkflowIntegration(userMessage, companyId, userId, analysis.components);
    
    case "complex_survey_automation":
      return await handleComplexSurveyAutomation(userMessage, companyId, userId, analysis.components);
    
    default:
      return await handleGenericSurveyAutomation(userMessage, companyId, userId, analysis.components);
  }
}

/**
 * Analyze the survey automation request to understand components
 */
async function analyzeSurveyAutomationRequest(userMessage: string, parameters: any) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are an expert at analyzing survey automation requests. Break down the user's request into components.

AUTOMATION TYPES:
- recurring_survey_with_email: Regular surveys with email results (e.g., "Send eNPS monthly and email results")
- survey_workflow_integration: Surveys integrated with other workflows (e.g., "Survey new hires after 30 days")
- complex_survey_automation: Multi-step automation with anonymization, filtering, etc.

COMPONENTS TO IDENTIFY:
- surveyType: pulse, enps, engagement, annual, feedback, custom
- schedule: monthly, weekly, quarterly, every_30_days, every_60_days, annually
- targetAudience: all, department, role, managers, new_hires, specific_group
- anonymization: none, department, role, location, full
- emailResults: true/false
- emailRecipients: CEO, HR, managers, leadership, custom_list
- triggers: employee_start, contract_expiry, performance_review, scheduled
- conditions: department_filter, role_filter, tenure_filter, custom_conditions
- actions: send_survey, collect_responses, generate_report, send_email, create_alert

Respond with JSON:
{
  "success": true,
  "automationType": "one of the types above",
  "components": {
    "surveyType": "extracted type",
    "schedule": "extracted schedule", 
    "targetAudience": "extracted audience",
    "anonymization": "extracted level",
    "emailResults": boolean,
    "emailRecipients": ["list of recipients"],
    "triggers": ["list of triggers"],
    "conditions": ["list of conditions"],
    "actions": ["list of actions"],
    "stakeholder": "who requested this",
    "complexity": "simple|moderate|complex"
  },
  "reasoning": "explanation of the analysis"
}`
      },
      {
        role: "user", 
        content: `Analyze this request: "${userMessage}"\n\nExtracted parameters: ${JSON.stringify(parameters)}`
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    return { success: false, error: "Failed to analyze automation request" };
  }
}

/**
 * Handle recurring surveys with email automation
 */
async function handleRecurringSurveyWithEmail(
  userMessage: string,
  companyId: string,
  userId: string,
  components: any
): Promise<SurveyAutomationResult> {
  
  const { surveyType, schedule, targetAudience, anonymization, emailRecipients, stakeholder } = components;
  
  // Build the automation description
  const automationDescription = buildAutomationDescription(components);
  
  // Create the workflow specification
  const workflowSpec = {
    name: `${surveyType?.toUpperCase() || 'Survey'} Automation - ${schedule || 'Regular'}`,
    description: automationDescription,
    triggers: [
      {
        type: "SCHEDULED",
        schedule: mapScheduleToWorkflow(schedule),
        description: `Run ${schedule || 'regularly'}`
      }
    ],
    actions: [
      {
        type: "SEND_SURVEY",
        surveyType: surveyType,
        targetAudience: targetAudience || "all",
        anonymization: anonymization || "department"
      },
      {
        type: "COLLECT_RESPONSES", 
        waitPeriod: "7_days",
        reminderSchedule: "3_days"
      },
      {
        type: "GENERATE_REPORT",
        anonymization: anonymization || "department",
        includeAnalytics: true,
        includeTrends: true
      },
      {
        type: "SEND_EMAIL",
        recipients: emailRecipients || ["HR"],
        template: "survey_results_digest",
        includeAttachment: true
      }
    ]
  };

  const preview = {
    automationName: workflowSpec.name,
    schedule: schedule || "monthly",
    surveyType: surveyType || "eNPS",
    audience: targetAudience || "All employees",
    anonymization: anonymization || "By department", 
    emailRecipients: emailRecipients || ["HR team"],
    estimatedSetupTime: "5 minutes",
    firstRun: getNextRunDate(schedule)
  };

  return {
    success: true,
    message: `I'll create a **${surveyType?.toUpperCase() || 'Survey'} automation workflow** for you:\n\n` +
             `📊 **Survey:** ${surveyType || 'eNPS'} survey\n` +
             `⏰ **Schedule:** ${schedule || 'Monthly'}\n` +
             `👥 **Audience:** ${targetAudience || 'All employees'}\n` +
             `🔒 **Privacy:** ${anonymization || 'Anonymized by department'}\n` +
             `📧 **Results to:** ${emailRecipients?.join(', ') || 'HR team'}\n` +
             `🚀 **First run:** ${preview.firstRun}\n\n` +
             `This will automatically:\n` +
             `• Send the survey to employees\n` +
             `• Collect responses for 7 days\n` +
             `• Send reminders after 3 days\n` +
             `• Generate anonymized analytics\n` +
             `• Email results with insights\n\n` +
             `Ready to set this up?`,
    actionType: "create_survey_automation",
    requiresConfirmation: true,
    preview,
    data: { workflowSpec, components },
    suggestions: [
      "Customize the reminder schedule",
      "Add specific departments", 
      "Change email recipients"
    ]
  };
}

/**
 * Handle survey-workflow integration
 */
async function handleSurveyWorkflowIntegration(
  userMessage: string,
  companyId: string, 
  userId: string,
  components: any
): Promise<SurveyAutomationResult> {
  
  // This handles cases like "Survey new hires after 30 days"
  const { surveyType, triggers, targetAudience, conditions } = components;
  
  const workflowSpec = {
    name: `${surveyType?.toUpperCase() || 'Survey'} - ${triggers?.[0] || 'Trigger'} Integration`,
    description: `Automatically send ${surveyType} survey when ${triggers?.[0] || 'triggered'}`,
    triggers: triggers?.map((trigger: string) => ({
      type: mapTriggerToWorkflow(trigger),
      conditions: conditions || []
    })) || [],
    actions: [
      {
        type: "WAIT_PERIOD",
        duration: extractWaitPeriod(userMessage) || "30_days"
      },
      {
        type: "SEND_SURVEY",
        surveyType: surveyType,
        targetAudience: targetAudience
      },
      {
        type: "TRACK_COMPLETION",
        reminderSchedule: "weekly"
      }
    ]
  };

  return {
    success: true,
    message: `I'll create an **integrated survey workflow**:\n\n` +
             `🔗 **Trigger:** ${triggers?.[0] || 'Employee lifecycle event'}\n` +
             `📊 **Survey:** ${surveyType || 'Feedback'} survey\n` +
             `👥 **Target:** ${targetAudience || 'Affected employees'}\n` +
             `⏱️ **Timing:** ${extractWaitPeriod(userMessage) || '30 days'} after trigger\n\n` +
             `This will automatically send surveys at the right time in the employee journey.\n\n` +
             `Should I create this workflow?`,
    actionType: "create_survey_automation", 
    requiresConfirmation: true,
    preview: { workflowSpec, components },
    data: { workflowSpec, components }
  };
}

/**
 * Handle complex survey automation
 */
async function handleComplexSurveyAutomation(
  userMessage: string,
  companyId: string,
  userId: string, 
  components: any
): Promise<SurveyAutomationResult> {
  
  // This handles the CEO eNPS example with multiple requirements
  const complexity = components.complexity || "complex";
  
  if (complexity === "complex") {
    return await buildComplexAutomationWorkflow(userMessage, companyId, userId, components);
  }
  
  return await handleRecurringSurveyWithEmail(userMessage, companyId, userId, components);
}

/**
 * Build complex automation workflow with multiple steps
 */
async function buildComplexAutomationWorkflow(
  userMessage: string,
  companyId: string,
  userId: string,
  components: any
): Promise<SurveyAutomationResult> {
  
  const { surveyType, schedule, anonymization, emailResults, stakeholder } = components;
  
  const workflowSteps = [
    "📋 Create/update survey template",
    "📅 Schedule monthly deployment", 
    "👥 Send to all employees",
    "⏰ Collect responses (7-day window)",
    "🔔 Send reminders (day 3 & 6)",
    "📊 Generate analytics report",
    `🔒 Anonymize data by ${anonymization || 'department'}`,
    "📧 Email results to stakeholders",
    "📈 Track trends over time"
  ];

  const preview = {
    workflowName: `${stakeholder || 'Executive'} ${surveyType?.toUpperCase() || 'eNPS'} Automation`,
    schedule: schedule || "monthly",
    complexity: "Enterprise-grade automation",
    features: [
      "Automated survey deployment",
      "Smart reminder system", 
      "Department-level anonymization",
      "Executive reporting",
      "Trend analysis",
      "Compliance tracking"
    ],
    stakeholders: [stakeholder || "CEO", "HR Director", "People Team"],
    estimatedSetupTime: "10-15 minutes"
  };

  return {
    success: true,
    message: `I'll create a **comprehensive ${surveyType?.toUpperCase() || 'eNPS'} automation system** for ${stakeholder || 'your CEO'}:\n\n` +
             `**Workflow Steps:**\n${workflowSteps.map(step => `${step}`).join('\n')}\n\n` +
             `**Key Features:**\n` +
             `• **Smart Scheduling:** ${schedule || 'Monthly'} deployment\n` +
             `• **Privacy Protection:** ${anonymization || 'Department'}-level anonymization\n` +
             `• **Executive Reporting:** Automated insights to ${stakeholder || 'leadership'}\n` +
             `• **Trend Tracking:** Historical analysis and benchmarking\n` +
             `• **Compliance Ready:** Audit trail and data governance\n\n` +
             `This enterprise-grade automation will handle everything from survey creation to executive reporting.\n\n` +
             `Ready to build this comprehensive system?`,
    actionType: "create_complex_automation",
    requiresConfirmation: true,
    preview,
    data: { workflowSteps, components, complexity: "enterprise" },
    suggestions: [
      "Customize anonymization rules",
      "Add department-specific questions",
      "Set up executive dashboard"
    ]
  };
}

/**
 * Handle generic survey automation
 */
async function handleGenericSurveyAutomation(
  userMessage: string,
  companyId: string,
  userId: string,
  components: any
): Promise<SurveyAutomationResult> {
  
  return {
    success: true,
    message: "I can help you create survey automation! Let me ask a few questions to build the perfect workflow:\n\n" +
             "**What type of survey automation do you need?**\n\n" +
             "• **Recurring Surveys** - Regular pulse, eNPS, or engagement surveys\n" +
             "• **Lifecycle Surveys** - Onboarding, exit, or milestone surveys\n" +
             "• **Event-Triggered** - Surveys based on specific events\n" +
             "• **Complex Automation** - Multi-step workflows with reporting\n\n" +
             "Which option sounds closest to what you need?",
    actionType: "create_survey_automation",
    suggestions: [
      "Set up monthly eNPS surveys",
      "Create onboarding feedback automation", 
      "Build engagement survey workflow",
      "Design custom survey automation"
    ]
  };
}

// Helper functions
function buildAutomationDescription(components: any): string {
  const { surveyType, schedule, targetAudience, anonymization, emailRecipients } = components;
  
  return `Automated ${surveyType || 'survey'} deployment running ${schedule || 'regularly'} ` +
         `for ${targetAudience || 'all employees'} with ${anonymization || 'department'} anonymization ` +
         `and results emailed to ${emailRecipients?.join(', ') || 'stakeholders'}.`;
}

function mapScheduleToWorkflow(schedule: string): string {
  const scheduleMap: { [key: string]: string } = {
    "monthly": "0 0 1 * *",
    "weekly": "0 0 * * 1", 
    "quarterly": "0 0 1 */3 *",
    "every_30_days": "0 0 */30 * *",
    "every_60_days": "0 0 */60 * *",
    "annually": "0 0 1 1 *"
  };
  
  return scheduleMap[schedule] || "0 0 1 * *"; // Default to monthly
}

function mapTriggerToWorkflow(trigger: string): string {
  const triggerMap: { [key: string]: string } = {
    "employee_start": "EMPLOYEE_START_DATE",
    "contract_expiry": "CONTRACT_EXPIRING", 
    "performance_review": "PERFORMANCE_REVIEW_DUE",
    "probation_end": "PROBATION_ENDING"
  };
  
  return triggerMap[trigger] || "SCHEDULED";
}

function extractWaitPeriod(message: string): string | null {
  const periodMatch = message.match(/(\d+)\s*(days?|weeks?|months?)/i);
  if (periodMatch) {
    const num = periodMatch[1];
    const unit = periodMatch[2].toLowerCase();
    
    if (unit.startsWith('day')) return `${num}_days`;
    if (unit.startsWith('week')) return `${parseInt(num) * 7}_days`;
    if (unit.startsWith('month')) return `${num}_months`;
  }
  
  return null;
}

function getNextRunDate(schedule: string): string {
  const now = new Date();
  
  switch (schedule) {
    case "monthly":
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.toLocaleDateString();
    case "weekly":
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek.toLocaleDateString();
    case "quarterly":
      const nextQuarter = new Date(now.getFullYear(), now.getMonth() + 3, 1);
      return nextQuarter.toLocaleDateString();
    default:
      return "Next scheduled run";
  }
}
