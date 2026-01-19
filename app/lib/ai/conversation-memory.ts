/**
 * Conversation Memory System
 * Maintains context across multi-turn AI conversations
 * Enhanced Phase 2: Unlimited context with AI summarization
 */

import { openai, AI_CONFIG } from "./openai-client";

interface ConversationContext {
  userId: string;
  companyId: string;
  messages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>;
  entities: {
    employees?: Array<{ id: string; name: string }>;
    departments?: string[];
    dates?: string[];
    pendingAction?: {
      type: string;
      step: number;
      data: any;
    };
    lastGeneratedWorkflow?: any;
    lastGeneratedForm?: any;
    pendingFiles?: File[];
    userPreferences?: {
      distinctDepartments?: boolean | string[];
      preferredFormat?: string;
      [key: string]: any;
    };
  };
  lastActivity: Date;
  // NEW: Phase 2 enhancements
  summary?: ConversationSummary;
  entityGraph?: EntityGraph;
}

// NEW: Phase 2 types
export interface ConversationSummary {
  keyPoints: string[];
  decisionsMade: string[];
  actionsTaken: string[];
  pendingItems: string[];
  topics: string[];
  generatedAt: Date;
  messageRange: { from: number; to: number };
}

export interface EntityGraph {
  employees: Map<string, EmployeeNode>;
  departments: Map<string, DepartmentNode>;
  relationships: Relationship[];
}

interface EmployeeNode {
  id: string;
  name: string;
  mentionCount: number;
  contexts: string[];
  relatedDepartment?: string;
}

interface DepartmentNode {
  name: string;
  mentionCount: number;
  relatedEmployees: string[];
  contexts: string[];
}

interface Relationship {
  from: string;
  to: string;
  type: 'manages' | 'works_in' | 'related_to';
  confidence: number;
}

export interface RelevantContext {
  recentMessages: Array<{ role: string; content: string }>;
  relevantSummary?: ConversationSummary;
  relatedEntities: string[];
  topicMatches: string[];
}

export interface ResolvedQuery {
  originalQuery: string;
  resolvedQuery: string;
  resolvedEntities: Map<string, string>; // "them" -> "engineering team"
  confidence: number;
}

function extractEntitiesFromAssistantMessage(content: string, conv: ConversationContext) {
  const employeeMentions = content.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g);

  if (!employeeMentions) {
    return;
  }

  const employees = conv.entities.employees || [];

  for (const name of employeeMentions) {
    const alreadyTracked = employees.some((emp) => emp.name.toLowerCase() === name.toLowerCase());
    if (!alreadyTracked) {
      employees.push({ id: name.toLowerCase().replace(/\s+/g, "-"), name });
    }
  }

  // Keep only last 5 mentioned employees to avoid bloat
  conv.entities.employees = employees.slice(-5);
}

// In-memory store (use Redis in production)
const conversations = new Map<string, ConversationContext>();

export function getConversation(userId: string, companyId: string): ConversationContext {
  const key = `${userId}-${companyId}`;
  if (!conversations.has(key)) {
    conversations.set(key, {
      userId,
      companyId,
      messages: [],
      entities: {},
      lastActivity: new Date(),
    });
  }
  return conversations.get(key)!;
}

export function updateConversation(
  userId: string,
  companyId: string,
  update: Partial<ConversationContext>
) {
  const key = `${userId}-${companyId}`;
  const current = getConversation(userId, companyId);
  conversations.set(key, {
    ...current,
    ...update,
    lastActivity: new Date(),
  });
}

export function addMessage(
  userId: string,
  companyId: string,
  role: "user" | "assistant",
  content: string
) {
  const conv = getConversation(userId, companyId);
  conv.messages.push({ role, content, timestamp: new Date() });
  
  // Extract entities from user messages for better context
  if (role === "user") {
    extractEntitiesFromMessage(content, conv);
  } else if (role === "assistant") {
    extractEntitiesFromAssistantMessage(content, conv);
  }
  
  // Keep only last 20 messages to save memory
  if (conv.messages.length > 20) {
    conv.messages = conv.messages.slice(-20);
  }
  
  updateConversation(userId, companyId, { messages: conv.messages });
}

// Extract department/team names from messages for context
function extractEntitiesFromMessage(content: string, conv: ConversationContext) {
  const lower = content.toLowerCase();
  
  // Extract department mentions - more aggressive patterns
  const deptPatterns = [
    /(?:the\s+)?(\w+)\s+(?:team|department|dept)/gi,
    /(?:in|for|from|of)\s+(?:the\s+)?(\w+)(?:\s+team|\s+department)?/gi,
    /(?:are|is)\s+in\s+(\w+)/gi,
    /(\w+)(?:\s+team|\s+department)\b/gi,
  ];
  
  const departments = conv.entities.departments || [];
  deptPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const dept = match[1];
      // Filter out common words that aren't departments
      const ignoreWords = ['how', 'many', 'people', 'are', 'is', 'the', 'a', 'an', 'there', 'what', 'who', 'when', 'where', 'why'];
      if (dept && !ignoreWords.includes(dept.toLowerCase()) && !departments.includes(dept.toLowerCase())) {
        console.log('[Conversation Memory] Extracted department:', dept);
        departments.push(dept.toLowerCase());
      }
    }
  });
  
  // Keep only last 3 mentioned departments
  if (departments.length > 0) {
    conv.entities.departments = departments.slice(-3);
    console.log('[Conversation Memory] Stored departments:', departments);
  }
}

export function setEntityContext(
  userId: string,
  companyId: string,
  entities: ConversationContext["entities"]
) {
  const conv = getConversation(userId, companyId);
  updateConversation(userId, companyId, {
    entities: { ...conv.entities, ...entities },
  });
}

export function setPendingAction(
  userId: string,
  companyId: string,
  action: ConversationContext["entities"]["pendingAction"]
) {
  const conv = getConversation(userId, companyId);
  updateConversation(userId, companyId, {
    entities: { ...conv.entities, pendingAction: action },
  });
}

export function clearPendingAction(userId: string, companyId: string) {
  const conv = getConversation(userId, companyId);
  const entities = { ...conv.entities };
  delete entities.pendingAction;
  updateConversation(userId, companyId, { entities });
}

export function clearConversation(userId: string, companyId: string) {
  const key = `${userId}-${companyId}`;
  conversations.delete(key);
}

// Cleanup old conversations (run periodically)
export function cleanupOldConversations(maxAgeHours: number = 24) {
  const now = new Date();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  
  for (const [key, conv] of conversations.entries()) {
    if (now.getTime() - conv.lastActivity.getTime() > maxAge) {
      conversations.delete(key);
    }
  }
}

// Build context string for AI
export function buildContextString(conv: ConversationContext): string {
  let context = "";
  
  // NEW: Include summary if available
  if (conv.summary && conv.messages.length > 20) {
    context += `\n📝 CONVERSATION SUMMARY:`;
    context += `\nKey Points: ${conv.summary.keyPoints.slice(0, 3).join('; ')}`;
    if (conv.summary.decisionsMade.length > 0) {
      context += `\nDecisions: ${conv.summary.decisionsMade.slice(0, 2).join('; ')}`;
    }
    if (conv.summary.pendingItems.length > 0) {
      context += `\nPending: ${conv.summary.pendingItems.join('; ')}`;
    }
  }
  
  if (conv.entities.employees && conv.entities.employees.length > 0) {
    context += `\nRecently mentioned employees: ${conv.entities.employees.map(e => e.name).join(", ")}`;
  }
  
  if (conv.entities.departments && conv.entities.departments.length > 0) {
    context += `\nCURRENT DEPARTMENT FILTER: ${conv.entities.departments[conv.entities.departments.length - 1]}`;
    context += `\nAll mentioned departments: ${conv.entities.departments.join(", ")}`;
  }
  
  if (conv.entities.pendingAction) {
    const action = conv.entities.pendingAction;
    context += `\n\nPending action: ${action.type} (step ${action.step})`;
    context += `\nAction data: ${JSON.stringify(action.data)}`;
  }
  
  if (conv.messages.length > 0) {
    context += `\n\nRecent conversation:`;
    conv.messages.slice(-5).forEach(msg => {
      context += `\n${msg.role}: ${msg.content.slice(0, 150)}${msg.content.length > 150 ? '...' : ''}`;
    });
  }
  
  console.log('[Conversation Context Built]:', context);
  return context;
}

// ==================== PHASE 2: ENHANCED CONVERSATION MEMORY ====================

/**
 * Summarize long conversations using AI
 * Automatically triggered when conversation exceeds 20 messages
 */
export async function summarizeConversation(
  userId: string,
  companyId: string
): Promise<ConversationSummary> {
  const conv = getConversation(userId, companyId);
  
  if (conv.messages.length <= 20) {
    // No need to summarize short conversations
    return {
      keyPoints: [],
      decisionsMade: [],
      actionsTaken: [],
      pendingItems: [],
      topics: [],
      generatedAt: new Date(),
      messageRange: { from: 0, to: conv.messages.length }
    };
  }

  console.log('[Enhanced Memory] Summarizing conversation with', conv.messages.length, 'messages');

  const conversationText = conv.messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  const prompt = `Summarize this HR AI conversation into key points:

${conversationText}

Extract:
1. KEY POINTS: Main topics discussed (3-5 points)
2. DECISIONS MADE: Any decisions or confirmations (list)
3. ACTIONS TAKEN: What was actually done (list)
4. PENDING ITEMS: What's still in progress (list)
5. TOPICS: Main subject areas covered

Format as JSON with these keys: keyPoints, decisionsMade, actionsTaken, pendingItems, topics
Keep it concise - each point should be 1 sentence max.`;

  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'You are a conversation summarizer. Extract key information concisely and accurately.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = completion.choices[0].message.content || '{}';
    
    // Try to parse as JSON, fallback to manual extraction
    try {
      const parsed = JSON.parse(response);
      const summary: ConversationSummary = {
        keyPoints: parsed.keyPoints || [],
        decisionsMade: parsed.decisionsMade || [],
        actionsTaken: parsed.actionsTaken || [],
        pendingItems: parsed.pendingItems || [],
        topics: parsed.topics || [],
        generatedAt: new Date(),
        messageRange: { from: 0, to: conv.messages.length }
      };

      // Store summary in conversation
      conv.summary = summary;
      updateConversation(userId, companyId, { summary });

      return summary;
    } catch (parseError) {
      console.error('[Enhanced Memory] Failed to parse summary JSON:', parseError);
      // Return basic summary
      return {
        keyPoints: ['Conversation about HR topics'],
        decisionsMade: [],
        actionsTaken: [],
        pendingItems: [],
        topics: ['general'],
        generatedAt: new Date(),
        messageRange: { from: 0, to: conv.messages.length }
      };
    }
  } catch (error) {
    console.error('[Enhanced Memory] Error summarizing conversation:', error);
    throw error;
  }
}

/**
 * Get relevant context for current query using semantic search
 */
export async function getRelevantContext(
  userId: string,
  companyId: string,
  currentQuery: string
): Promise<RelevantContext> {
  const conv = getConversation(userId, companyId);

  // Always include recent messages
  const recentMessages = conv.messages.slice(-5).map(m => ({
    role: m.role,
    content: m.content
  }));

  // If we have a summary, check if it's relevant to current query
  const relevantSummary = conv.summary && 
    conv.summary.topics.some(topic => 
      currentQuery.toLowerCase().includes(topic.toLowerCase())
    ) ? conv.summary : undefined;

  // Extract entities from current query
  const relatedEntities: string[] = [];
  if (conv.entities.employees) {
    conv.entities.employees.forEach(emp => {
      if (currentQuery.toLowerCase().includes(emp.name.toLowerCase())) {
        relatedEntities.push(emp.name);
      }
    });
  }

  // Find topic matches
  const topicMatches: string[] = [];
  if (conv.summary) {
    conv.summary.topics.forEach(topic => {
      if (currentQuery.toLowerCase().includes(topic.toLowerCase())) {
        topicMatches.push(topic);
      }
    });
  }

  return {
    recentMessages,
    relevantSummary,
    relatedEntities,
    topicMatches
  };
}

/**
 * Build entity relationship graph from conversation
 */
export function buildEntityGraph(conversation: ConversationContext['messages']): EntityGraph {
  const employees = new Map<string, EmployeeNode>();
  const departments = new Map<string, DepartmentNode>();
  const relationships: Relationship[] = [];

  conversation.forEach(msg => {
    // Extract employee names (capitalized full names)
    const employeeMatches = msg.content.matchAll(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g);
    for (const match of employeeMatches) {
      const name = match[1];
      const existing = employees.get(name) || {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        mentionCount: 0,
        contexts: []
      };
      existing.mentionCount++;
      existing.contexts.push(msg.content.slice(0, 100));
      employees.set(name, existing);
    }

    // Extract department names
    const deptMatches = msg.content.matchAll(/(?:in|for|from)\s+(?:the\s+)?(\w+)\s+(?:team|department)/gi);
    for (const match of deptMatches) {
      const deptName = match[1].toLowerCase();
      const existing = departments.get(deptName) || {
        name: deptName,
        mentionCount: 0,
        relatedEmployees: [],
        contexts: []
      };
      existing.mentionCount++;
      existing.contexts.push(msg.content.slice(0, 100));
      departments.set(deptName, existing);
    }
  });

  return { employees, departments, relationships };
}

/**
 * Resolve references like "them", "that person", "like last time"
 */
export async function resolveReferences(
  query: string,
  userId: string,
  companyId: string
): Promise<ResolvedQuery> {
  const conv = getConversation(userId, companyId);
  
  // Check for common reference words
  const hasReferences = /\b(them|they|that person|those people|he|she|it|this|that|earlier|before|last time)\b/i.test(query);
  
  if (!hasReferences) {
    return {
      originalQuery: query,
      resolvedQuery: query,
      resolvedEntities: new Map(),
      confidence: 1.0
    };
  }

  console.log('[Enhanced Memory] Resolving references in:', query);

  const recentContext = conv.messages.slice(-10)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const entityContext = `
Recently mentioned:
- Employees: ${conv.entities.employees?.map(e => e.name).join(', ') || 'none'}
- Departments: ${conv.entities.departments?.join(', ') || 'none'}
  `.trim();

  const prompt = `Resolve pronouns and references in this query based on conversation context:

QUERY: "${query}"

RECENT CONVERSATION:
${recentContext}

ENTITIES:
${entityContext}

Replace references like "them", "that person", "those people" with actual names/entities.
Return the resolved query as plain text.

Example:
Input: "Email them about the meeting"
Context shows "sales team" was just discussed
Output: "Email sales team about the meeting"

RESOLVED QUERY:`;

  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.2,
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: 'You resolve pronoun references in queries. Return only the resolved query, nothing else.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const resolvedQuery = completion.choices[0].message.content?.trim() || query;
    
    // Build map of what was resolved
    const resolvedEntities = new Map<string, string>();
    if (resolvedQuery !== query) {
      // Detect what changed
      if (conv.entities.departments && conv.entities.departments.length > 0) {
        const dept = conv.entities.departments[conv.entities.departments.length - 1];
        if (resolvedQuery.toLowerCase().includes(dept)) {
          resolvedEntities.set('them', dept);
        }
      }
    }

    return {
      originalQuery: query,
      resolvedQuery,
      resolvedEntities,
      confidence: resolvedQuery !== query ? 0.8 : 1.0
    };
  } catch (error) {
    console.error('[Enhanced Memory] Error resolving references:', error);
    return {
      originalQuery: query,
      resolvedQuery: query,
      resolvedEntities: new Map(),
      confidence: 0.5
    };
  }
}

