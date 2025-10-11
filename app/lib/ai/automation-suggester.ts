/**
 * Automation Suggester
 * Detects repetitive patterns and proactively suggests automation opportunities
 */

import { openai, AI_CONFIG } from "./openai-client";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionType?: string;
}

export interface AutomationSuggestion {
  type: "scheduled_report" | "workflow_automation" | "bulk_operation" | "notification_rule";
  confidence: number;
  pattern: string;
  suggestion: string;
  automationPreview: {
    name: string;
    description: string;
    trigger: string;
    actions: string[];
    schedule?: string;
  };
  benefitEstimate: string;
  priority: "low" | "medium" | "high";
}

/**
 * Analyze conversation history to detect repetitive patterns
 */
export function analyzePatterns(conversationHistory: Message[]): {
  repeatQuery?: string;
  repeatCount: number;
  frequency: "daily" | "weekly" | "monthly" | "unknown";
  lastOccurrences: Date[];
} {
  // Extract user queries
  const userMessages = conversationHistory
    .filter(m => m.role === "user")
    .map(m => ({ content: m.content.toLowerCase(), timestamp: m.timestamp }));

  // Find repeated queries (similarity matching)
  const queryGroups = new Map<string, { count: number; timestamps: Date[] }>();
  
  userMessages.forEach(msg => {
    // Normalize query (remove dates, names, numbers for pattern matching)
    const normalized = msg.content
      .replace(/\d+/g, "N")
      .replace(/[a-z]+day/gi, "DAY")
      .replace(/this\s+(week|month|year)/gi, "TIMEPERIOD")
      .trim();
    
    const existing = queryGroups.get(normalized);
    if (existing) {
      existing.count++;
      existing.timestamps.push(msg.timestamp);
    } else {
      queryGroups.set(normalized, { count: 1, timestamps: [msg.timestamp] });
    }
  });

  // Find most repeated pattern
  let maxPattern: { query: string; count: number; timestamps: Date[] } | undefined = undefined;
  
  queryGroups.forEach((data, query) => {
    if (data.count >= 3) { // Minimum 3 occurrences to suggest automation
      if (!maxPattern || data.count > maxPattern.count) {
        maxPattern = { query, count: data.count, timestamps: data.timestamps };
      }
    }
  });

  if (!maxPattern) {
    return { repeatCount: 0, frequency: "unknown", lastOccurrences: [] };
  }

  // Calculate frequency
  // Explicitly destructure to help TypeScript narrow the type
  const { query, count, timestamps: patternTimestamps } = maxPattern;
  const timestamps = patternTimestamps.sort((a, b) => a.getTime() - b.getTime());
  const frequency = calculateFrequency(timestamps);

  return {
    repeatQuery: query,
    repeatCount: count,
    frequency,
    lastOccurrences: timestamps.slice(-5), // Last 5 occurrences
  };
}

function calculateFrequency(timestamps: Date[]): "daily" | "weekly" | "monthly" | "unknown" {
  if (timestamps.length < 2) return "unknown";

  // Calculate average interval in days
  let totalInterval = 0;
  for (let i = 1; i < timestamps.length; i++) {
    const interval = (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    totalInterval += interval;
  }
  const avgInterval = totalInterval / (timestamps.length - 1);

  if (avgInterval < 2) return "daily";
  if (avgInterval < 10) return "weekly";
  if (avgInterval < 35) return "monthly";
  return "unknown";
}

/**
 * Detect automation opportunities from conversation patterns
 */
export async function detectAutomationOpportunities(
  conversationHistory: Message[],
  userId: string,
  companyId: string
): Promise<AutomationSuggestion[]> {
  const suggestions: AutomationSuggestion[] = [];
  const patterns = analyzePatterns(conversationHistory);

  // Pattern 1: Repeated query → Scheduled Report
  if (patterns.repeatQuery && patterns.repeatCount >= 3) {
    const scheduleMap = {
      daily: "daily at 9:00 AM",
      weekly: "every Monday at 9:00 AM",
      monthly: "first day of month at 9:00 AM",
      unknown: "weekly",
    };

    suggestions.push({
      type: "scheduled_report",
      confidence: Math.min(patterns.repeatCount / 5, 1), // Max at 5 occurrences
      pattern: `You've checked "${patterns.repeatQuery}" ${patterns.repeatCount} times`,
      suggestion: `I notice you check this ${patterns.frequency}. Want me to email you this report automatically instead?`,
      automationPreview: {
        name: `Automated ${extractQueryType(patterns.repeatQuery)} Report`,
        description: `Automatically generates and emails the report you frequently request`,
        trigger: scheduleMap[patterns.frequency],
        actions: [
          "Generate report data",
          `Email report to ${userId}`,
          "Include trend comparison with previous period"
        ],
        schedule: scheduleMap[patterns.frequency],
      },
      benefitEstimate: `Saves ~${patterns.repeatCount * 2} minutes per ${patterns.frequency}`,
      priority: patterns.frequency === "daily" ? "high" : "medium",
    });
  }

  // Pattern 2: Bulk operations → Workflow Automation
  const bulkOperations = conversationHistory.filter(m => 
    m.actionType === "bulk_update" || 
    m.actionType === "bulk_notification" ||
    m.actionType === "compliance_sweep"
  );

  if (bulkOperations.length >= 2) {
    const mostCommon = findMostCommonActionType(bulkOperations);
    
    suggestions.push({
      type: "workflow_automation",
      confidence: Math.min(bulkOperations.length / 3, 1),
      pattern: `You've performed ${bulkOperations.length} bulk operations`,
      suggestion: `Would you like to automate ${mostCommon.type} as a recurring workflow?`,
      automationPreview: {
        name: `Automated ${mostCommon.type.replace("_", " ")}`,
        description: `Automatically performs ${mostCommon.type} on a schedule`,
        trigger: "Scheduled or event-based",
        actions: [
          "Identify affected employees",
          "Apply changes with audit trail",
          "Send summary notification"
        ],
      },
      benefitEstimate: "Reduces manual work by 80%",
      priority: "medium",
    });
  }

  // Pattern 3: Repeated queries about same employees → Notification Rule
  const employeeMentions = extractEmployeeMentions(conversationHistory);
  const frequentEmployees = Object.entries(employeeMentions)
    .filter(([_, count]) => count >= 3)
    .map(([employee, count]) => ({ employee, count }));

  if (frequentEmployees.length > 0) {
    const top = frequentEmployees[0];
    
    suggestions.push({
      type: "notification_rule",
      confidence: Math.min(top.count / 4, 1),
      pattern: `You've queried about ${top.employee} ${top.count} times`,
      suggestion: `Want me to notify you automatically when ${top.employee}'s status changes?`,
      automationPreview: {
        name: `Status Updates for ${top.employee}`,
        description: `Automatic notifications for important changes`,
        trigger: "When employee data changes",
        actions: [
          "Detect status changes",
          "Send instant notification",
          "Include change summary"
        ],
      },
      benefitEstimate: "Stay informed without checking manually",
      priority: "low",
    });
  }

  // Pattern 4: AI-powered intelligent suggestions
  if (conversationHistory.length >= 10) {
    const aiSuggestions = await generateAIAutomationSuggestions(
      conversationHistory.slice(-20), // Last 20 messages
      companyId
    );
    suggestions.push(...aiSuggestions);
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function extractQueryType(query: string): string {
  if (query.includes("leave") || query.includes("holiday")) return "Leave";
  if (query.includes("survey")) return "Survey";
  if (query.includes("performance") || query.includes("objective")) return "Performance";
  if (query.includes("compliance") || query.includes("check")) return "Compliance";
  if (query.includes("action item")) return "Action Items";
  return "Data";
}

function findMostCommonActionType(messages: Message[]): { type: string; count: number } {
  const counts = new Map<string, number>();
  
  messages.forEach(m => {
    if (m.actionType) {
      counts.set(m.actionType, (counts.get(m.actionType) || 0) + 1);
    }
  });

  let max = { type: "bulk_update", count: 0 };
  counts.forEach((count, type) => {
    if (count > max.count) {
      max = { type, count };
    }
  });

  return max;
}

function extractEmployeeMentions(history: Message[]): Record<string, number> {
  const mentions: Record<string, number> = {};
  
  // Simple name pattern matching (First Last or just First)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  
  history.forEach(msg => {
    if (msg.role === "user") {
      const matches = msg.content.match(namePattern);
      if (matches) {
        matches.forEach(name => {
          if (name.length > 3) { // Filter out short words
            mentions[name] = (mentions[name] || 0) + 1;
          }
        });
      }
    }
  });

  return mentions;
}

/**
 * Use AI to generate intelligent automation suggestions
 */
async function generateAIAutomationSuggestions(
  recentHistory: Message[],
  companyId: string
): Promise<AutomationSuggestion[]> {
  try {
    const historyText = recentHistory
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are an HR automation expert. Analyze conversation history and suggest automation opportunities.

Look for:
1. Repetitive data queries → Scheduled reports
2. Manual bulk operations → Workflows
3. Regular compliance checks → Automated audits
4. Frequent status checks → Notification rules

For each suggestion, provide:
- type (scheduled_report, workflow_automation, bulk_operation, or notification_rule)
- pattern (what you noticed)
- suggestion (friendly recommendation)
- automationPreview (name, description, trigger, actions)
- benefitEstimate (time/effort saved)
- priority (high, medium, low)

Respond with JSON array of suggestions (max 2).`,
        },
        {
          role: "user",
          content: `Analyze this conversation and suggest automations:\n\n${historyText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}');
    
    return (result.suggestions || []).map((s: any) => ({
      ...s,
      confidence: 0.7, // AI suggestions have moderate confidence
    }));
  } catch (error) {
    console.error("[AI Automation Suggester Error]", error);
    return [];
  }
}

/**
 * Format automation suggestion for display
 */
export function formatAutomationSuggestion(suggestion: AutomationSuggestion): string {
  const priorityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
  };

  let output = `### 🤖 Automation Opportunity ${priorityEmoji[suggestion.priority]}\n\n`;
  output += `**Pattern Detected**: ${suggestion.pattern}\n\n`;
  output += `${suggestion.suggestion}\n\n`;
  
  output += `**Automation Preview**:\n`;
  output += `- **Name**: ${suggestion.automationPreview.name}\n`;
  output += `- **Description**: ${suggestion.automationPreview.description}\n`;
  output += `- **Trigger**: ${suggestion.automationPreview.trigger}\n`;
  
  if (suggestion.automationPreview.schedule) {
    output += `- **Schedule**: ${suggestion.automationPreview.schedule}\n`;
  }
  
  output += `\n**Actions**:\n`;
  suggestion.automationPreview.actions.forEach((action, i) => {
    output += `${i + 1}. ${action}\n`;
  });
  
  output += `\n**Benefit**: ${suggestion.benefitEstimate}\n`;
  output += `\nWant me to set this up for you?\n`;

  return output;
}
