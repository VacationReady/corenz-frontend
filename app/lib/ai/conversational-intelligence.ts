/**
 * Conversational Intelligence Layer
 * Makes the AI proactively understand what HR really wants
 */

import { openai, AI_CONFIG } from "./openai-client";
import { getSystemContext } from "./system-context";
import {
  buildGuardrailPrompt,
  buildSystemKnowledgePrompt,
  CORE_CONVERSATION_SECTIONS,
} from "./system-knowledge";

const CORE_KNOWLEDGE_PROMPT = buildSystemKnowledgePrompt({
  sections: CORE_CONVERSATION_SECTIONS,
  includeHeading: false,
});

const CORE_GUARDRAILS_PROMPT = buildGuardrailPrompt({ includeHeading: false });

export interface ClarificationResponse {
  needsClarification: boolean;
  question?: string;
  suggestions?: string[];
  confidence: number;
  reasoning?: string;
}

/**
 * Analyzes a user's vague request and generates smart clarifying questions
 * Enhanced with context-aware suggestions using live system data
 */
export async function needsClarification(
  userMessage: string,
  conversationHistory: string,
  systemContext: string,
  companyId?: string
): Promise<ClarificationResponse> {
  // Parse system context to extract actionable data
  let contextData: any = {};
  try {
    if (companyId) {
      contextData = await getSystemContext(companyId);
    }
  } catch (error) {
    console.error("[Conversational Intelligence] Failed to get system context:", error);
  }

  // Build data-driven suggestions context
  const dataDrivenContext = buildDataDrivenContext(contextData, userMessage);

  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are a helpful HR assistant who proactively digs deeper to understand what users really want.

CORE PHILOSOPHY:
- If a request is vague, DON'T just execute something generic - ASK what they really need
- Be conversational and helpful, not robotic
- Understand context from previous conversation
- Suggest common use cases to help users articulate their needs
- USE ACTUAL SYSTEM DATA to provide relevant, data-driven suggestions

WHEN TO ASK FOR CLARIFICATION:
✅ Vague verbs: "check", "look at", "see", "show", "tell me about"
✅ Missing key details: no timeframe, no specific criteria, no department
✅ Ambiguous terms: "everyone", "stuff", "things", "that", "it"
✅ Could mean multiple things: "run report" (which report?), "send email" (to who? about what?)

WHEN NOT TO CLARIFY (just execute):
❌ Specific and clear: "Show me employees in Sales department"
❌ Has enough context: "Check IRD numbers" → clear what to check
❌ Follow-up that references previous message: "Email them" after listing people

${systemContext}

${conversationHistory}

LIVE SYSTEM DATA FOR SMART SUGGESTIONS:
${dataDrivenContext}

SYSTEM KNOWLEDGE BASE:
${CORE_KNOWLEDGE_PROMPT}

GUARDRAILS:
${CORE_GUARDRAILS_PROMPT}

USER MESSAGE: "${userMessage}"

IMPORTANT: When providing suggestions, use ACTUAL data from the system context above.

Examples of data-driven suggestions:
- User: "Run a compliance check"
  Response: "What type? • IRD numbers (${contextData.employees?.withoutIRD || 0} employees missing) • Expiring contracts (${contextData.employees?.contractsExpiringSoon || 0} expiring soon) • Missing documents"

- User: "Send a survey"
  Response: "What type? • Pulse Survey (${contextData.surveys?.active || 0} currently active) • eNPS • Team Feedback • Custom"

- User: "Show me action items"
  Response: "Which ones? • Overdue (${contextData.actionItems?.overdue || 0} items) • Due today (${contextData.actionItems?.dueToday || 0} items) • Due this week (${contextData.actionItems?.dueThisWeek || 0} items)"

Respond with JSON:
{
  "needsClarification": boolean,
  "question": "conversational question to ask user (if needed)",
  "suggestions": ["data-driven option 1 with numbers", "option 2 with context", "option 3"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

/**
 * Build data-driven context from system data for smart suggestions
 */
function buildDataDrivenContext(contextData: any, userMessage: string): string {
  if (!contextData || Object.keys(contextData).length === 0) {
    return "No system data available";
  }

  const lowerMessage = userMessage.toLowerCase();
  let context = "";

  // Departments context
  if (contextData.departments && contextData.departments.length > 0) {
    context += `\nAvailable Departments: ${contextData.departments.map((d: any) => `${d.name} (${d.count} employees)`).join(", ")}`;
  }

  // Survey context
  if (lowerMessage.includes("survey") || lowerMessage.includes("feedback")) {
    context += `\n\nSurvey Data:`;
    context += `\n- Active Surveys: ${contextData.surveys?.active || 0}`;
    context += `\n- Average Response Rate: ${contextData.surveys?.avgResponseRate || 0}%`;
    context += `\n- Survey Automation Rules: ${contextData.surveys?.automationRules || 0}`;
    if (contextData.surveys?.recentSurveys && contextData.surveys.recentSurveys.length > 0) {
      context += `\n- Recent: ${contextData.surveys.recentSurveys.slice(0, 3).map((s: any) => s.name).join(", ")}`;
    }
  }

  // Performance context
  if (lowerMessage.includes("objective") || lowerMessage.includes("goal") || lowerMessage.includes("performance") || lowerMessage.includes("review")) {
    context += `\n\nPerformance Data:`;
    context += `\n- Total Objectives: ${contextData.performance?.totalObjectives || 0}`;
    context += `\n- At Risk: ${contextData.performance?.objectivesAtRisk || 0} ⚠️`;
    context += `\n- Upcoming Meetings: ${contextData.performance?.upcomingMeetings || 0}`;
    context += `\n- Active Review Cycles: ${contextData.performance?.activeReviewCycles || 0}`;
  }

  // Action Items context
  if (lowerMessage.includes("action") || lowerMessage.includes("task") || lowerMessage.includes("todo") || lowerMessage.includes("overdue")) {
    context += `\n\nAction Items:`;
    context += `\n- Overdue: ${contextData.actionItems?.overdue || 0} ${(contextData.actionItems?.overdue || 0) > 0 ? "⚠️" : ""}`;
    context += `\n- Due Today: ${contextData.actionItems?.dueToday || 0}`;
    context += `\n- Due This Week: ${contextData.actionItems?.dueThisWeek || 0}`;
    context += `\n- Total Pending: ${contextData.actionItems?.totalPending || 0}`;
  }

  // Compliance context
  if (lowerMessage.includes("compliance") || lowerMessage.includes("check") || lowerMessage.includes("audit") || lowerMessage.includes("verify")) {
    context += `\n\nCompliance Data:`;
    context += `\n- Employees without IRD: ${contextData.employees?.withoutIRD || 0} ${(contextData.employees?.withoutIRD || 0) > 0 ? "⚠️" : ""}`;
    context += `\n- Contracts expiring soon: ${contextData.employees?.contractsExpiringSoon || 0}`;
    context += `\n- Expiring documents: ${contextData.recentActivity?.expiringDocuments || 0}`;
  }

  // Workflow context
  if (lowerMessage.includes("workflow") || lowerMessage.includes("automation") || lowerMessage.includes("automate")) {
    context += `\n\nWorkflow Data:`;
    context += `\n- Active Workflows: ${contextData.workflows?.active || 0}`;
    context += `\n- Failed (24h): ${contextData.workflows?.failed24h || 0} ${(contextData.workflows?.failed24h || 0) > 0 ? "⚠️" : ""}`;
    context += `\n- Currently Running: ${contextData.workflows?.running || 0}`;
  }

  // Employee context
  if (lowerMessage.includes("employee") || lowerMessage.includes("headcount") || lowerMessage.includes("staff")) {
    context += `\n\nEmployee Data:`;
    context += `\n- Total Employees: ${contextData.employees?.total || 0} (${contextData.employees?.active || 0} active)`;
    context += `\n- New Hires (30 days): ${contextData.recentActivity?.newHires || 0}`;
    if (contextData.employees?.byDepartment) {
      const topDepts = Object.entries(contextData.employees.byDepartment)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3)
        .map(([name, count]) => `${name}: ${count}`)
        .join(", ");
      if (topDepts) {
        context += `\n- Largest Departments: ${topDepts}`;
      }
    }
  }

  return context || "No relevant system data for this request";
}

/**
 * Expands a vague/casual request into a detailed action plan
 */
export async function expandIntent(
  userMessage: string,
  conversationHistory: string,
  companyId: string
): Promise<{
  expandedIntent: string;
  suggestedActions: string[];
  followUpQuestions: string[];
}> {
  const systemContext = await getSystemContext(companyId);
  
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are an HR assistant helping interpret what users REALLY want when they make vague requests.

CONTEXT:
${JSON.stringify(systemContext, null, 2)}

SYSTEM KNOWLEDGE BASE:
${CORE_KNOWLEDGE_PROMPT}

CRITICAL GUARDRAILS:
${CORE_GUARDRAILS_PROMPT}

CONVERSATION SO FAR:
${conversationHistory}

Your job: Take vague requests and figure out what the user probably wants to accomplish.

EXAMPLES:

Input: "check stuff"
Output: {
  "expandedIntent": "User wants to review something but hasn't specified what. Likely wants to check compliance, data quality, or pending tasks.",
  "suggestedActions": [
    "Run a compliance check on all employees",
    "Check for missing employee data",
    "Review pending tasks or workflows"
  ],
  "followUpQuestions": [
    "What would you like to check? (compliance, employee data, tasks)",
    "Any specific department or group?",
    "Looking for problems or just a general overview?"
  ]
}

Input: "send email"
Output: {
  "expandedIntent": "User wants to send communication but hasn't specified recipients or content. Need to determine audience and message.",
  "suggestedActions": [
    "Email all managers about a policy update",
    "Send reminder to specific department",
    "Notify everyone about system change"
  ],
  "followUpQuestions": [
    "Who should receive this email? (managers, department, everyone)",
    "What's the email about?",
    "Is this urgent or can it wait?"
  ]
}

Input: "gimme analytics"
Output: {
  "expandedIntent": "User wants workforce insights but type of analytics is unclear. Could be turnover, diversity, headcount, or trends.",
  "suggestedActions": [
    "Generate turnover report by department",
    "Show diversity statistics",
    "Display workforce growth trends"
  ],
  "followUpQuestions": [
    "What kind of analytics? (turnover, diversity, growth)",
    "Any specific time period?",
    "Need it broken down by department?"
  ]
}

Now analyze: "${userMessage}"

Respond with JSON following the format above.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

/**
 * Generates helpful follow-up questions after an action completes
 */
export async function generateFollowUps(
  completedAction: string,
  result: any,
  conversationHistory: string
): Promise<string[]> {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `You are an HR assistant who proactively suggests next steps.

After completing an action, suggest 3-5 natural follow-ups that HR might want to do next.

EXAMPLES:

Action: "Ran compliance check, found 12 employees missing IRD numbers"
Follow-ups:
- "Want me to email those 12 people to remind them?"
- "Should I create a workflow to auto-check this weekly?"
- "Need the list exported for payroll?"

Action: "Generated turnover report showing 15% rate in Sales"
Follow-ups:
- "Want to see which roles in Sales have the highest turnover?"
- "Should I compare this to other departments?"
- "Need me to schedule this report to run monthly?"

Action: "Emailed all managers about new policy"
Follow-ups:
- "Want me to track who's read it?"
- "Should I send a follow-up reminder in a week?"
- "Need to email employees too?"

Keep questions conversational, casual, and action-oriented.

SYSTEM KNOWLEDGE BASE:
${CORE_KNOWLEDGE_PROMPT}

GUARDRAILS:
${CORE_GUARDRAILS_PROMPT}

COMPLETED ACTION: ${completedAction}
RESULT: ${JSON.stringify(result)}
CONVERSATION: ${conversationHistory}

Generate 3-5 relevant follow-up questions as a JSON array.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || '{"followUps":[]}');
  return response.followUps || [];
}

/**
 * Detects if user is frustrated and generates empathetic response
 */
export async function detectFrustration(
  userMessage: string,
  conversationHistory: string
): Promise<{ isFrustrated: boolean; empatheticResponse?: string }> {
  const frustrationIndicators = [
    /why (isn't|isnt|wont|won't)/i,
    /doesn't work/i,
    /not working/i,
    /frustrated/i,
    /annoying/i,
    /stupid/i,
    /wtf/i,
    /ffs/i,
    /seriously/i,
    /come on/i,
    /again\?/i,
  ];

  const isFrustrated = frustrationIndicators.some(pattern => pattern.test(userMessage));

  if (!isFrustrated) {
    return { isFrustrated: false };
  }

  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `You are an empathetic HR assistant. The user seems frustrated. Generate a brief, empathetic response that:
1. Acknowledges their frustration
2. Takes responsibility
3. Offers to help in a different way

Keep it casual, friendly, and solution-focused.

CONVERSATION:
${conversationHistory}

USER (frustrated): "${userMessage}"

Generate a short empathetic response (2-3 sentences).`,
      },
    ],
  });

  return {
    isFrustrated: true,
    empatheticResponse: completion.choices[0].message.content || undefined,
  };
}

/**
 * Suggests better ways to phrase a request (educational)
 */
export function suggestBetterPhrasing(intent: string, confidence: number): string | undefined {
  if (confidence < 0.5) {
    const examples = {
      compliance: "Try: 'run compliance check' or 'check visa expiries'",
      analytics: "Try: 'gimme turnover stats' or 'show diversity breakdown'",
      email: "Try: 'email sales team about training' or 'send reminder to managers'",
      general: "Try being more specific - mention who, what, or when",
    };

    // Simple matching for now
    if (/compliance|check/i.test(intent)) return examples.compliance;
    if (/analytics|stats|report/i.test(intent)) return examples.analytics;
    if (/email|send|notify/i.test(intent)) return examples.email;
    
    return examples.general;
  }
  
  return undefined;
}

