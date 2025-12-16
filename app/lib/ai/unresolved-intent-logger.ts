/**
 * Unresolved Intent Logger
 * Captures user requests the AI couldn't handle for product team analysis
 */

import { prisma } from "@/lib/prisma";

export interface UnresolvedIntentData {
  userId: string;
  companyId: string;
  userMessage: string;
  classifiedIntent: any;
  confidence: number;
  context: string;
  relatedModules: string[];
  timestamp: Date;
}

/**
 * Detect which modules are likely related to the user's request
 */
export function detectRelatedModules(userMessage: string): string[] {
  const modules: string[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Module keyword mapping
  const moduleKeywords = {
    surveys: ["survey", "feedback", "pulse", "enps", "questionnaire", "poll"],
    performance: ["objective", "okr", "goal", "1-2-1", "one-to-one", "review", "appraisal", "performance"],
    leave: ["leave", "holiday", "vacation", "time off", "pto", "absence"],
    workflows: ["workflow", "automation", "trigger", "automate", "schedule"],
    documents: ["document", "policy", "contract", "handbook", "sign", "acknowledge"],
    employees: ["employee", "staff", "people", "headcount", "hire", "onboard"],
    payroll: ["salary", "payroll", "pay", "compensation", "bonus", "wage"],
    compliance: ["compliance", "audit", "check", "verify", "validate", "ird", "tax"],
    analytics: ["report", "analytics", "metrics", "dashboard", "stats", "data"],
    journeys: ["journey", "experience", "onboarding", "offboarding"],
    actionItems: ["action item", "task", "todo", "pending", "overdue"],
  };

  Object.entries(moduleKeywords).forEach(([module, keywords]) => {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      modules.push(module);
    }
  });

  // Default to general if no modules detected
  if (modules.length === 0) {
    modules.push("general");
  }

  return modules;
}

/**
 * Log an unresolved intent for developer review
 * Note: Requires AIIntentLog model in Prisma schema
 */
export async function logUnresolvedIntent(data: UnresolvedIntentData): Promise<void> {
  try {
    // For now, log to console and a simple table if it exists
    // TODO: Create AIIntentLog model in schema
    
    console.log("[Unresolved Intent]", {
      user: data.userId,
      company: data.companyId,
      message: data.userMessage,
      intent: data.classifiedIntent?.actionType || "unknown",
      confidence: data.confidence,
      modules: data.relatedModules,
      timestamp: data.timestamp,
    });

    // Attempt to log to database if table exists
    try {
      await prisma.$executeRaw`
        INSERT INTO "AIIntentLog" (
          "id",
          "userId",
          "companyId",
          "userMessage",
          "classifiedIntent",
          "confidence",
          "context",
          "relatedModules",
          "resolved",
          "createdAt"
        ) VALUES (
          gen_random_uuid(),
          ${data.userId}::uuid,
          ${data.companyId}::uuid,
          ${data.userMessage},
          ${JSON.stringify(data.classifiedIntent)}::jsonb,
          ${data.confidence},
          ${data.context},
          ${data.relatedModules}::text[],
          false,
          ${data.timestamp}
        )
      `.catch(() => {
        // Table doesn't exist yet, silently fail
        console.log("[Intent Logger] AIIntentLog table not found, skipping database log");
      });
    } catch (dbError) {
      // Silently fail if table doesn't exist
    }

    // Also log to a file-based system for immediate access
    await logToFile(data);
  } catch (error) {
    console.error("[Intent Logger Error]", error);
    // Don't throw - logging should never break the user experience
  }
}

/**
 * Log to a local file for immediate developer access
 */
async function logToFile(data: UnresolvedIntentData): Promise<void> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    
    const logDir = path.join(process.cwd(), "logs", "ai-intents");
    const logFile = path.join(logDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    
    // Create directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });
    
    // Append log entry
    const logEntry = JSON.stringify({
      ...data,
      timestamp: data.timestamp.toISOString(),
    }) + "\n";
    
    await fs.appendFile(logFile, logEntry);
  } catch (error) {
    // Silently fail - file logging is best-effort
  }
}

/**
 * Get unresolved intents for analysis
 */
export async function getUnresolvedIntents(params: {
  companyId?: string;
  module?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<any[]> {
  try {
    // For now, read from file logs
    const fs = await import("fs/promises");
    const path = await import("path");
    
    const logDir = path.join(process.cwd(), "logs", "ai-intents");
    const files = await fs.readdir(logDir).catch(() => []);
    
    const logs: any[] = [];
    
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      
      const content = await fs.readFile(path.join(logDir, file), "utf-8");
      const entries: any[] = [];
      let skippedLines = 0;

      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          entries.push(JSON.parse(trimmed));
        } catch {
          skippedLines++;
        }
      }

      if (skippedLines > 0) {
        console.warn(`[Intent Logger] Skipped ${skippedLines} malformed log line(s) in ${file}`);
      }

      logs.push(...entries);
    }
    
    // Filter logs
    let filtered = logs;
    
    if (params.companyId) {
      filtered = filtered.filter(log => log.companyId === params.companyId);
    }
    
    if (params.module) {
      filtered = filtered.filter(log => log.relatedModules.includes(params.module));
    }
    
    if (params.startDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= params.startDate!);
    }
    
    if (params.endDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= params.endDate!);
    }
    
    // Sort by timestamp desc
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit results
    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }
    
    return filtered;
  } catch (error) {
    console.error("[Get Unresolved Intents Error]", error);
    return [];
  }
}

/**
 * Analyze unresolved intents to identify patterns and gaps
 */
export async function analyzeUnresolvedIntents(params: {
  companyId?: string;
  days?: number;
}): Promise<{
  totalUnresolved: number;
  topModules: Array<{ module: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  lowConfidenceRequests: number;
  recommendations: string[];
}> {
  const days = params.days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const intents = await getUnresolvedIntents({
    companyId: params.companyId,
    startDate,
  });
  
  // Count by module
  const moduleCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  let lowConfidence = 0;
  
  intents.forEach(intent => {
    // Module counts
    intent.relatedModules.forEach((module: string) => {
      moduleCounts[module] = (moduleCounts[module] || 0) + 1;
    });
    
    // Keyword extraction
    const words = intent.userMessage.toLowerCase().split(/\s+/);
    words.forEach((word: string) => {
      if (word.length > 3) {
        keywordCounts[word] = (keywordCounts[word] || 0) + 1;
      }
    });
    
    // Low confidence
    if (intent.confidence < 0.5) {
      lowConfidence++;
    }
  });
  
  // Sort and top N
  const topModules = Object.entries(moduleCounts)
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const topKeywords = Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (topModules.length > 0 && topModules[0].count > 5) {
    recommendations.push(`High demand for ${topModules[0].module} features - consider expanding capabilities`);
  }
  
  if (lowConfidence > intents.length * 0.3) {
    recommendations.push(`${Math.round((lowConfidence / intents.length) * 100)}% of requests have low confidence - review intent classification model`);
  }
  
  if (topKeywords.some(kw => ["automate", "automation", "automatic"].includes(kw.keyword))) {
    recommendations.push("Users frequently request automation - consider proactive automation suggestions");
  }
  
  return {
    totalUnresolved: intents.length,
    topModules,
    topKeywords,
    lowConfidenceRequests: lowConfidence,
    recommendations,
  };
}

/**
 * Prisma Schema Addition (for reference):
 * 
 * model AIIntentLog {
 *   id                String   @id @default(uuid())
 *   userId            String   @db.Uuid
 *   companyId         String   @db.Uuid
 *   userMessage       String
 *   classifiedIntent  Json
 *   confidence        Float
 *   context           String
 *   relatedModules    String[]
 *   resolved          Boolean  @default(false)
 *   createdAt         DateTime @default(now())
 *   resolvedAt        DateTime?
 *   resolution        String?
 *   
 *   User              User     @relation(fields: [userId], references: [id])
 *   Company           Company  @relation(fields: [companyId], references: [id])
 *   
 *   @@index([companyId, createdAt])
 *   @@index([resolved])
 * }
 */
