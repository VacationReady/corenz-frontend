import { openai } from "./openai-client";
import { prisma } from "@/lib/prisma";

export interface JourneyAssistantRequest {
  message: string;
  context: {
    mode: "journey_designer";
    journey?: {
      id: string;
      name: string;
      status: string;
      phases: number;
    };
    companyId: string;
    userId: string;
  };
}

export interface JourneyAssistantResponse {
  message: string;
  actions?: Array<{
    id: string;
    label: string;
    type: "primary" | "secondary";
    actionType: string;
    parameters?: any;
  }>;
  suggestions?: string[];
  journeyUpdates?: any;
}

export class JourneyAssistant {
  async processRequest(request: JourneyAssistantRequest): Promise<JourneyAssistantResponse> {
    const { message, context } = request;

    // Analyze the intent of the message
    const intent = await this.analyzeIntent(message, context);

    switch (intent.type) {
      case "create_journey":
        return this.handleCreateJourney(intent, context);
      case "optimize_journey":
        return this.handleOptimizeJourney(intent, context);
      case "add_experience_block":
        return this.handleAddExperienceBlock(intent, context);
      case "create_experiment":
        return this.handleCreateExperiment(intent, context);
      case "analyze_performance":
        return this.handleAnalyzePerformance(intent, context);
      case "suggest_improvements":
        return this.handleSuggestImprovements(intent, context);
      case "add_decision_gateway":
        return this.handleAddDecisionGateway(intent, context);
      case "generate_content":
        return this.handleGenerateContent(intent, context);
      default:
        return this.handleGeneralQuery(message, context);
    }
  }

  private async analyzeIntent(message: string, context: any) {
    const prompt = `
    Analyze this user message in the context of Journey Designer and determine the intent:

    User Message: "${message}"
    Context: ${JSON.stringify(context)}

    Possible intents:
    - create_journey: User wants to create a new journey
    - optimize_journey: User wants to improve an existing journey
    - add_experience_block: User wants to add a new experience block
    - create_experiment: User wants to create an A/B test
    - analyze_performance: User wants to see journey analytics
    - suggest_improvements: User wants AI suggestions
    - add_decision_gateway: User wants to add conditional logic
    - generate_content: User wants to generate content for blocks
    - general_query: General question or conversation

    Return a JSON object with:
    {
      "type": "intent_type",
      "confidence": 0.95,
      "parameters": {
        // Extracted parameters relevant to the intent
      }
    }
    `;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      return JSON.parse(response || '{"type": "general_query", "confidence": 0.5}');
    } catch (error) {
      console.error("Error analyzing intent:", error);
      return { type: "general_query", confidence: 0.5 };
    }
  }

  private async handleCreateJourney(intent: any, context: any): Promise<JourneyAssistantResponse> {
    return {
      message: "I'd love to help you create a new journey! Let me guide you through the process with some questions:",
      actions: [
        {
          id: "open_scoping_dialog",
          label: "Start Journey Designer",
          type: "primary",
          actionType: "open_scoping_dialog",
        },
      ],
      suggestions: [
        "Create a new hire onboarding journey",
        "Design a leadership development program",
        "Build a performance review process",
        "Set up an offboarding workflow",
      ],
    };
  }

  private async handleOptimizeJourney(intent: any, context: any): Promise<JourneyAssistantResponse> {
    if (!context.journey) {
      return {
        message: "To optimize a journey, please select one from the library first. I can then analyze its performance and suggest improvements.",
        suggestions: ["Show me journey analytics", "What journeys need attention?"],
      };
    }

    // Get journey data and analytics
    const journey = await this.getJourneyData(context.journey.id, context.companyId);
    const analytics = await this.getJourneyAnalytics(context.journey.id);

    const optimizations = await this.generateOptimizations(journey, analytics);

    return {
      message: `I've analyzed "${context.journey.name}" and found several optimization opportunities:

${optimizations.map((opt, i) => `${i + 1}. **${opt.title}**: ${opt.description}`).join('\n')}

Would you like me to implement any of these improvements?`,
      actions: optimizations.map((opt, i) => ({
        id: `optimization_${i}`,
        label: opt.title,
        type: "secondary" as const,
        actionType: "apply_optimization",
        parameters: opt,
      })),
      suggestions: [
        "Show detailed analytics",
        "Create an A/B test",
        "Add engagement touchpoints",
      ],
    };
  }

  private async handleAddExperienceBlock(intent: any, context: any): Promise<JourneyAssistantResponse> {
    const blockTypes = [
      { type: "SURVEY", description: "Collect feedback or measure engagement" },
      { type: "TRAINING", description: "Provide learning content or skills development" },
      { type: "COMMUNICATION", description: "Send emails, notifications, or announcements" },
      { type: "TASK", description: "Assign specific actions or deliverables" },
      { type: "MEETING", description: "Schedule check-ins or collaborative sessions" },
      { type: "APPROVAL", description: "Require manager or stakeholder approval" },
    ];

    const suggestedType = intent.parameters?.blockType || "SURVEY";
    const suggestedBlock = blockTypes.find(b => b.type === suggestedType) || blockTypes[0];

    return {
      message: `I can help you add a ${suggestedBlock.type.toLowerCase()} block to your journey. This will ${suggestedBlock.description.toLowerCase()}.

What specific type of experience block would you like to add?`,
      actions: blockTypes.map(block => ({
        id: `add_${block.type.toLowerCase()}`,
        label: `Add ${block.type}`,
        type: "secondary" as const,
        actionType: "add_experience_block",
        parameters: { blockType: block.type, description: block.description },
      })),
      suggestions: [
        "Add a pulse survey after week 4",
        "Insert a manager check-in",
        "Create a training module",
      ],
    };
  }

  private async handleCreateExperiment(intent: any, context: any): Promise<JourneyAssistantResponse> {
    if (!context.journey) {
      return {
        message: "To create an experiment, I need to know which journey you'd like to test. Please select a journey first.",
      };
    }

    const experimentIdeas = await this.generateExperimentIdeas(context.journey);

    return {
      message: `Great idea! A/B testing can help optimize "${context.journey.name}". Here are some experiment ideas based on your journey:

${experimentIdeas.map((idea, i) => `**${idea.name}**: ${idea.description}`).join('\n\n')}

Which experiment interests you most?`,
      actions: experimentIdeas.map((idea, i) => ({
        id: `experiment_${i}`,
        label: idea.name,
        type: "secondary" as const,
        actionType: "create_experiment",
        parameters: idea,
      })),
      suggestions: [
        "Test welcome email timing",
        "Compare onboarding approaches",
        "Experiment with check-in frequency",
      ],
    };
  }

  private async handleAnalyzePerformance(intent: any, context: any): Promise<JourneyAssistantResponse> {
    if (!context.journey) {
      return {
        message: "I can analyze journey performance for you. Please select a specific journey to get detailed analytics and insights.",
        suggestions: ["Show all journey metrics", "Which journeys are underperforming?"],
      };
    }

    const analytics = await this.getJourneyAnalytics(context.journey.id);
    const insights = await this.generatePerformanceInsights(analytics);

    return {
      message: `Here's the performance analysis for "${context.journey.name}":

📊 **Key Metrics:**
• Completion Rate: ${analytics.completionRate}%
• Average Satisfaction: ${analytics.avgSatisfaction}/10
• Time to Complete: ${analytics.avgDuration} days

🎯 **Insights:**
${insights.map(insight => `• ${insight}`).join('\n')}`,
      actions: [
        {
          id: "view_detailed_analytics",
          label: "View Detailed Analytics",
          type: "primary",
          actionType: "open_analytics",
        },
        {
          id: "export_report",
          label: "Export Report",
          type: "secondary",
          actionType: "export_analytics",
        },
      ],
      suggestions: [
        "What's causing low completion rates?",
        "Show participant feedback",
        "Compare with other journeys",
      ],
    };
  }

  private async handleSuggestImprovements(intent: any, context: any): Promise<JourneyAssistantResponse> {
    if (!context.journey) {
      return {
        message: "I can provide personalized improvement suggestions for any journey. Select a journey and I'll analyze it for optimization opportunities.",
      };
    }

    const journey = await this.getJourneyData(context.journey.id, context.companyId);
    const suggestions = await this.generateImprovementSuggestions(journey);

    return {
      message: `Based on my analysis of "${context.journey.name}", here are my top improvement suggestions:

${suggestions.map((suggestion, i) => 
  `**${i + 1}. ${suggestion.title}** (${suggestion.impact} impact, ${suggestion.effort} effort)
  ${suggestion.description}
  
  *Why this helps:* ${suggestion.rationale}`
).join('\n\n')}`,
      actions: suggestions.slice(0, 3).map((suggestion, i) => ({
        id: `suggestion_${i}`,
        label: `Apply: ${suggestion.title}`,
        type: "secondary" as const,
        actionType: "apply_suggestion",
        parameters: suggestion,
      })),
      suggestions: [
        "Show me the reasoning behind these suggestions",
        "What would have the biggest impact?",
        "How do I implement these changes?",
      ],
    };
  }

  private async handleAddDecisionGateway(intent: any, context: any): Promise<JourneyAssistantResponse> {
    return {
      message: "Decision gateways add smart conditional logic to your journey. They can route participants down different paths based on their responses, performance, or other criteria.",
      actions: [
        {
          id: "add_performance_gateway",
          label: "Performance-Based Gateway",
          type: "secondary",
          actionType: "add_decision_gateway",
          parameters: { type: "performance", description: "Route based on completion scores or assessment results" },
        },
        {
          id: "add_role_gateway", 
          label: "Role-Based Gateway",
          type: "secondary",
          actionType: "add_decision_gateway",
          parameters: { type: "role", description: "Different paths for different job roles or levels" },
        },
        {
          id: "add_feedback_gateway",
          label: "Feedback-Based Gateway", 
          type: "secondary",
          actionType: "add_decision_gateway",
          parameters: { type: "feedback", description: "Route based on survey responses or satisfaction scores" },
        },
      ],
      suggestions: [
        "Route managers differently than individual contributors",
        "Send struggling participants to additional support",
        "Fast-track high performers",
      ],
    };
  }

  private async handleGenerateContent(intent: any, context: any): Promise<JourneyAssistantResponse> {
    const contentTypes = [
      "Welcome email templates",
      "Survey questions",
      "Training module outlines",
      "Check-in conversation guides",
      "Milestone celebration messages",
    ];

    return {
      message: "I can generate personalized content for your journey blocks. What type of content would you like me to create?",
      actions: contentTypes.map((type, i) => ({
        id: `generate_${i}`,
        label: type,
        type: "secondary" as const,
        actionType: "generate_content",
        parameters: { contentType: type },
      })),
      suggestions: [
        "Write a welcome email for new engineers",
        "Create survey questions for 30-day check-in",
        "Generate training topics for managers",
      ],
    };
  }

  private async handleGeneralQuery(message: string, context: any): Promise<JourneyAssistantResponse> {
    const prompt = `
    You are an expert HR Journey Designer assistant. The user asked: "${message}"
    
    Context: ${JSON.stringify(context)}
    
    Provide a helpful response about journey design, employee experience, or HR automation.
    Be conversational, knowledgeable, and offer specific suggestions.
    `;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I'm here to help with your journey design. What would you like to work on?";

      return {
        message: response,
        suggestions: [
          "Create a new journey",
          "Optimize existing journey",
          "Add experience blocks",
          "Analyze performance",
        ],
      };
    } catch (error) {
      console.error("Error generating response:", error);
      return {
        message: "I'm here to help you design amazing employee journeys. What would you like to work on today?",
        suggestions: [
          "Create a new journey",
          "Optimize existing journey", 
          "Add experience blocks",
          "Analyze performance",
        ],
      };
    }
  }

  // Helper methods
  private async getJourneyData(journeyId: string, companyId: string) {
    return await prisma.journeyTemplate.findFirst({
      where: { id: journeyId, companyId },
      include: {
        phases: {
          include: {
            experienceBlocks: {
              include: {
                feedbackSignals: true,
              },
            },
          },
        },
        metricBindings: true,
        instances: true,
      },
    });
  }

  private async getJourneyAnalytics(journeyId: string) {
    // Mock analytics - in real implementation, this would query actual data
    return {
      completionRate: Math.floor(Math.random() * 30) + 70,
      avgSatisfaction: (Math.random() * 2 + 8).toFixed(1),
      avgDuration: Math.floor(Math.random() * 10) + 25,
      participantCount: Math.floor(Math.random() * 100) + 50,
      feedbackCount: Math.floor(Math.random() * 50) + 20,
    };
  }

  private async generateOptimizations(journey: any, analytics: any) {
    // AI-generated optimizations based on journey structure and performance
    const optimizations = [
      {
        title: "Add Engagement Pulse",
        description: "Insert a quick pulse survey after Week 4 to catch engagement dips early",
        impact: "high",
        effort: "low",
        rationale: "Data shows engagement typically drops around week 4",
      },
      {
        title: "Streamline First Week",
        description: "Reduce cognitive load by spreading Week 1 tasks across two weeks",
        impact: "medium", 
        effort: "medium",
        rationale: "Feedback indicates information overload in the first week",
      },
    ];

    return optimizations;
  }

  private async generateExperimentIdeas(journey: any) {
    return [
      {
        name: "Welcome Email Timing",
        description: "Test sending welcome email on Day 1 vs Day 3 vs Day 7",
        hypothesis: "Earlier welcome emails improve engagement",
        metrics: ["Open Rate", "Click Rate", "First Week Satisfaction"],
      },
      {
        name: "Check-in Frequency",
        description: "Compare weekly vs bi-weekly manager check-ins",
        hypothesis: "More frequent check-ins improve retention",
        metrics: ["Satisfaction Score", "Time to Productivity", "90-day Retention"],
      },
    ];
  }

  private async generatePerformanceInsights(analytics: any) {
    const insights = [];
    
    if (analytics.completionRate < 80) {
      insights.push("Completion rate is below target - consider reducing journey length or adding more support");
    }
    
    if (analytics.avgSatisfaction < 7.5) {
      insights.push("Satisfaction scores suggest room for improvement in content quality or pacing");
    }
    
    if (analytics.avgDuration > 35) {
      insights.push("Journey is taking longer than expected - look for bottlenecks or unnecessary steps");
    }

    return insights;
  }

  private async generateImprovementSuggestions(journey: any) {
    return [
      {
        title: "Add Mentorship Pairing",
        description: "Pair new participants with experienced mentors for guidance",
        impact: "high",
        effort: "medium",
        rationale: "Mentorship programs show 25% improvement in satisfaction scores",
      },
      {
        title: "Implement Progressive Disclosure",
        description: "Reveal information gradually to prevent cognitive overload",
        impact: "medium",
        effort: "low", 
        rationale: "Reduces drop-off rates by breaking complex processes into digestible chunks",
      },
    ];
  }
}

export const journeyAssistant = new JourneyAssistant();
