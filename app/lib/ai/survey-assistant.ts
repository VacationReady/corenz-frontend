/**
 * Survey Assistant - Comprehensive AI-powered survey management
 * Handles survey creation, deployment, analytics, and completion tracking
 */

import { generateQuery } from "./query-generator";
import { getSystemContext } from "./system-context";

export interface SurveyAssistantResult {
  success: boolean;
  message: string;
  data?: any;
  actionType?: string;
  requiresConfirmation?: boolean;
  preview?: any;
  suggestions?: string[];
}

/**
 * Main survey assistant orchestrator
 */
export async function processSurveyRequest(
  userMessage: string,
  companyId: string,
  userId: string
): Promise<SurveyAssistantResult> {
  const intent = await classifySurveyIntent(userMessage);
  
  switch (intent.type) {
    case "create_survey":
      return await handleSurveyCreation(userMessage, companyId, userId, intent.parameters);
    
    case "send_survey":
      return await handleSurveyDeployment(userMessage, companyId, userId, intent.parameters);
    
    case "analyze_survey":
      return await handleSurveyAnalytics(userMessage, companyId, userId, intent.parameters);
    
    case "track_completion":
      return await handleCompletionTracking(userMessage, companyId, userId, intent.parameters);
    
    case "digest_results":
      return await handleResultsDigestion(userMessage, companyId, userId, intent.parameters);
    
    case "survey_status":
      return await handleSurveyStatus(userMessage, companyId, userId, intent.parameters);
    
    default:
      return {
        success: false,
        message: "I'm not sure what you want to do with surveys. I can help you:\n• **Create surveys** - 'Create a pulse survey'\n• **Send surveys** - 'Send the weekly pulse to engineering team'\n• **Analyze results** - 'Show me pulse survey results'\n• **Track completion** - 'Who hasn't completed the engagement survey?'\n• **Digest insights** - 'Summarize the feedback from last week's pulse'"
      };
  }
}

/**
 * Classify survey intent from user message
 */
async function classifySurveyIntent(userMessage: string): Promise<{ type: string; parameters: any }> {
  const msg = userMessage.toLowerCase();
  
  // Survey creation patterns
  if (msg.includes("create") && (msg.includes("survey") || msg.includes("pulse") || msg.includes("feedback"))) {
    return {
      type: "create_survey",
      parameters: {}
    };
  }
  
  // Survey deployment patterns
  if ((msg.includes("send") || msg.includes("deploy") || msg.includes("launch")) && 
      (msg.includes("survey") || msg.includes("pulse"))) {
    return {
      type: "send_survey",
      parameters: {}
    };
  }
  
  // Analytics patterns
  if ((msg.includes("analyze") || msg.includes("results") || msg.includes("responses") || 
       msg.includes("show me") || msg.includes("report")) && 
      (msg.includes("survey") || msg.includes("pulse"))) {
    return {
      type: "analyze_survey",
      parameters: {}
    };
  }
  
  // Completion tracking patterns
  if ((msg.includes("who") || msg.includes("completion") || msg.includes("completed") || 
       msg.includes("missing") || msg.includes("haven't")) && 
      (msg.includes("survey") || msg.includes("pulse"))) {
    return {
      type: "track_completion",
      parameters: {}
    };
  }
  
  // Results digestion patterns
  if ((msg.includes("summarize") || msg.includes("digest") || msg.includes("insights") || 
       msg.includes("feedback") || msg.includes("key findings")) && 
      (msg.includes("survey") || msg.includes("pulse"))) {
    return {
      type: "digest_results",
      parameters: {}
    };
  }
  
  // Status check patterns
  if ((msg.includes("status") || msg.includes("active") || msg.includes("running")) && 
      (msg.includes("survey") || msg.includes("pulse"))) {
    return {
      type: "survey_status",
      parameters: {}
    };
  }
  
  return { type: "unknown", parameters: {} };
}

/**
 * Handle survey creation requests
 */
async function handleSurveyCreation(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    // Extract survey type and requirements
    const surveyType = extractSurveyType(userMessage);
    const targetAudience = extractTargetAudience(userMessage);
    const customQuestions = extractCustomQuestions(userMessage);
    
    // Get available survey templates
    const templates = await getSurveyTemplates();
    
    // If user specified a template type, use it
    if (surveyType && templates.find(t => t.slug.includes(surveyType))) {
      const template = templates.find(t => t.slug.includes(surveyType));
      
      return {
        success: true,
        message: `I'll create a ${template?.name} for you. Here's what it includes:\n\n${template?.highlights?.map(h => `• ${h}`).join('\n')}\n\nWould you like me to customize any questions or use it as-is?`,
        data: { template, targetAudience, customQuestions },
        actionType: "create_survey",
        requiresConfirmation: true,
        preview: template?.schema
      };
    }
    
    // If no specific template, suggest options
    const suggestions = templates.map(t => `**${t.name}** - ${t.description}`).join('\n\n');
    
    return {
      success: true,
      message: `I can help you create a survey! Here are some popular templates:\n\n${suggestions}\n\nWhich type would you like to create, or would you prefer a custom survey?`,
      data: { templates, targetAudience, customQuestions },
      actionType: "create_survey",
      suggestions: templates.map(t => `Create ${t.name.toLowerCase()}`)
    };
    
  } catch (error) {
    console.error("[Survey Creation Error]", error);
    return {
      success: false,
      message: "I had trouble creating the survey. Please try again or be more specific about what type of survey you need."
    };
  }
}

/**
 * Handle survey deployment requests
 */
async function handleSurveyDeployment(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    const surveyName = extractSurveyName(userMessage);
    const targetAudience = extractTargetAudience(userMessage);
    const deadline = extractDeadline(userMessage);
    
    // Get available surveys
    const surveys = await getAvailableSurveys(companyId);
    
    if (!surveyName && surveys.length === 0) {
      return {
        success: false,
        message: "No surveys are available to send. Would you like me to create one first?"
      };
    }
    
    if (!surveyName && surveys.length > 0) {
      const surveyList = surveys.map(s => `• ${s.name}`).join('\n');
      return {
        success: true,
        message: `Which survey would you like to send?\n\n${surveyList}`,
        data: { surveys, targetAudience, deadline },
        actionType: "send_survey",
        suggestions: surveys.map(s => `Send ${s.name}`)
      };
    }
    
    // Find specific survey
    const survey = surveys.find(s => 
      s.name.toLowerCase().includes(surveyName.toLowerCase()) ||
      s.slug.toLowerCase().includes(surveyName.toLowerCase())
    );
    
    if (!survey) {
      return {
        success: false,
        message: `I couldn't find a survey called "${surveyName}". Available surveys:\n\n${surveys.map(s => `• ${s.name}`).join('\n')}`
      };
    }
    
    // Build deployment preview
    const preview = {
      survey: survey.name,
      audience: targetAudience || "All employees",
      deadline: deadline || "No deadline set",
      estimatedResponses: await estimateResponseCount(companyId, targetAudience)
    };
    
    return {
      success: true,
      message: `Ready to send **${survey.name}**:\n\n• **Audience:** ${preview.audience}\n• **Deadline:** ${preview.deadline}\n• **Expected responses:** ~${preview.estimatedResponses}\n\nShould I send this survey now?`,
      data: { survey, targetAudience, deadline },
      actionType: "send_survey",
      requiresConfirmation: true,
      preview
    };
    
  } catch (error) {
    console.error("[Survey Deployment Error]", error);
    return {
      success: false,
      message: "I had trouble setting up the survey deployment. Please try again."
    };
  }
}

/**
 * Handle survey analytics requests
 */
async function handleSurveyAnalytics(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    const surveyName = extractSurveyName(userMessage);
    const timeframe = extractTimeframe(userMessage);
    const analysisType = extractAnalysisType(userMessage);
    
    // Get survey analytics data
    const analytics = await getSurveyAnalytics(companyId, surveyName, timeframe);
    
    if (!analytics || analytics.length === 0) {
      return {
        success: false,
        message: "No survey data found. Make sure surveys have been sent and responses collected."
      };
    }
    
    // Generate insights based on analysis type
    let insights = "";
    if (analysisType === "trends") {
      insights = generateTrendInsights(analytics);
    } else if (analysisType === "sentiment") {
      insights = generateSentimentInsights(analytics);
    } else {
      insights = generateGeneralInsights(analytics);
    }
    
    return {
      success: true,
      message: insights,
      data: analytics,
      actionType: "analyze_survey",
      suggestions: [
        "Show me trends over time",
        "Break down by department",
        "Export this data to CSV"
      ]
    };
    
  } catch (error) {
    console.error("[Survey Analytics Error]", error);
    return {
      success: false,
      message: "I had trouble analyzing the survey data. Please try again."
    };
  }
}

/**
 * Handle completion tracking requests
 */
async function handleCompletionTracking(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    const surveyName = extractSurveyName(userMessage);
    const department = extractDepartment(userMessage);
    
    // Get completion data
    const completionData = await getSurveyCompletionData(companyId, surveyName, department);
    
    if (!completionData) {
      return {
        success: false,
        message: "No active surveys found to track completion for."
      };
    }
    
    const { completed, pending, overdue } = completionData;
    
    let message = `**Survey Completion Status**\n\n`;
    message += `✅ **Completed:** ${completed.length} employees\n`;
    message += `⏳ **Pending:** ${pending.length} employees\n`;
    
    if (overdue.length > 0) {
      message += `⚠️ **Overdue:** ${overdue.length} employees\n\n`;
      message += `**Overdue employees:**\n${overdue.map(e => `• ${e.name} (${e.department})`).join('\n')}`;
    }
    
    if (pending.length > 0 && pending.length <= 10) {
      message += `\n\n**Pending employees:**\n${pending.map(e => `• ${e.name} (${e.department})`).join('\n')}`;
    }
    
    return {
      success: true,
      message,
      data: completionData,
      actionType: "track_completion",
      suggestions: [
        "Send reminder to pending employees",
        "Show completion rate by department",
        "Export completion report"
      ]
    };
    
  } catch (error) {
    console.error("[Completion Tracking Error]", error);
    return {
      success: false,
      message: "I had trouble tracking survey completion. Please try again."
    };
  }
}

/**
 * Handle results digestion requests
 */
async function handleResultsDigestion(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    const surveyName = extractSurveyName(userMessage);
    const focusArea = extractFocusArea(userMessage);
    
    // Get survey results
    const results = await getSurveyResults(companyId, surveyName);
    
    if (!results || results.responses.length === 0) {
      return {
        success: false,
        message: "No survey responses found to analyze. Make sure the survey has been completed by employees."
      };
    }
    
    // Generate AI-powered insights
    const digest = await generateSurveyDigest(results, focusArea);
    
    return {
      success: true,
      message: digest.summary,
      data: { results, digest },
      actionType: "digest_results",
      suggestions: [
        "Email this digest to leadership",
        "Create action items from feedback",
        "Compare with previous surveys"
      ]
    };
    
  } catch (error) {
    console.error("[Results Digestion Error]", error);
    return {
      success: false,
      message: "I had trouble analyzing the survey results. Please try again."
    };
  }
}

/**
 * Handle survey status requests
 */
async function handleSurveyStatus(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<SurveyAssistantResult> {
  try {
    const activeSurveys = await getActiveSurveys(companyId);
    
    if (activeSurveys.length === 0) {
      return {
        success: true,
        message: "No surveys are currently active. Would you like me to create and send one?",
        suggestions: ["Create a pulse survey", "Create an engagement survey"]
      };
    }
    
    let message = "**Active Surveys:**\n\n";
    
    for (const survey of activeSurveys) {
      const completion = await getSurveyCompletionRate(survey.id);
      message += `📊 **${survey.name}**\n`;
      message += `   • Status: ${survey.status}\n`;
      message += `   • Completion: ${completion.rate}% (${completion.completed}/${completion.total})\n`;
      if (survey.deadline) {
        message += `   • Deadline: ${new Date(survey.deadline).toLocaleDateString()}\n`;
      }
      message += `\n`;
    }
    
    return {
      success: true,
      message,
      data: activeSurveys,
      actionType: "survey_status",
      suggestions: [
        "Show detailed results",
        "Send reminders",
        "Pause a survey"
      ]
    };
    
  } catch (error) {
    console.error("[Survey Status Error]", error);
    return {
      success: false,
      message: "I had trouble checking survey status. Please try again."
    };
  }
}

// Helper functions for parameter extraction
function extractSurveyType(message: string): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("pulse")) return "pulse";
  if (msg.includes("engagement")) return "engagement";
  if (msg.includes("enps") || msg.includes("net promoter")) return "enps";
  if (msg.includes("annual")) return "annual";
  return null;
}

function extractTargetAudience(message: string): string | null {
  const msg = message.toLowerCase();
  const deptMatch = msg.match(/(?:to|for)\s+(?:the\s+)?(\w+)\s*(?:team|department)/i);
  if (deptMatch) return deptMatch[1];
  
  if (msg.includes("everyone") || msg.includes("all employees")) return "all";
  if (msg.includes("managers")) return "managers";
  if (msg.includes("leadership")) return "leadership";
  
  return null;
}

function extractCustomQuestions(message: string): string[] {
  // Extract questions in quotes or after "ask about"
  const questions: string[] = [];
  const quotedMatch = message.match(/"([^"]+)"/g);
  if (quotedMatch) {
    questions.push(...quotedMatch.map(q => q.replace(/"/g, '')));
  }
  return questions;
}

function extractSurveyName(message: string): string {
  const msg = message.toLowerCase();
  
  // Common survey name patterns
  if (msg.includes("pulse")) return "pulse";
  if (msg.includes("engagement")) return "engagement";
  if (msg.includes("weekly")) return "weekly";
  if (msg.includes("monthly")) return "monthly";
  
  // Extract quoted names
  const quotedMatch = message.match(/"([^"]+)"/);
  if (quotedMatch) return quotedMatch[1];
  
  return "";
}

function extractDeadline(message: string): string | null {
  const msg = message.toLowerCase();
  
  // Look for deadline patterns
  const deadlineMatch = msg.match(/(?:by|deadline|due)\s+([^,\n]+)/i);
  if (deadlineMatch) return deadlineMatch[1].trim();
  
  return null;
}

function extractTimeframe(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("last week")) return "last_week";
  if (msg.includes("this week")) return "this_week";
  if (msg.includes("last month")) return "last_month";
  if (msg.includes("this month")) return "this_month";
  if (msg.includes("quarter")) return "quarter";
  if (msg.includes("year")) return "year";
  
  return "all_time";
}

function extractAnalysisType(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("trend")) return "trends";
  if (msg.includes("sentiment") || msg.includes("mood")) return "sentiment";
  if (msg.includes("department") || msg.includes("team")) return "department";
  
  return "general";
}

function extractDepartment(message: string): string | null {
  const msg = message.toLowerCase();
  const deptMatch = msg.match(/(?:in|from)\s+(?:the\s+)?(\w+)\s*(?:team|department)/i);
  return deptMatch ? deptMatch[1] : null;
}

function extractFocusArea(message: string): string | null {
  const msg = message.toLowerCase();
  
  if (msg.includes("engagement")) return "engagement";
  if (msg.includes("satisfaction")) return "satisfaction";
  if (msg.includes("workload")) return "workload";
  if (msg.includes("leadership")) return "leadership";
  if (msg.includes("culture")) return "culture";
  
  return null;
}

// API helper functions connecting to actual endpoints
async function getSurveyTemplates() {
  try {
    const response = await fetch('/api/forms?type=SURVEY');
    if (response.ok) {
      const data = await response.json();
      const forms = Array.isArray(data) ? data : data.forms || [];
      
      // Map to template format
      return forms.map((form: any) => ({
        name: form.name,
        slug: form.slug,
        description: form.description,
        highlights: extractHighlights(form.schema),
        schema: form.schema,
        id: form.id
      }));
    }
  } catch (error) {
    console.error('Failed to fetch survey templates:', error);
  }
  
  // Fallback templates
  return [
    {
      name: "Weekly Pulse Survey",
      slug: "weekly-pulse-survey",
      description: "Quick snapshots of team sentiment",
      highlights: ["Mood tracker with emojis", "Workload & energy check", "Weekly wins & support"],
      schema: {}
    },
    {
      name: "Employee Net Promoter Score (eNPS)",
      slug: "employee-net-promoter-score", 
      description: "Measure employee loyalty",
      highlights: ["0-10 promoter scale", "Follow-up sentiment", "Actionable improvement ideas"],
      schema: {}
    },
    {
      name: "Annual Engagement Survey",
      slug: "annual-engagement-survey",
      description: "Comprehensive engagement assessment", 
      highlights: ["Engagement benchmarks", "Leadership & culture insights", "Open feedback prompts"],
      schema: {}
    }
  ];
}

async function getAvailableSurveys(companyId: string) {
  try {
    const response = await fetch(`/api/surveys?companyId=${companyId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch surveys:', error);
  }
  return [];
}

async function estimateResponseCount(companyId: string, audience?: string | null) {
  try {
    // Get employee count for estimation
    const response = await fetch(`/api/employees?companyId=${companyId}&count=true`);
    if (response.ok) {
      const data = await response.json();
      const totalEmployees = data.count || 25;
      
      // Estimate based on audience
      if (audience === "all") return totalEmployees;
      if (audience === "managers") return Math.ceil(totalEmployees * 0.15);
      if (audience === "leadership") return Math.ceil(totalEmployees * 0.05);
      
      // Department-specific estimation
      return Math.ceil(totalEmployees * 0.3);
    }
  } catch (error) {
    console.error('Failed to estimate response count:', error);
  }
  return 25;
}

async function getSurveyAnalytics(companyId: string, surveyName?: string, timeframe?: string) {
  try {
    const params = new URLSearchParams({ companyId });
    if (surveyName) params.append('surveyName', surveyName);
    if (timeframe) params.append('timeframe', timeframe);
    
    const response = await fetch(`/api/surveys/analytics?${params}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch survey analytics:', error);
  }
  return [];
}

async function getSurveyCompletionData(companyId: string, surveyName?: string, department?: string | null) {
  try {
    const surveys = await getAvailableSurveys(companyId);
    const targetSurvey = surveyName 
      ? surveys.find((s: any) => s.name.toLowerCase().includes(surveyName.toLowerCase()))
      : surveys[0];
    
    if (!targetSurvey) return null;
    
    // Get responses for the survey
    const response = await fetch(`/api/surveys/${targetSurvey.id}/responses`);
    if (response.ok) {
      const responses = await response.json();
      
      // Get all employees for comparison
      const employeesResponse = await fetch(`/api/employees?companyId=${companyId}`);
      const employees = employeesResponse.ok ? await employeesResponse.json() : [];
      
      const completedIds = responses.map((r: any) => r.employeeId);
      const completed = employees.filter((e: any) => completedIds.includes(e.id));
      const pending = employees.filter((e: any) => !completedIds.includes(e.id));
      
      // Filter by department if specified
      const filterByDept = (list: any[]) => department 
        ? list.filter(e => e.department?.toLowerCase().includes(department.toLowerCase()))
        : list;
      
      return {
        completed: filterByDept(completed),
        pending: filterByDept(pending),
        overdue: [] // Would need deadline logic
      };
    }
  } catch (error) {
    console.error('Failed to fetch completion data:', error);
  }
  return null;
}

async function getSurveyResults(companyId: string, surveyName?: string) {
  try {
    const surveys = await getAvailableSurveys(companyId);
    const targetSurvey = surveyName 
      ? surveys.find((s: any) => s.name.toLowerCase().includes(surveyName.toLowerCase()))
      : surveys[0];
    
    if (!targetSurvey) return null;
    
    const response = await fetch(`/api/surveys/${targetSurvey.id}/responses`);
    if (response.ok) {
      const responses = await response.json();
      return {
        survey: targetSurvey,
        responses,
        summary: generateResponseSummary(responses)
      };
    }
  } catch (error) {
    console.error('Failed to fetch survey results:', error);
  }
  return null;
}

async function generateSurveyDigest(results: any, focusArea?: string | null) {
  try {
    // Use the existing digest endpoint
    const response = await fetch(`/api/surveys/${results.survey.id}/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focusArea })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to generate survey digest:', error);
  }
  
  // Fallback digest
  return {
    summary: `Survey "${results.survey.name}" received ${results.responses.length} responses. Key insights would be generated here using AI analysis.`,
    keyFindings: ["Response rate analysis", "Sentiment trends", "Key feedback themes"],
    recommendations: ["Follow up on feedback", "Address concerns", "Share results with team"]
  };
}

async function getActiveSurveys(companyId: string) {
  try {
    const response = await fetch(`/api/surveys?companyId=${companyId}&status=active`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch active surveys:', error);
  }
  return [];
}

async function getSurveyCompletionRate(surveyId: string) {
  try {
    const response = await fetch(`/api/surveys/${surveyId}/completion`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch completion rate:', error);
  }
  return { rate: 0, completed: 0, total: 0 };
}

function generateTrendInsights(analytics: any[]): string {
  return "Trend analysis insights would be generated here.";
}

function generateSentimentInsights(analytics: any[]): string {
  return "Sentiment analysis insights would be generated here.";
}

function generateGeneralInsights(analytics: any[]): string {
  return "General survey insights would be generated here.";
}

function extractHighlights(schema: any): string[] {
  if (!schema || !schema.sections) return [];
  
  const highlights: string[] = [];
  schema.sections.forEach((section: any) => {
    if (section.fields) {
      section.fields.forEach((field: any) => {
        if (field.type === "chips" && field.optionItems) {
          highlights.push(`${field.label} options`);
        } else if (field.type === "textarea") {
          highlights.push("Open feedback");
        }
      });
    }
  });
  
  return highlights.length > 0 ? highlights : ["Interactive questions", "Quick responses", "Actionable insights"];
}

function generateResponseSummary(responses: any[]): any {
  return {
    totalResponses: responses.length,
    responseRate: "Calculated based on employee count",
    lastResponse: responses.length > 0 ? responses[responses.length - 1].createdAt : null,
    avgCompletionTime: "5-10 minutes"
  };
}
