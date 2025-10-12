/**
 * Advanced Conversational Intelligence
 * Provides sophisticated conversation capabilities:
 * - Proactive suggestions based on context
 * - Rich clarification with detailed context
 * - Confidence-based response strategies
 * - Pattern recognition and learning
 * - Emotional intelligence
 */

import { openai, AI_CONFIG } from "./openai-client";
import { getConversation } from "./conversation-memory";

export interface ProactiveSuggestion {
  text: string;
  type: "next_step" | "related_action" | "optimization" | "insight";
  confidence: number;
  reasoning?: string;
}

export interface ClarificationRequest {
  question: string;
  options: Array<{
    label: string;
    details: string;
    value: any;
  }>;
  context?: string;
}

/**
 * Generate proactive suggestions after an action
 */
export async function generateProactiveSuggestions(
  actionType: string,
  actionResult: any,
  conversationHistory: string
): Promise<ProactiveSuggestion[]> {
  try {
    const prompt = `Based on this action, suggest 2-3 logical next steps the user might want to take.

Action Type: ${actionType}
Result: ${JSON.stringify(actionResult, null, 2)}
Conversation Context: ${conversationHistory}

Requirements:
- Be specific and actionable
- Consider the user's workflow
- Don't repeat what was just done
- Focus on value-add actions
- Keep suggestions concise (8-12 words max)

Example output for "booked leave for Sarah":
1. "Check who else is off during this period"
2. "Book leave for Sarah's team members"
3. "Set up auto-reply for Sarah's emails"

Respond in JSON:
{
  "suggestions": [
    {
      "text": "suggestion text",
      "type": "next_step",
      "reasoning": "why this is relevant"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a helpful HR AI assistant that provides proactive, contextual suggestions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("[Proactive Suggestions Error]", error);
    // Return fallback generic suggestions
    return getGenericSuggestions(actionType);
  }
}

/**
 * Generate rich clarification requests with detailed context
 */
export async function generateRichClarification(
  ambiguousQuery: string,
  matchingItems: any[],
  matchType: "employee" | "department" | "workflow" | "survey" | "general"
): Promise<ClarificationRequest> {
  if (matchType === "employee") {
    return {
      question: `I found ${matchingItems.length} employees. Which one do you mean?`,
      options: matchingItems.map((emp) => ({
        label: emp.name,
        details: formatEmployeeDetails(emp),
        value: emp.id,
      })),
      context: "Please select the specific person you're referring to:",
    };
  }

  if (matchType === "department") {
    return {
      question: `I found ${matchingItems.length} departments. Which one?`,
      options: matchingItems.map((dept) => ({
        label: dept.name,
        details: `${dept.employeeCount || 0} employees${dept.manager ? ` • Manager: ${dept.manager}` : ""}`,
        value: dept.id,
      })),
      context: "Please select the specific department:",
    };
  }

  // Generic clarification
  return {
    question: `I found ${matchingItems.length} matches. Could you be more specific?`,
    options: matchingItems.slice(0, 5).map((item, idx) => ({
      label: item.name || `Option ${idx + 1}`,
      details: JSON.stringify(item).slice(0, 100),
      value: item.id || idx,
    })),
  };
}

/**
 * Assess confidence and determine response strategy
 */
export interface ConfidenceStrategy {
  level: "low" | "medium" | "high";
  action: "clarify" | "suggest" | "proceed";
  message?: string;
}

export function determineConfidenceStrategy(
  confidence: number,
  context: {
    hasAmbiguity?: boolean;
    hasRiskyAction?: boolean;
    hasMultipleMatches?: boolean;
  }
): ConfidenceStrategy {
  // Override: Always clarify if there are multiple matches
  if (context.hasMultipleMatches) {
    return {
      level: "low",
      action: "clarify",
      message: "Multiple matches found - please clarify which one you mean.",
    };
  }

  // Override: Always confirm risky actions regardless of confidence
  if (context.hasRiskyAction) {
    return {
      level: "medium",
      action: "suggest",
      message: "This action affects multiple records. Please review the preview carefully.",
    };
  }

  // Low confidence: Ask for clarification
  if (confidence < 0.7 || context.hasAmbiguity) {
    return {
      level: "low",
      action: "clarify",
      message: "I'm not entirely sure what you mean. Could you provide more details?",
    };
  }

  // Medium confidence: Suggest interpretation
  if (confidence < 0.9) {
    return {
      level: "medium",
      action: "suggest",
      message: "I think you want to do X. Is that correct?",
    };
  }

  // High confidence: Proceed with action
  return {
    level: "high",
    action: "proceed",
  };
}

/**
 * Detect patterns in user behavior and learn preferences
 */
export interface UserPattern {
  type: "preference" | "workflow" | "naming" | "frequency";
  pattern: string;
  confidence: number;
  examples: string[];
}

export function detectUserPatterns(
  userId: string,
  companyId: string
): UserPattern[] {
  const conversation = getConversation(userId, companyId);
  const patterns: UserPattern[] = [];

  // Analyze recent queries for patterns
  const recentQueries = conversation.messages
    .filter((m) => m.role === "user")
    .slice(-20)
    .map((m) => m.content.toLowerCase());

  // Pattern: Frequent department queries
  const deptMentions = new Map<string, number>();
  recentQueries.forEach((query) => {
    const depts = ["sales", "engineering", "it", "hr", "marketing", "finance"];
    depts.forEach((dept) => {
      if (query.includes(dept)) {
        deptMentions.set(dept, (deptMentions.get(dept) || 0) + 1);
      }
    });
  });

  deptMentions.forEach((count, dept) => {
    if (count >= 3) {
      patterns.push({
        type: "preference",
        pattern: `Frequently queries ${dept} department`,
        confidence: Math.min(count / 5, 1),
        examples: recentQueries.filter((q) => q.includes(dept)).slice(0, 3),
      });
    }
  });

  // Pattern: Naming conventions (e.g., distinguishes "Sales" from "Sales & Marketing")
  if (conversation.entities.userPreferences) {
    const prefs = conversation.entities.userPreferences;
    if (prefs.distinctDepartments && Array.isArray(prefs.distinctDepartments)) {
      patterns.push({
        type: "naming",
        pattern: `Distinguishes between similar department names`,
        confidence: 0.9,
        examples: prefs.distinctDepartments,
      });
    }
  }

  // Pattern: Workflow sequences
  const actionSequences = conversation.messages
    .filter((m) => m.role === "assistant" && m.content.includes("✅"))
    .slice(-10);

  if (actionSequences.length >= 3) {
    patterns.push({
      type: "workflow",
      pattern: `Common workflow: ${actionSequences.slice(0, 3).map(a => a.content.slice(0, 50)).join(" → ")}`,
      confidence: 0.7,
      examples: actionSequences.map((a) => a.content.slice(0, 100)),
    });
  }

  return patterns;
}

/**
 * Generate insights and anomalies from recent data
 */
export interface DataInsight {
  type: "anomaly" | "trend" | "recommendation" | "alert";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  suggestedAction?: string;
  data?: any;
}

export async function generateProactiveInsights(
  companyId: string,
  systemContext: any
): Promise<DataInsight[]> {
  const insights: DataInsight[] = [];

  // Analyze employee data for insights
  if (systemContext.stats) {
    const { stats } = systemContext;

    // Anomaly: High turnover
    if (stats.turnoverRate > 15) {
      insights.push({
        type: "anomaly",
        priority: "high",
        title: "High Turnover Detected",
        description: `Your turnover rate is ${stats.turnoverRate}% (industry average: 10-12%)`,
        suggestedAction: "Run exit interview analysis or check salary competitiveness",
      });
    }

    // Alert: Contracts expiring soon
    if (stats.contractsExpiringSoon > 0) {
      insights.push({
        type: "alert",
        priority: "high",
        title: `${stats.contractsExpiringSoon} Contracts Expiring Soon`,
        description: `${stats.contractsExpiringSoon} employees have contracts expiring in the next 60 days`,
        suggestedAction: "Review and renew contracts or start offboarding process",
      });
    }

    // Recommendation: Missing data
    if (stats.missingIRD > 10) {
      insights.push({
        type: "recommendation",
        priority: "medium",
        title: "Missing IRD Numbers",
        description: `${stats.missingIRD} employees don't have IRD numbers on file`,
        suggestedAction: "Run compliance sweep and send reminders",
      });
    }

    // Trend: Department growth
    if (stats.departmentGrowth) {
      const fastGrowing = Object.entries(stats.departmentGrowth)
        .filter(([_, growth]: [string, any]) => growth > 20)
        .map(([dept, growth]) => `${dept} (+${growth}%)`);

      if (fastGrowing.length > 0) {
        insights.push({
          type: "trend",
          priority: "low",
          title: "Rapid Department Growth",
          description: `Fast-growing departments: ${fastGrowing.join(", ")}`,
          suggestedAction: "Consider onboarding capacity and manager support",
        });
      }
    }
  }

  return insights;
}

/**
 * Format employee details for rich display
 */
function formatEmployeeDetails(employee: any): string {
  const parts: string[] = [];

  if (employee.department) {
    parts.push(employee.department);
  }
  
  if (employee.jobRole) {
    parts.push(employee.jobRole);
  }

  if (employee.manager) {
    parts.push(`Reports to ${employee.manager}`);
  }

  if (employee.startDate) {
    const tenure = calculateTenure(new Date(employee.startDate));
    if (tenure) {
      parts.push(tenure);
    }
  }

  if (employee.location) {
    parts.push(employee.location);
  }

  if (employee.email) {
    parts.push(employee.email);
  }

  return parts.join(" • ");
}

/**
 * Calculate tenure in human-readable format
 */
function calculateTenure(startDate: Date): string {
  const now = new Date();
  const years = now.getFullYear() - startDate.getFullYear();
  const months = now.getMonth() - startDate.getMonth();

  if (years > 0) {
    return `${years}y ${months}m tenure`;
  } else if (months > 0) {
    return `${months} months tenure`;
  } else {
    return "New starter";
  }
}

/**
 * Generic fallback suggestions by action type
 */
function getGenericSuggestions(actionType: string): ProactiveSuggestion[] {
  const suggestionMap: Record<string, ProactiveSuggestion[]> = {
    book_leave: [
      {
        text: "Check who else is off during this period",
        type: "related_action",
        confidence: 0.8,
      },
      {
        text: "Book leave for other team members",
        type: "next_step",
        confidence: 0.7,
      },
      {
        text: "View team leave calendar",
        type: "related_action",
        confidence: 0.6,
      },
    ],
    bulk_update: [
      {
        text: "Notify affected employees about the change",
        type: "next_step",
        confidence: 0.9,
      },
      {
        text: "Create audit report of changes",
        type: "related_action",
        confidence: 0.7,
      },
      {
        text: "Set up automated workflow for future updates",
        type: "optimization",
        confidence: 0.6,
      },
    ],
    query_data: [
      {
        text: "Export this data to Excel",
        type: "next_step",
        confidence: 0.7,
      },
      {
        text: "Create workflow to automate this query",
        type: "optimization",
        confidence: 0.6,
      },
      {
        text: "Schedule regular report for this data",
        type: "optimization",
        confidence: 0.5,
      },
    ],
    create_workflow: [
      {
        text: "Test workflow with sample data",
        type: "next_step",
        confidence: 0.9,
      },
      {
        text: "Create similar workflows for other departments",
        type: "related_action",
        confidence: 0.6,
      },
      {
        text: "Set up notifications when workflow runs",
        type: "optimization",
        confidence: 0.7,
      },
    ],
    send_email: [
      {
        text: "Track who opened the email",
        type: "next_step",
        confidence: 0.7,
      },
      {
        text: "Schedule follow-up reminder",
        type: "related_action",
        confidence: 0.8,
      },
      {
        text: "Create template for future similar emails",
        type: "optimization",
        confidence: 0.6,
      },
    ],
  };

  return (
    suggestionMap[actionType] || [
      {
        text: "What else can I help you with?",
        type: "next_step",
        confidence: 0.5,
      },
    ]
  );
}

