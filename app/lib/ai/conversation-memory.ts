/**
 * Conversation Memory System
 * Maintains context across multi-turn AI conversations
 */

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
  };
  lastActivity: Date;
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
  
  // Extract department mentions
  const deptPatterns = [
    /(?:the\s+)?(\w+)\s+(?:team|department|dept)/gi,
    /(?:in|for|from)\s+(\w+)(?:\s+team|\s+department)?/gi,
  ];
  
  const departments = conv.entities.departments || [];
  deptPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const dept = match[1];
      if (dept && !departments.includes(dept.toLowerCase())) {
        departments.push(dept.toLowerCase());
      }
    }
  });
  
  // Keep only last 3 mentioned departments
  if (departments.length > 0) {
    conv.entities.departments = departments.slice(-3);
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
  
  if (conv.entities.employees && conv.entities.employees.length > 0) {
    context += `\nRecently mentioned employees: ${conv.entities.employees.map(e => e.name).join(", ")}`;
  }
  
  if (conv.entities.departments && conv.entities.departments.length > 0) {
    context += `\nRecently mentioned departments/teams: ${conv.entities.departments.join(", ")}`;
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
  
  return context;
}

