/**
 * User Personalization Engine
 * Learns individual user preferences and adapts AI responses accordingly
 * Phase 2 Enhancement - Makes AI truly personalized for each user
 */

import { openai, AI_CONFIG } from "./openai-client";

// ==================== TYPES ====================

export interface UserProfile {
  userId: string;
  companyId: string;
  preferences: {
    communicationStyle: 'detailed' | 'concise' | 'technical';
    favoriteFeatures: string[];
    commonWorkflows: WorkflowPattern[];
    departmentFocus: string[];
    preferredResponseFormat: 'bullets' | 'paragraphs' | 'mixed';
  };
  learnings: {
    successfulActions: Action[];
    preferredPhrasing: Map<string, string>;
    shortcuts: ShortcutPattern[];
    frequentQueries: QueryPattern[];
  };
  interactionStats: {
    totalInteractions: number;
    successfulInteractions: number;
    feedbackPositive: number;
    feedbackNegative: number;
    lastUpdated: Date;
  };
}

export interface WorkflowPattern {
  type: string;
  frequency: number;
  lastUsed: Date;
  avgTimeToComplete: number;
  successRate: number;
}

export interface Action {
  type: string;
  parameters: any;
  outcome: 'positive' | 'negative';
  timestamp: Date;
  feedbackGiven: boolean;
}

export interface ShortcutPattern {
  trigger: string;
  action: string;
  description: string;
  timeSaved: number; // seconds
  useCount: number;
}

export interface QueryPattern {
  query: string;
  category: string;
  frequency: number;
  lastAsked: Date;
}

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  timeSaved: string;
  relevanceScore: number;
}

export interface UserPattern {
  type: 'workflow' | 'query' | 'timeOfDay' | 'feature_usage';
  description: string;
  frequency: number;
  confidence: number;
  suggestion: string;
}

// ==================== IN-MEMORY USER PROFILES ====================

const userProfiles = new Map<string, UserProfile>();

function getUserProfileKey(userId: string, companyId: string): string {
  return `${userId}-${companyId}`;
}

function getOrCreateProfile(userId: string, companyId: string): UserProfile {
  const key = getUserProfileKey(userId, companyId);
  
  if (!userProfiles.has(key)) {
    userProfiles.set(key, {
      userId,
      companyId,
      preferences: {
        communicationStyle: 'mixed',
        favoriteFeatures: [],
        commonWorkflows: [],
        departmentFocus: [],
        preferredResponseFormat: 'mixed'
      },
      learnings: {
        successfulActions: [],
        preferredPhrasing: new Map(),
        shortcuts: [],
        frequentQueries: []
      },
      interactionStats: {
        totalInteractions: 0,
        successfulInteractions: 0,
        feedbackPositive: 0,
        feedbackNegative: 0,
        lastUpdated: new Date()
      }
    });
  }

  return userProfiles.get(key)!;
}

// ==================== PERSONALIZATION ENGINE ====================

export class PersonalizationEngine {
  /**
   * Learn from user interactions
   */
  async learnFromInteraction(
    userId: string,
    companyId: string,
    action: Action,
    feedback: 'positive' | 'negative'
  ): Promise<void> {
    console.log('[Personalization Engine] Learning from interaction:', action.type, feedback);

    const profile = getOrCreateProfile(userId, companyId);

    // Record the action
    action.outcome = feedback;
    action.feedbackGiven = true;
    profile.learnings.successfulActions.push(action);

    // Keep only last 50 actions to prevent memory bloat
    if (profile.learnings.successfulActions.length > 50) {
      profile.learnings.successfulActions = profile.learnings.successfulActions.slice(-50);
    }

    // Update interaction stats
    profile.interactionStats.totalInteractions++;
    if (feedback === 'positive') {
      profile.interactionStats.successfulInteractions++;
      profile.interactionStats.feedbackPositive++;
    } else {
      profile.interactionStats.feedbackNegative++;
    }
    profile.interactionStats.lastUpdated = new Date();

    // Learn feature preferences
    if (feedback === 'positive' && !profile.preferences.favoriteFeatures.includes(action.type)) {
      profile.preferences.favoriteFeatures.push(action.type);
    }

    // Learn workflow patterns
    this.updateWorkflowPatterns(profile, action, feedback);
  }

  /**
   * Adapt response to user's preferred style
   */
  async adaptResponse(
    response: string,
    userId: string,
    companyId: string
  ): Promise<string> {
    const profile = getOrCreateProfile(userId, companyId);

    // If new user, return as-is
    if (profile.interactionStats.totalInteractions < 5) {
      return response;
    }

    console.log('[Personalization Engine] Adapting response to user style:', profile.preferences.communicationStyle);

    const prompt = `Adapt this AI assistant response to the user's preferred communication style:

ORIGINAL RESPONSE:
${response}

USER PREFERENCES:
- Communication Style: ${profile.preferences.communicationStyle}
- Preferred Format: ${profile.preferences.preferredResponseFormat}
- Favorite Features: ${profile.preferences.favoriteFeatures.slice(0, 3).join(', ')}

ADAPTATION RULES:
- concise: Make it brief, remove fluff, get to the point
- detailed: Keep explanations thorough, add context and examples
- technical: Use precise terminology, include technical details
- bullets: Format as bullet points where possible
- paragraphs: Use flowing paragraph format
- mixed: Balance bullets and paragraphs

Return ONLY the adapted response, nothing else.`;

    try {
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        temperature: 0.4,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: 'You adapt AI responses to match user communication preferences while preserving all information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return completion.choices[0].message.content?.trim() || response;
    } catch (error) {
      console.error('[Personalization Engine] Error adapting response:', error);
      return response; // Fallback to original
    }
  }

  /**
   * Suggest personalized shortcuts based on patterns
   */
  async suggestShortcuts(userId: string, companyId: string): Promise<Shortcut[]> {
    const profile = getOrCreateProfile(userId, companyId);

    // Need at least 10 interactions to suggest shortcuts
    if (profile.interactionStats.totalInteractions < 10) {
      return [];
    }

    console.log('[Personalization Engine] Suggesting shortcuts for user');

    // Analyze workflow patterns
    const frequentWorkflows = profile.preferences.commonWorkflows
      .filter(w => w.frequency > 3)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const shortcuts: Shortcut[] = [];

    // Generate shortcuts for frequent workflows
    for (const workflow of frequentWorkflows) {
      shortcuts.push({
        id: `shortcut-${workflow.type}-${Date.now()}`,
        name: `Quick ${workflow.type}`,
        description: `You use this ${workflow.frequency} times. Save time with a shortcut.`,
        trigger: `/${workflow.type.toLowerCase().replace(/[_\s]+/g, '-')}`,
        action: workflow.type,
        timeSaved: `~${Math.round(workflow.avgTimeToComplete * 0.5)} seconds`,
        relevanceScore: workflow.frequency / profile.interactionStats.totalInteractions
      });
    }

    // Add shortcuts for department focus
    if (profile.preferences.departmentFocus.length > 0) {
      const topDepartment = profile.preferences.departmentFocus[0];
      shortcuts.push({
        id: `shortcut-dept-${topDepartment}`,
        name: `${topDepartment} Quick View`,
        description: `You frequently work with ${topDepartment}. Quick access to their data.`,
        trigger: `/${topDepartment.toLowerCase()}`,
        action: `query_data`,
        timeSaved: '~10 seconds',
        relevanceScore: 0.8
      });
    }

    return shortcuts;
  }

  /**
   * Detect user patterns in behavior
   */
  detectPatterns(userId: string, companyId: string): UserPattern[] {
    const profile = getOrCreateProfile(userId, companyId);
    const patterns: UserPattern[] = [];

    // Need meaningful data
    if (profile.interactionStats.totalInteractions < 10) {
      return [];
    }

    console.log('[Personalization Engine] Detecting patterns');

    // Pattern 1: Workflow preference
    const topWorkflows = profile.preferences.commonWorkflows
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (topWorkflows.length > 0 && topWorkflows[0].frequency > 5) {
      patterns.push({
        type: 'workflow',
        description: `You frequently use ${topWorkflows[0].type} workflows`,
        frequency: topWorkflows[0].frequency,
        confidence: Math.min(topWorkflows[0].frequency / profile.interactionStats.totalInteractions, 0.95),
        suggestion: `Consider automating this workflow or creating a template`
      });
    }

    // Pattern 2: Department focus
    if (profile.preferences.departmentFocus.length > 0) {
      patterns.push({
        type: 'query',
        description: `You primarily work with ${profile.preferences.departmentFocus[0]} department`,
        frequency: profile.preferences.departmentFocus.length,
        confidence: 0.8,
        suggestion: `Set ${profile.preferences.departmentFocus[0]} as default filter for faster access`
      });
    }

    // Pattern 3: Feature usage
    if (profile.preferences.favoriteFeatures.length > 0) {
      const topFeature = profile.preferences.favoriteFeatures[0];
      patterns.push({
        type: 'feature_usage',
        description: `Your most-used feature: ${topFeature}`,
        frequency: profile.learnings.successfulActions.filter(a => a.type === topFeature).length,
        confidence: 0.85,
        suggestion: `Pin ${topFeature} to your quick access toolbar`
      });
    }

    // Pattern 4: Success rate analysis
    const successRate = profile.interactionStats.successfulInteractions / profile.interactionStats.totalInteractions;
    if (successRate < 0.7) {
      patterns.push({
        type: 'workflow',
        description: 'Some queries aren\'t getting good results',
        frequency: profile.interactionStats.feedbackNegative,
        confidence: 0.75,
        suggestion: 'Try being more specific in your requests, or use suggested examples'
      });
    }

    return patterns;
  }

  /**
   * Update communication style preference based on interaction
   */
  updateCommunicationStyle(
    userId: string,
    companyId: string,
    userMessage: string,
    feedback: 'positive' | 'negative'
  ): void {
    const profile = getOrCreateProfile(userId, companyId);

    // Infer style from message characteristics
    if (feedback === 'positive') {
      const wordCount = userMessage.split(/\s+/).length;
      
      if (wordCount < 5) {
        // User prefers concise
        profile.preferences.communicationStyle = 'concise';
      } else if (wordCount > 20) {
        // User provides detailed context
        profile.preferences.communicationStyle = 'detailed';
      }

      // Check for technical language
      const technicalTerms = ['api', 'database', 'schema', 'query', 'workflow', 'automation', 'integration'];
      const hasTechnicalTerms = technicalTerms.some(term => 
        userMessage.toLowerCase().includes(term)
      );
      
      if (hasTechnicalTerms) {
        profile.preferences.communicationStyle = 'technical';
      }
    }
  }

  /**
   * Get user profile for inspection/debugging
   */
  getProfile(userId: string, companyId: string): UserProfile {
    return getOrCreateProfile(userId, companyId);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private updateWorkflowPatterns(
    profile: UserProfile,
    action: Action,
    feedback: 'positive' | 'negative'
  ): void {
    const existingPattern = profile.preferences.commonWorkflows.find(
      w => w.type === action.type
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = new Date();
      if (feedback === 'positive') {
        // Update success rate
        const totalUses = existingPattern.frequency;
        const prevSuccesses = Math.round(existingPattern.successRate * (totalUses - 1));
        existingPattern.successRate = (prevSuccesses + 1) / totalUses;
      }
    } else {
      profile.preferences.commonWorkflows.push({
        type: action.type,
        frequency: 1,
        lastUsed: new Date(),
        avgTimeToComplete: 30, // Default estimate in seconds
        successRate: feedback === 'positive' ? 1.0 : 0.0
      });
    }

    // Keep only top 20 workflows
    if (profile.preferences.commonWorkflows.length > 20) {
      profile.preferences.commonWorkflows = profile.preferences.commonWorkflows
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);
    }
  }
}

// Export singleton instance
export const personalizationEngine = new PersonalizationEngine();
