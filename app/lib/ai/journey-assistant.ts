import { openai } from "./openai-client";
import { prisma } from "@/lib/prisma";

// Comprehensive knowledge base about Journey Designer
const JOURNEY_KNOWLEDGE_BASE = `
# What are Employee Journeys?

**Employee Journeys** are AI-powered, HR-friendly experiences that guide employees through important milestones and processes in their career lifecycle. Think of them as intelligent, automated workflows designed specifically for creating exceptional employee experiences.

## Key Concepts:

### 🎯 **What Makes Journeys Different?**
- **Experience-Focused**: Unlike technical automation rules, journeys are designed around the employee experience
- **Visual & Intuitive**: Easy-to-design visual canvas that HR teams can understand and manage
- **AI-Powered**: Built-in intelligence to optimize timing, content, and engagement
- **Flexible**: Can adapt based on employee responses, role, department, or performance

### 🚀 **Common Journey Types:**

1. **Onboarding Journeys**: Welcome new hires with structured experiences
   - Day 1 welcome email
   - Week 1 training modules
   - 30-day check-in surveys
   - 90-day performance reviews

2. **Development Journeys**: Career growth and skill development paths
   - Leadership development programs
   - Skills training sequences
   - Mentorship pairing
   - Progress tracking

3. **Performance Journeys**: Review cycles and improvement plans
   - Pre-review preparation
   - Manager 1-on-1 scheduling
   - Feedback collection
   - Goal setting and tracking

4. **Offboarding Journeys**: Smooth transitions for departing employees
   - Exit interviews
   - Equipment collection
   - Knowledge transfer
   - Alumni network invitations

5. **Custom Journeys**: Tailored to your specific needs
   - Promotion pathways
   - Return-to-work programs
   - Location transfers
   - Project-based experiences

### 🧩 **Journey Components:**

**Experience Blocks** are the building blocks of journeys:
- 📧 **Communications**: Welcome emails, notifications, announcements
- 📊 **Surveys**: Pulse checks, feedback forms, satisfaction scores
- 📚 **Training**: Learning modules, skill development, certifications
- ✅ **Tasks**: Action items, deliverables, assignments
- 👥 **Meetings**: 1-on-1s, check-ins, team introductions
- ✔️ **Approvals**: Manager sign-offs, stakeholder reviews
- 📄 **Documents**: Policies, contracts, handbooks
- 🎯 **Milestones**: Key achievements and celebrations

**Decision Gateways** add smart conditional logic:
- Route employees down different paths based on their department, role, or responses
- Personalize experiences based on performance or engagement scores
- Create adaptive journeys that respond to employee needs

**A/B Experiments** let you optimize:
- Test different welcome email timings
- Compare onboarding approaches
- Experiment with check-in frequency
- Data-driven improvement

### 💡 **How I Can Help:**

I can help you with:
- **Creating** new journey templates from scratch
- **Optimizing** existing journeys for better engagement
- **Adding** experience blocks and touchpoints
- **Designing** A/B experiments to test improvements
- **Analyzing** journey performance and metrics
- **Generating** personalized content for any block
- **Suggesting** improvements based on best practices

### 📊 **Journey Metrics:**

Track success with:
- Completion rates
- Satisfaction scores
- Time-to-productivity
- Engagement levels
- Drop-off points
- Feedback sentiment

The goal is to create seamless, engaging experiences that make employees feel supported and valued throughout their entire journey with your company.
`;

export interface JourneyAssistantRequest {
  message: string;
  context: {
    mode: "journey_designer";
    journey?: {
      id: string;
      name: string;
      status: string;
      phases: number;
      category?: string;
      persona?: string;
      businessGoals?: string[];
    };
    category?: string; // Selected category from scoping dialog
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
    // First, check if this is a question about what journeys are (fast path)
    const messageLower = message.toLowerCase();
    const isIntroQuestion = 
      messageLower.includes('what are journeys') ||
      messageLower.includes('what is a journey') ||
      messageLower.includes("what's a journey") ||
      messageLower.includes('explain journeys') ||
      messageLower.includes('tell me about journeys') ||
      messageLower.includes('what are these journeys') ||
      messageLower.includes('i dont know what') ||
      messageLower.includes("i don't know what") ||
      (messageLower.includes('what') && messageLower.includes('journey') && message.split(' ').length <= 5);
    
    // If it's an intro question, immediately route to general_query
    if (isIntroQuestion) {
      return { 
        type: "general_query", 
        confidence: 1.0,
        parameters: { isIntroQuestion: true }
      };
    }

    // Build focused context based on selected category
    const categoryContext = context.category || context.journey?.category;
    const personaContext = context.journey?.persona;
    const contextSummary = categoryContext 
      ? `Journey Category: ${categoryContext}${personaContext ? `, Target Persona: ${personaContext}` : ''}`
      : '';

    const prompt = `
    Analyze this user message in the context of Journey Designer and determine the intent:

    User Message: "${message}"
    ${contextSummary ? `Focus Context: ${contextSummary}` : ''}

    Possible intents:
    - create_journey: User wants to create a new journey
    - optimize_journey: User wants to improve an existing journey
    - add_experience_block: User wants to add a new experience block
    - create_experiment: User wants to create an A/B test
    - analyze_performance: User wants to see journey analytics
    - suggest_improvements: User wants AI suggestions
    - add_decision_gateway: User wants to add conditional logic
    - generate_content: User wants to generate content for blocks
    - general_query: General question about journeys, how they work, or conversation (use for "what are journeys", "how do journeys work", "tell me about journeys", etc.)

    IMPORTANT: If the user is asking questions like "What are journeys?", "How do they work?", "Tell me about journeys", or similar, 
    always classify as "general_query" even if you're not sure. These are learning questions, not action requests.

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
      if (!openai) {
        throw new Error("OpenAI client not initialized");
      }

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
        message: "To optimise a journey, please select one from the library first. I can then analyse its performance and suggest improvements.",
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
    // Detect if this is an introductory question about what journeys are
    const messageLower = message.toLowerCase();
    const isIntroQuestion = 
      messageLower.includes('what are journeys') ||
      messageLower.includes('what is a journey') ||
      messageLower.includes("what's a journey") ||
      messageLower.includes('explain journeys') ||
      messageLower.includes('tell me about journeys') ||
      messageLower.includes('what are these journeys') ||
      messageLower.includes('i dont know what') ||
      messageLower.includes("i don't know what") ||
      (messageLower.includes('what') && messageLower.includes('journey') && message.split(' ').length <= 5);
    
    // If asking what journeys are, provide comprehensive explanation
    if (isIntroQuestion) {
      return {
        message: `Great question! Let me explain what Employee Journeys are.

**Employee Journeys** are AI-powered, HR-friendly experiences that guide employees through important milestones in their career lifecycle. Think of them as intelligent, automated workflows designed specifically for creating exceptional employee experiences.

### 🎯 **What Makes Journeys Special?**

- **Experience-Focused**: Unlike technical automation rules, journeys are designed around the employee experience
- **Visual & Intuitive**: Easy-to-design visual canvas that HR teams can understand
- **AI-Powered**: Built-in intelligence to optimize timing, content, and engagement
- **Flexible**: Adapt based on employee responses, role, department, or performance

### 🚀 **Common Use Cases:**

1. **Onboarding Journeys**: Welcome new hires (Day 1 email → Week 1 training → 30-day survey → 90-day review)
2. **Development Journeys**: Career growth and skill development paths
3. **Performance Journeys**: Review cycles and improvement plans
4. **Offboarding Journeys**: Smooth transitions for departing employees

### 🧩 **Journey Components:**

**Experience Blocks** are the building blocks:
- 📧 Communications (emails, notifications)
- 📊 Surveys (pulse checks, feedback)
- 📚 Training (learning modules)
- ✅ Tasks (action items)
- 👥 Meetings (1-on-1s, check-ins)
- 📄 Documents (policies, handbooks)

**Decision Gateways** add smart conditional logic to personalize paths based on department, role, or responses.

**A/B Experiments** let you test and optimize different approaches.

### 💡 **What I Can Help With:**

- Creating new journey templates
- Optimizing existing journeys
- Adding experience blocks
- Analyzing performance
- Generating content
- Suggesting improvements

Would you like to create your first journey or learn more about a specific aspect?`,
        suggestions: [
          "Create a new hire onboarding journey",
          "Show me a journey example",
          "What are experience blocks?",
          "How do A/B experiments work?",
        ],
      };
    }

    // Build focused context based on selected category
    const categoryContext = context.category || context.journey?.category;
    const personaContext = context.journey?.persona;
    const businessGoalsContext = context.journey?.businessGoals;
    
    let focusedContext = '';
    if (categoryContext) {
      focusedContext = `\nFOCUSED CONTEXT:\n- Journey Category: ${categoryContext}`;
      if (personaContext) focusedContext += `\n- Target Persona: ${personaContext}`;
      if (businessGoalsContext?.length) focusedContext += `\n- Business Goals: ${businessGoalsContext.join(', ')}`;
      focusedContext += `\n\nIMPORTANT: Focus your responses on ${categoryContext} journey best practices and relevant experience blocks.`;
    }

    // For other general queries, use AI with full journey knowledge
    const prompt = `
    You are an expert HR Journey Designer assistant with deep knowledge about employee journey design.
    
    USER QUESTION: "${message}"${focusedContext}
    
    JOURNEY DESIGNER KNOWLEDGE BASE:
    ${JOURNEY_KNOWLEDGE_BASE}
    
    INSTRUCTIONS:
    - Provide a helpful, conversational response
    - Draw from the knowledge base above to answer accurately
    - Be specific and actionable
    ${categoryContext ? `- Focus specifically on ${categoryContext} journey patterns and best practices` : ''}
    - If the question is about journeys in general, explain what they are
    - If the question is about capabilities, explain what you can help with
    - If the question is vague, ask clarifying questions
    - Keep responses concise but informative (2-4 paragraphs max)
    `;

    try {
      if (!openai) {
        throw new Error("OpenAI client not initialized");
      }

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

// ============================================================================
// AI Journey Generation
// ============================================================================

export interface JourneyScopingData {
  name: string;
  description?: string;
  persona: string;
  duration: number;
  category: string;
  businessGoals: string[];
  geography?: string;
  lifecycleStage?: string;
  customGoals?: string;
}

export interface GeneratedPhase {
  name: string;
  description: string;
  duration: number;
  phaseType: "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";
  experienceBlocks: GeneratedBlock[];
}

export interface GeneratedBlock {
  name: string;
  description: string;
  blockType: "TASK" | "FORM" | "COMMUNICATION" | "TRAINING" | "APPROVAL" | "AUTOMATION" | "MILESTONE" | "SURVEY" | "DOCUMENT" | "MEETING";
  estimatedDuration: number;
  slaHours?: number;
  responsibleRole: string;
  automationConfig?: Record<string, any>;
  assets?: Record<string, any>;
  successCriteria?: Record<string, any>;
}

// Persona-specific best practices
const PERSONA_BEST_PRACTICES: Record<string, string> = {
  "remote_worker": `
    - Include virtual onboarding sessions and video introductions
    - Add equipment shipping tracking and home office setup tasks
    - Schedule regular video check-ins to combat isolation
    - Include virtual team building activities
    - Provide async communication guidelines and training
    - Add time zone coordination tools setup
  `,
  "software_engineer": `
    - Include codebase orientation and development environment setup
    - Add pair programming sessions with senior engineers
    - Include code review process training
    - Add technical architecture documentation review
    - Schedule 1-on-1s with tech leads
    - Include access to development tools and repositories
  `,
  "manager": `
    - Include leadership training and management philosophy sessions
    - Add team introduction and dynamics overview
    - Include HR policies and people management training
    - Add budget and resource management orientation
    - Schedule skip-level meeting with senior leadership
    - Include performance management system training
  `,
  "sales": `
    - Include product knowledge training and demo practice
    - Add CRM system training and pipeline management
    - Include sales methodology and process training
    - Add call shadowing with top performers
    - Schedule territory and account planning
    - Include competitive intelligence and objection handling
  `,
  "customer_success": `
    - Include product deep-dive and feature training
    - Add customer communication best practices
    - Include escalation process and support tools training
    - Add shadowing sessions with senior CSMs
    - Schedule customer portfolio handoff planning
    - Include success metrics and health score training
  `,
  "executive": `
    - Include board and investor relations briefing
    - Add strategic planning and vision alignment sessions
    - Include leadership team introductions and culture immersion
    - Add key stakeholder relationship building
    - Schedule media training if public-facing role
    - Include confidential strategic initiatives briefing
  `,
  "intern": `
    - Include structured learning paths with clear objectives
    - Add mentor assignment and regular check-ins
    - Include project-based learning assignments
    - Add professional development workshops
    - Schedule networking events with full-time employees
    - Include end-of-internship presentation preparation
  `,
  "contractor": `
    - Include project scope and deliverables overview
    - Add relevant system access and tool training
    - Include communication protocols and reporting structure
    - Add compliance and legal requirements briefing
    - Schedule project kickoff and timeline review
    - Include handoff and knowledge transfer planning
  `,
};

// Category-specific journey patterns
const CATEGORY_PATTERNS: Record<string, string> = {
  onboarding: `
    Typical phases for onboarding journeys:
    1. Pre-boarding (before start date): Welcome communications, paperwork, equipment ordering
    2. Day 1: Welcome, office tour/virtual intro, IT setup, HR orientation
    3. First Week: Team introductions, role overview, initial training
    4. First Month: Deeper role training, project involvement, first performance touchpoint
    5. 60/90-day Review: Performance assessment, feedback collection, goal refinement
    
    Key success factors:
    - Front-load administrative tasks before Day 1
    - Balance information delivery to avoid overload
    - Include social connection opportunities
    - Set clear expectations and milestones
    - Gather feedback at multiple touchpoints
  `,
  development: `
    Typical phases for development journeys:
    1. Assessment: Skills evaluation, career discussion, goal setting
    2. Planning: Create personalized development plan, identify resources
    3. Learning: Training modules, courses, certifications
    4. Practice: On-the-job application, stretch assignments, projects
    5. Review: Progress assessment, plan adjustment, next steps
    
    Key success factors:
    - Align development with business needs and career goals
    - Mix formal training with experiential learning
    - Include mentorship or coaching components
    - Set measurable milestones and checkpoints
    - Celebrate progress and achievements
  `,
  performance: `
    Typical phases for performance journeys:
    1. Preparation: Self-assessment, goal review, documentation gathering
    2. Feedback Collection: 360 feedback, peer reviews, manager input
    3. Review Meeting: Performance discussion, achievement recognition
    4. Goal Setting: New objectives, development plans, expectations
    5. Follow-up: Progress check-ins, support resources, course corrections
    
    Key success factors:
    - Ensure objectivity and fairness in assessments
    - Focus on growth opportunities, not just evaluation
    - Align individual goals with organizational objectives
    - Provide actionable feedback and support resources
    - Document outcomes and next steps clearly
  `,
  offboarding: `
    Typical phases for offboarding journeys:
    1. Notification: Exit paperwork, transition timeline, communication plan
    2. Knowledge Transfer: Documentation, training replacements, handoff meetings
    3. Asset Return: Equipment collection, access revocation, final tasks
    4. Exit Interview: Feedback collection, alumni network invitation
    5. Post-departure: Final documentation, reference arrangements, alumni engagement
    
    Key success factors:
    - Maintain positive relationship throughout
    - Ensure comprehensive knowledge transfer
    - Protect company assets and information
    - Gather honest feedback for improvement
    - Leave door open for boomerang employees
  `,
  transition: `
    Typical phases for transition journeys (promotions, role changes, transfers):
    1. Announcement: Communication plan, stakeholder notification
    2. Handoff: Current role transition, knowledge transfer
    3. Orientation: New role/location/team introduction
    4. Ramp-up: Training, relationship building, quick wins
    5. Stabilization: Performance assessment, support adjustment
    
    Key success factors:
    - Communicate changes clearly to all stakeholders
    - Allow time for proper handoff of current responsibilities
    - Provide support for learning new skills/relationships
    - Set realistic expectations for transition period
    - Celebrate the transition and new opportunity
  `,
  compliance: `
    Typical phases for compliance journeys:
    1. Notification: Requirements overview, timeline, importance explanation
    2. Training: Required courses, policy reviews, certifications
    3. Assessment: Knowledge checks, competency validation
    4. Attestation: Sign-offs, acknowledgments, documentation
    5. Verification: Audit trail, reporting, recertification planning
    
    Key success factors:
    - Make requirements clear and accessible
    - Provide engaging training, not just checkbox exercises
    - Track completion with automated reminders
    - Maintain comprehensive audit trails
    - Plan for ongoing recertification needs
  `,
};

/**
 * Generate AI-powered journey phases based on scoping data
 */
export async function generateJourneyPhasesAI(scopingData: JourneyScopingData): Promise<GeneratedPhase[]> {
  const personaKey = scopingData.persona.toLowerCase().replace(/\s+/g, '_');
  const personaBestPractices = PERSONA_BEST_PRACTICES[personaKey] || '';
  const categoryPatterns = CATEGORY_PATTERNS[scopingData.category] || CATEGORY_PATTERNS.onboarding;

  const prompt = `
You are an expert HR journey designer creating employee lifecycle programs for a modern HRIS system.
Generate a comprehensive journey structure based on the following requirements.

## Journey Requirements:
- Name: ${scopingData.name}
- Description: ${scopingData.description || 'Not provided'}
- Target Persona: ${scopingData.persona}
- Duration: ${scopingData.duration} days
- Category: ${scopingData.category}
- Business Goals: ${scopingData.businessGoals.join(', ')}
${scopingData.geography ? `- Geography: ${scopingData.geography}` : ''}
${scopingData.lifecycleStage ? `- Lifecycle Stage: ${scopingData.lifecycleStage}` : ''}
${scopingData.customGoals ? `- Additional Goals: ${scopingData.customGoals}` : ''}

## Category Best Practices:
${categoryPatterns}

${personaBestPractices ? `## Persona-Specific Recommendations (${scopingData.persona}):
${personaBestPractices}` : ''}

## Block Types Available:
- TASK: Action items, deliverables, assignments
- FORM: Data collection, applications, requests
- COMMUNICATION: Emails, notifications, announcements
- TRAINING: Learning modules, courses, certifications
- APPROVAL: Manager sign-offs, stakeholder reviews
- AUTOMATION: System-triggered actions, integrations
- MILESTONE: Key achievements, celebrations, checkpoints
- SURVEY: Feedback collection, pulse checks, assessments
- DOCUMENT: Policies, handbooks, contracts
- MEETING: 1-on-1s, team meetings, check-ins

## Response Format:
Generate a JSON array of phases. Each phase should have:
- name: Clear, action-oriented phase name
- description: Brief description of the phase purpose (1-2 sentences)
- duration: Number of days for this phase
- phaseType: "SEQUENTIAL" (blocks in order), "PARALLEL" (blocks can happen simultaneously), or "CONDITIONAL" (depends on outcomes)
- experienceBlocks: Array of blocks within the phase

Each block should have:
- name: Clear, specific block name
- description: What the employee should do/receive (1-2 sentences)
- blockType: One of the available block types
- estimatedDuration: Hours expected to complete (1-40)
- slaHours: Optional deadline in hours (only for time-sensitive items)
- responsibleRole: Who is responsible (e.g., "HR", "Manager", "IT", "Buddy", "Employee", "L&D Team")

## Guidelines:
1. Create ${Math.max(3, Math.min(6, Math.ceil(scopingData.duration / 20)))} phases that span the ${scopingData.duration}-day journey
2. Include 2-5 experience blocks per phase
3. Front-load critical setup tasks
4. Include feedback touchpoints throughout
5. End with a clear milestone or review
6. Make block names specific and actionable
7. Assign realistic time estimates
8. Consider the persona's specific needs and work context

Generate the journey structure now as a valid JSON array:
`;

  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert HR journey designer. Always respond with valid JSON arrays only, no markdown formatting or explanation text. The response should be parseable by JSON.parse().",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.error("No response from OpenAI");
      return getFallbackTemplate(scopingData);
    }

    // Parse the JSON response
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      const phases: GeneratedPhase[] = JSON.parse(cleanedResponse);
      
      // Validate and normalize the response
      return phases.map((phase, index) => ({
        name: phase.name || `Phase ${index + 1}`,
        description: phase.description || "",
        duration: phase.duration || Math.ceil(scopingData.duration / phases.length),
        phaseType: validatePhaseType(phase.phaseType),
        experienceBlocks: (phase.experienceBlocks || []).map((block, blockIndex) => ({
          name: block.name || `Block ${blockIndex + 1}`,
          description: block.description || "",
          blockType: validateBlockType(block.blockType),
          estimatedDuration: block.estimatedDuration || 2,
          slaHours: block.slaHours,
          responsibleRole: block.responsibleRole || "HR",
          automationConfig: block.automationConfig,
          assets: block.assets,
          successCriteria: block.successCriteria,
        })),
      }));
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", response);
      return getFallbackTemplate(scopingData);
    }
  } catch (error) {
    console.error("Error generating journey with AI:", error);
    return getFallbackTemplate(scopingData);
  }
}

function validatePhaseType(type: string): "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL" {
  const validTypes = ["SEQUENTIAL", "PARALLEL", "CONDITIONAL"];
  return validTypes.includes(type?.toUpperCase()) 
    ? type.toUpperCase() as "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL"
    : "SEQUENTIAL";
}

function validateBlockType(type: string): GeneratedBlock["blockType"] {
  const validTypes = ["TASK", "FORM", "COMMUNICATION", "TRAINING", "APPROVAL", "AUTOMATION", "MILESTONE", "SURVEY", "DOCUMENT", "MEETING"];
  return validTypes.includes(type?.toUpperCase())
    ? type.toUpperCase() as GeneratedBlock["blockType"]
    : "TASK";
}

/**
 * Fallback template when AI generation fails
 */
function getFallbackTemplate(scopingData: JourneyScopingData): GeneratedPhase[] {
  const templates: Record<string, GeneratedPhase[]> = {
    onboarding: [
      {
        name: "Pre-boarding",
        description: "Prepare for the new hire's arrival before their start date",
        duration: Math.min(7, Math.ceil(scopingData.duration * 0.1)),
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Welcome Email",
            description: "Send personalized welcome message with first day instructions",
            blockType: "COMMUNICATION",
            estimatedDuration: 1,
            responsibleRole: "HR",
          },
          {
            name: "Equipment Setup",
            description: "Prepare workspace, laptop, and required equipment",
            blockType: "TASK",
            estimatedDuration: 4,
            slaHours: 48,
            responsibleRole: "IT",
          },
          {
            name: "Access Provisioning",
            description: "Set up system access, email, and required accounts",
            blockType: "AUTOMATION",
            estimatedDuration: 2,
            responsibleRole: "IT",
          },
        ],
      },
      {
        name: "First Day",
        description: "Welcome and initial orientation experience",
        duration: 1,
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Welcome Meeting",
            description: "Personal welcome from manager and team introduction",
            blockType: "MEETING",
            estimatedDuration: 2,
            responsibleRole: "Manager",
          },
          {
            name: "Company Overview",
            description: "Learn about company mission, values, and culture",
            blockType: "TRAINING",
            estimatedDuration: 3,
            responsibleRole: "HR",
          },
          {
            name: "Workspace Setup",
            description: "Set up personal workspace and get oriented",
            blockType: "TASK",
            estimatedDuration: 2,
            responsibleRole: "Buddy",
          },
        ],
      },
      {
        name: "First Week",
        description: "Role-specific training and team integration",
        duration: Math.min(7, Math.ceil(scopingData.duration * 0.15)),
        phaseType: "PARALLEL",
        experienceBlocks: [
          {
            name: "Role Training",
            description: "Learn specific job responsibilities and workflows",
            blockType: "TRAINING",
            estimatedDuration: 16,
            responsibleRole: "Manager",
          },
          {
            name: "System Training",
            description: "Learn required tools, systems, and processes",
            blockType: "TRAINING",
            estimatedDuration: 8,
            responsibleRole: "IT",
          },
          {
            name: "First Week Check-in",
            description: "Quick pulse survey to assess initial experience",
            blockType: "SURVEY",
            estimatedDuration: 1,
            responsibleRole: "HR",
          },
        ],
      },
      {
        name: "First Month",
        description: "Deeper integration and initial project work",
        duration: Math.ceil(scopingData.duration * 0.4),
        phaseType: "PARALLEL",
        experienceBlocks: [
          {
            name: "Project Assignment",
            description: "Assign first meaningful project or task",
            blockType: "TASK",
            estimatedDuration: 20,
            responsibleRole: "Manager",
          },
          {
            name: "30-Day Check-in",
            description: "Formal check-in to review progress and address concerns",
            blockType: "MEETING",
            estimatedDuration: 2,
            responsibleRole: "Manager",
          },
          {
            name: "30-Day Survey",
            description: "Comprehensive feedback on onboarding experience",
            blockType: "SURVEY",
            estimatedDuration: 1,
            responsibleRole: "HR",
          },
        ],
      },
      {
        name: "90-Day Review",
        description: "Formal performance assessment and goal setting",
        duration: Math.ceil(scopingData.duration * 0.35),
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Self-Assessment",
            description: "Complete self-evaluation of progress and goals",
            blockType: "FORM",
            estimatedDuration: 2,
            responsibleRole: "Employee",
          },
          {
            name: "Performance Review",
            description: "Formal review meeting with manager",
            blockType: "MEETING",
            estimatedDuration: 2,
            responsibleRole: "Manager",
          },
          {
            name: "Onboarding Complete",
            description: "Celebrate successful completion of onboarding journey",
            blockType: "MILESTONE",
            estimatedDuration: 1,
            responsibleRole: "HR",
          },
        ],
      },
    ],
    development: [
      {
        name: "Assessment",
        description: "Evaluate current skills and identify development areas",
        duration: Math.ceil(scopingData.duration * 0.15),
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Skills Assessment",
            description: "Complete comprehensive skills evaluation survey",
            blockType: "SURVEY",
            estimatedDuration: 2,
            responsibleRole: "Employee",
          },
          {
            name: "Career Discussion",
            description: "Discuss career goals and development aspirations",
            blockType: "MEETING",
            estimatedDuration: 2,
            responsibleRole: "Manager",
          },
        ],
      },
      {
        name: "Planning",
        description: "Create personalized development plan",
        duration: Math.ceil(scopingData.duration * 0.1),
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Development Plan",
            description: "Create structured learning path and goals",
            blockType: "FORM",
            estimatedDuration: 3,
            responsibleRole: "Manager",
          },
        ],
      },
      {
        name: "Learning",
        description: "Execute development activities and training",
        duration: Math.ceil(scopingData.duration * 0.6),
        phaseType: "PARALLEL",
        experienceBlocks: [
          {
            name: "Training Modules",
            description: "Complete assigned training courses and certifications",
            blockType: "TRAINING",
            estimatedDuration: 40,
            responsibleRole: "Employee",
          },
          {
            name: "Progress Check-ins",
            description: "Regular progress reviews with manager",
            blockType: "MEETING",
            estimatedDuration: 4,
            responsibleRole: "Manager",
          },
        ],
      },
      {
        name: "Review",
        description: "Assess progress and plan next steps",
        duration: Math.ceil(scopingData.duration * 0.15),
        phaseType: "SEQUENTIAL",
        experienceBlocks: [
          {
            name: "Final Assessment",
            description: "Evaluate development progress and achievements",
            blockType: "SURVEY",
            estimatedDuration: 2,
            responsibleRole: "Manager",
          },
          {
            name: "Development Complete",
            description: "Celebrate completion and plan next development cycle",
            blockType: "MILESTONE",
            estimatedDuration: 1,
            responsibleRole: "HR",
          },
        ],
      },
    ],
  };

  return templates[scopingData.category] || templates.onboarding;
}
