/**
 * REVOLUTIONARY CONVERSATIONAL AI ENGINE
 * The next generation of HR AI that asks intelligent questions and guides users through complex workflows
 */

import { openai, AI_CONFIG } from "./openai-client";
import {
  buildGuardrailPrompt,
  buildSystemKnowledgePrompt,
  CORE_CONVERSATION_SECTIONS,
} from "./system-knowledge";

const CONVERSATION_KNOWLEDGE_PROMPT = buildSystemKnowledgePrompt({
  sections: CORE_CONVERSATION_SECTIONS,
  includeHeading: false,
});

const CONVERSATION_GUARDRAILS = buildGuardrailPrompt({ includeHeading: false });

export interface ConversationalResponse {
  success: boolean;
  message: string;
  questionType?: 'clarification' | 'options' | 'details' | 'confirmation' | 'guidance';
  questions?: string[];
  suggestions?: string[];
  context?: any;
  nextSteps?: string[];
  actionType?: string;
  requiresInput?: boolean;
  conversationState?: any;
}

/**
 * NEXT-GEN CONVERSATIONAL AI
 * Handles vague requests by asking intelligent follow-up questions
 */
export async function handleConversationalRequest(
  userMessage: string,
  companyId: string,
  userId: string,
  conversationHistory?: any[]
): Promise<ConversationalResponse> {

  // Analyze the user's intent and determine what questions to ask
  const analysis = await analyzeConversationalIntent(userMessage, conversationHistory);
  
  if (analysis.isComplete) {
    // User has provided enough information - proceed with action
    return {
      success: true,
      message: "Perfect! I have everything I need. Let me set this up for you...",
      actionType: analysis.actionType,
      context: analysis.extractedInfo
    };
  }

  // Generate intelligent follow-up questions
  return await generateIntelligentQuestions(userMessage, analysis, companyId);
}

/**
 * Analyze user intent and determine what information is missing
 */
async function analyzeConversationalIntent(userMessage: string, conversationHistory?: any[]) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are a next-generation HR AI that analyzes user requests to determine what information is needed.

ANALYZE THE USER'S REQUEST FOR:

1. **INTENT CLARITY** (0-100%):
   - What are they trying to accomplish?
   - Is the intent clear or vague?

2. **INFORMATION COMPLETENESS** (0-100%):
   - Survey type (pulse, eNPS, engagement, 360, exit, onboarding, custom)
   - Audience (all, department, role, managers, new hires, specific people)
   - Timing (now, scheduled, recurring, lifecycle-triggered)
   - Automation (email results, reminders, workflows, integrations)
   - Privacy (anonymous, department-level, individual, custom)
   - Stakeholders (who gets results, who approves, who manages)

3. **ACTION TYPE**:
   - survey_automation, form_creation, workflow_building, bulk_action, communication, data_query, employee_management

4. **MISSING INFORMATION**:
   - What key details are missing?
   - What would make this actionable?

5. **CONVERSATION STRATEGY**:
   - Should we ask one focused question or present options?
   - What's the best way to guide them?

CONVERSATION HISTORY: ${JSON.stringify(conversationHistory || [])}

SYSTEM KNOWLEDGE BASE:
${CONVERSATION_KNOWLEDGE_PROMPT}

CRITICAL GUARDRAILS:
${CONVERSATION_GUARDRAILS}

Respond with JSON:
{
  "intentClarity": 85,
  "completeness": 45,
  "actionType": "survey_automation",
  "extractedInfo": {
    "surveyType": "monthly survey",
    "audience": "unclear",
    "timing": "monthly",
    "automation": "unclear"
  },
  "missingInfo": ["survey_type", "audience", "results_handling"],
  "isComplete": false,
  "conversationStrategy": "present_options",
  "reasoning": "User wants monthly surveys but hasn't specified type or audience"
}`
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    return { isComplete: false, actionType: "unknown" };
  }
}

/**
 * Generate intelligent follow-up questions based on analysis
 */
async function generateIntelligentQuestions(
  userMessage: string, 
  analysis: any, 
  companyId: string
): Promise<ConversationalResponse> {

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.7,
    messages: [
      {
        role: "system", 
        content: `You are a next-generation HR AI assistant that asks PERFECT follow-up questions.

CONVERSATION PRINCIPLES:
- Be enthusiastic and helpful
- Ask ONE focused question at a time (unless presenting clear options)
- Make it feel like talking to an expert HR consultant
- Use emojis and formatting to make it engaging
- Provide smart suggestions and examples
- Show you understand their business context

QUESTION STRATEGIES:

**For Survey Requests:**
- "What type of survey?" → Present clear options with descriptions
- "Who should receive it?" → Suggest audiences based on company context  
- "How often?" → Offer scheduling options with examples
- "What should happen with results?" → Email, reporting, automation options

**For Workflow Requests:**
- "What should trigger this?" → Present trigger options
- "Who should be involved?" → Roles, approvers, recipients
- "What actions should happen?" → Step-by-step workflow building

**For Form Building:**
- "What type of form?" → Onboarding, feedback, request, custom
- "What information do you need?" → Field suggestions
- "Who will use this?" → Audience and access levels

**For Communications:**
- "Who should receive this?" → Audience targeting
- "What's the message about?" → Context and purpose
- "When should it go out?" → Timing and scheduling

**For Bulk Actions:**
- "Which employees?" → Department, role, criteria
- "What changes?" → Salary, role, location, benefits
- "Any conditions?" → Approval workflows, effective dates

SYSTEM KNOWLEDGE BASE:
${CONVERSATION_KNOWLEDGE_PROMPT}

GUARDRAILS:
${CONVERSATION_GUARDRAILS}

CURRENT ANALYSIS: ${JSON.stringify(analysis)}

Create an engaging response that asks the RIGHT question to move forward.`
      },
      {
        role: "user",
        content: `User said: "${userMessage}"\n\nWhat should I ask them next?`
      }
    ]
  });

  const response = completion.choices[0].message.content || "";
  
  // Generate contextual suggestions based on the analysis
  const suggestions = generateContextualSuggestions(analysis, userMessage);

  return {
    success: true,
    message: response,
    questionType: determineQuestionType(analysis),
    suggestions,
    conversationState: analysis,
    requiresInput: true
  };
}

/**
 * Generate smart suggestions based on context
 */
function generateContextualSuggestions(analysis: any, userMessage: string): string[] {
  const suggestions: string[] = [];
  
  if (analysis.actionType === "survey_automation") {
    if (!analysis.extractedInfo?.surveyType) {
      suggestions.push(
        "Monthly pulse survey for team mood",
        "Quarterly eNPS for employee loyalty", 
        "Annual engagement survey",
        "Onboarding feedback after 30 days",
        "Exit interview automation"
      );
    } else if (!analysis.extractedInfo?.audience) {
      suggestions.push(
        "All employees company-wide",
        "Specific department (Sales, Engineering, etc.)",
        "Managers and leadership only",
        "New hires in their first 90 days"
      );
    } else if (!analysis.extractedInfo?.automation) {
      suggestions.push(
        "Email results to leadership",
        "Send to department heads",
        "Create executive dashboard",
        "Automated reminders and follow-ups"
      );
    }
  }
  
  if (analysis.actionType === "workflow_building") {
    suggestions.push(
      "Contract expiry alerts",
      "Onboarding automation",
      "Performance review reminders",
      "Leave approval workflows"
    );
  }
  
  if (analysis.actionType === "form_creation") {
    suggestions.push(
      "Employee feedback form",
      "Onboarding checklist",
      "Leave request form",
      "Performance review form"
    );
  }
  
  if (analysis.actionType === "bulk_action") {
    suggestions.push(
      "Salary adjustments by department",
      "Role changes for promotions",
      "Location updates for remote work",
      "Benefits enrollment for everyone"
    );
  }

  return suggestions.slice(0, 4); // Keep it focused
}

/**
 * Determine the type of question being asked
 */
function determineQuestionType(analysis: any): 'clarification' | 'options' | 'details' | 'confirmation' | 'guidance' {
  if (analysis.intentClarity < 50) return 'clarification';
  if (analysis.completeness < 30) return 'options';
  if (analysis.completeness < 70) return 'details';
  if (analysis.completeness < 90) return 'confirmation';
  return 'guidance';
}

/**
 * SMART CONVERSATION PATTERNS
 */
export const CONVERSATION_PATTERNS = {
  // Survey Conversations
  SURVEY_MONTHLY_VAGUE: {
    trigger: /monthly survey|survey monthly|once a month/i,
    response: "Great idea! Monthly surveys are perfect for staying connected with your team. 📊\n\n**What type of monthly survey are you thinking?**\n\n• **Pulse Survey** - Quick mood and engagement check\n• **eNPS Survey** - Employee loyalty and satisfaction\n• **Team Feedback** - Department-specific insights\n• **Custom Survey** - Tailored to your specific needs\n\nWhich one sounds right for your goals?"
  },

  // Workflow Conversations  
  WORKFLOW_VAGUE: {
    trigger: /workflow|automate|automation/i,
    response: "Absolutely! Automation saves so much time. 🚀\n\n**What would you like to automate?**\n\n• **Employee Lifecycle** - Onboarding, reviews, exits\n• **Document Management** - Contracts, policies, compliance\n• **Communication Flows** - Reminders, notifications, updates\n• **Approval Processes** - Leave, expenses, changes\n\nWhat's the biggest time-sink you'd love to automate?"
  },

  // Form Building Conversations
  FORM_VAGUE: {
    trigger: /form|create a form|build a form/i,
    response: "Perfect! Custom forms make everything smoother. 📝\n\n**What type of form do you need?**\n\n• **Employee Onboarding** - Welcome forms and checklists\n• **Feedback Collection** - Surveys and evaluations\n• **Request Forms** - Leave, equipment, changes\n• **Performance Reviews** - Structured evaluation forms\n\nWhat information are you trying to collect?"
  },

  // Communication Conversations
  COMMUNICATION_VAGUE: {
    trigger: /email|notify|communicate|send/i,
    response: "Great! Clear communication is everything in HR. 📧\n\n**What kind of communication?**\n\n• **Announcements** - Company updates, policy changes\n• **Reminders** - Deadlines, reviews, compliance\n• **Targeted Messages** - Department or role-specific\n• **Automated Notifications** - Triggered by events\n\nWho needs to hear from you?"
  }
};

/**
 * Check if user input matches conversation patterns
 */
export function matchConversationPattern(userMessage: string): any | null {
  for (const [key, pattern] of Object.entries(CONVERSATION_PATTERNS)) {
    if (pattern.trigger.test(userMessage)) {
      return { key, ...pattern };
    }
  }
  return null;
}
