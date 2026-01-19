import { openai } from "./openai-client";
import { prisma } from "@/lib/prisma";

// Comprehensive knowledge base about Performance Management
const PERFORMANCE_KNOWLEDGE_BASE = `
# Performance Management System

**Performance Management** is a comprehensive system for managing employee objectives, conducting 1-2-1 meetings, orchestrating 360° review cycles, and tracking development - all aligned with company goals.

## Key Concepts:

### 🎯 **Cascading Objectives (OKRs)**

**Company Objectives** → **Team Objectives** → **Personal Objectives**

Objectives follow the OKR (Objectives and Key Results) framework:
- **Objective**: What you want to achieve (qualitative, inspirational)
- **Key Results**: How you'll measure success (quantitative, measurable)

**Example:**
- **Company Objective**: "Become the market leader in customer satisfaction"
  - KR1: Achieve NPS score of 75+
  - KR2: Reduce churn rate to <5%
  
- **Team Objective** (Customer Success): "Deliver exceptional support experiences"
  - KR1: Maintain response time under 2 hours
  - KR2: Resolve 90% of tickets in first contact
  
- **Personal Objective** (CS Rep): "Master product knowledge and support excellence"
  - KR1: Complete all product certifications
  - KR2: Achieve 95% CSAT score

**Objective Statuses:**
- NOT_STARTED: Not yet begun
- IN_PROGRESS: Actively working on it
- AT_RISK: Behind schedule or blocked
- COMPLETED: Successfully achieved
- CANCELLED: No longer relevant
- DEFERRED: Postponed to future period

**Priority Levels:**
- CRITICAL: Must be done - highest priority
- HIGH: Important and time-sensitive
- MEDIUM: Standard priority (default)
- LOW: Nice to have, can be deprioritized

### 💬 **1-2-1 Meetings & Performance Conversations**

**Performance Templates** provide structure for meetings:

1. **Weekly 1-2-1**: Quick check-ins for ongoing support
   - Wellbeing check
   - Progress updates
   - Blockers discussion
   - Next week priorities

2. **Probation Review**: End-of-probation assessment
   - Role understanding
   - Performance evaluation
   - Team integration
   - Pass/extend/fail decision

3. **Quarterly Review**: Comprehensive performance check
   - Objective progress review
   - Achievements & strengths
   - Development areas
   - Next quarter goals

4. **Annual Review**: Yearly performance assessment
   - Full year summary
   - Core competencies rating
   - Career development planning
   - Compensation discussion

**Meeting Features:**
- Pre-filled agendas from templates
- Real-time note capture
- Action item tracking with due dates
- Recurring meeting support

### 🔄 **360° Review Cycles**

Structured multi-stage review processes:

**Review Types:**
- PROBATION: End of probation assessment
- QUARTERLY: Every 3 months
- SEMI_ANNUAL: Twice yearly
- ANNUAL: Once per year
- AD_HOC: As needed

**Reviewer Roles:**
- SELF: Employee self-assessment
- MANAGER: Direct manager review
- PEER: Colleague feedback
- DIRECT_REPORT: Upward feedback
- SKIP_LEVEL: Skip-level manager
- HR: HR assessment

**Cycle Stages:**
1. **Setup**: Configure participants, templates, deadlines
2. **Self Review**: Employees complete self-assessment
3. **Peer Review**: Colleagues provide feedback (can be anonymous)
4. **Manager Review**: Manager completes assessment
5. **Review Phase**: Compile and analyze all feedback
6. **Completed**: Finalized with insights

**Privacy Features:**
- Anonymous peer reviews (configurable)
- Aggregated feedback themes
- Confidential development plans

### 📊 **Insights & Analytics**

Track performance across the organization:
- **Completion Rates**: Objective and review completion percentages
- **Engagement Scores**: Employee participation metrics
- **Rating Distribution**: Performance rating spreads
- **Theme Analysis**: Common strengths/development areas
- **Trend Tracking**: Performance over time

### 💡 **How I Can Help:**

**Objective Management:**
- "Create a company objective to increase revenue by 25%"
- "Show me all objectives at risk"
- "Update the engineering hiring goal to 80% complete"
- "What are my team's top priorities this quarter?"

**Meeting Scheduling:**
- "Schedule weekly 1-2-1s with my team"
- "Book quarterly reviews for the product team"
- "Find time for a probation review with Sarah next week"

**Review Cycles:**
- "Start annual reviews for the sales department"
- "How many people have completed their self-reviews?"
- "Show me peer feedback themes for Q4 reviews"

**Performance Analysis:**
- "What's our objective completion rate?"
- "Which teams are behind on their goals?"
- "Analyze performance trends for the engineering team"

**Action Items:**
- "What action items are due this week?"
- "Show me pending tasks from my 1-2-1s"
- "Mark the hiring plan action as complete"

### 🎯 **Best Practices:**

**Setting Objectives:**
- Keep them specific and measurable
- Align with higher-level goals
- Set challenging but achievable targets
- Review and update quarterly
- Limit to 3-5 key objectives per level

**1-2-1 Meetings:**
- Consistent weekly cadence
- Employee-led agenda
- Focus on support not interrogation
- Capture action items with owners
- Follow up on previous actions

**360° Reviews:**
- Clear expectations and timelines
- Training for reviewers
- Balanced feedback (strengths + development)
- Actionable development plans
- Regular check-ins after reviews

**Feedback Culture:**
- Continuous feedback, not just annual
- Specific examples over generalizations
- Growth mindset focus
- Two-way conversations
- Follow-through on commitments

The goal is to create a culture of continuous improvement where employees feel supported, aligned with company goals, and empowered to grow in their careers.
`;

export interface PerformanceAssistantRequest {
  message: string;
  context: {
    userId: string;
    companyId: string;
    role: string;
    employeeId?: string;
  };
}

export interface PerformanceAssistantResponse {
  response: string;
  suggestedActions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
  needsMoreInfo?: boolean;
  followUpQuestions?: string[];
}

/**
 * AI Assistant for Performance Management
 * Handles objectives, 1-2-1s, reviews, and performance analytics
 */
export async function handlePerformanceAssistantRequest(
  request: PerformanceAssistantRequest
): Promise<PerformanceAssistantResponse> {
  try {
    const { message, context } = request;

    // Fetch relevant performance data for context
    const [objectives, upcomingMeetings, activeReviewCycles] = await Promise.all([
      // Get user's relevant objectives
      prisma.personalObjective.findMany({
        where: { employeeId: context.employeeId, companyId: context.companyId },
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: {
          keyResults: true,
          ParentObjective: { select: { title: true } },
        },
      }),
      
      // Get upcoming meetings (if manager/admin)
      ["MANAGER", "ADMIN", "SUPER_ADMIN", "HR"].includes(context.role)
        ? prisma.performanceMeeting.findMany({
            where: {
              companyId: context.companyId,
              scheduledAt: { gte: new Date() },
              status: "SCHEDULED",
            },
            take: 5,
            orderBy: { scheduledAt: "asc" },
          })
        : [],
      
      // Get active review cycles (if manager/admin)
      ["MANAGER", "ADMIN", "SUPER_ADMIN", "HR"].includes(context.role)
        ? prisma.performanceReviewCycle.findMany({
            where: {
              companyId: context.companyId,
              status: { in: ["ACTIVE", "IN_PROGRESS", "REVIEW_PHASE"] },
            },
            take: 5,
          })
        : [],
    ]);

    // Build context summary
    const contextSummary = `
Current User Context:
- Role: ${context.role}
- Personal Objectives: ${objectives.length} active objectives
${objectives.length > 0 ? `  - Most Recent: "${objectives[0].title}" (${objectives[0].status}, ${objectives[0].progress}% complete)` : ""}
${upcomingMeetings.length > 0 ? `- Upcoming Meetings: ${upcomingMeetings.length} scheduled` : ""}
${activeReviewCycles.length > 0 ? `- Active Review Cycles: ${activeReviewCycles.length} in progress` : ""}
    `.trim();

    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    // Call OpenAI with performance management context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert Performance Management AI Assistant for the Corenz HR platform.

${PERFORMANCE_KNOWLEDGE_BASE}

${contextSummary}

Your role is to help users with:
1. Creating and managing objectives (OKRs) at company, team, and personal levels
2. Scheduling and conducting 1-2-1 meetings and performance conversations
3. Setting up and running 360° review cycles
4. Analyzing performance data and providing insights
5. Tracking action items from meetings
6. Suggesting best practices for performance management

When users ask questions:
- Be conversational and supportive
- Provide specific, actionable guidance
- Suggest next steps when appropriate
- Ask clarifying questions if needed
- Reference specific objectives, meetings, or reviews when relevant
- Use examples to illustrate concepts

For vague requests, ask follow-up questions:
- "Create an objective" → Ask about level (company/team/personal), owner, timeline, key results
- "Schedule reviews" → Ask about review type, participants, timeline
- "Show performance" → Ask what metrics or team they want to analyze

Always be encouraging and focus on growth and development, not just evaluation.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm not sure how to help with that. Could you provide more details?";

    // Detect intent and suggest actions
    const suggestedActions = detectPerformanceActions(message, aiResponse);
    const needsMoreInfo = detectNeedsMoreInfo(aiResponse);

    return {
      response: aiResponse,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      needsMoreInfo,
    };
  } catch (error) {
    console.error("[performance-assistant]", error);
    return {
      response: "I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
      needsMoreInfo: false,
    };
  }
}

/**
 * Detect actionable intents from the conversation
 */
function detectPerformanceActions(
  userMessage: string,
  aiResponse: string
): Array<{ label: string; action: string; params?: Record<string, any> }> {
  const actions: Array<{ label: string; action: string; params?: Record<string, any> }> = [];
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // Objective creation
  if (
    lowerMessage.includes("create") &&
    (lowerMessage.includes("objective") || lowerMessage.includes("goal") || lowerMessage.includes("okr"))
  ) {
    actions.push({
      label: "Create Objective",
      action: "create_objective",
    });
  }

  // Meeting scheduling
  if (
    (lowerMessage.includes("schedule") || lowerMessage.includes("book")) &&
    (lowerMessage.includes("1-2-1") || lowerMessage.includes("meeting") || lowerMessage.includes("review"))
  ) {
    actions.push({
      label: "Schedule Meeting",
      action: "schedule_meeting",
    });
  }

  // Review cycle
  if (
    (lowerMessage.includes("start") || lowerMessage.includes("launch") || lowerMessage.includes("create")) &&
    (lowerMessage.includes("review cycle") || lowerMessage.includes("360") || lowerMessage.includes("annual review"))
  ) {
    actions.push({
      label: "Create Review Cycle",
      action: "create_review_cycle",
    });
  }

  // View objectives
  if (
    (lowerMessage.includes("show") || lowerMessage.includes("view") || lowerMessage.includes("list")) &&
    (lowerMessage.includes("objective") || lowerMessage.includes("goal") || lowerMessage.includes("okr"))
  ) {
    actions.push({
      label: "View Objectives",
      action: "view_objectives",
    });
  }

  // Performance dashboard
  if (
    lowerMessage.includes("dashboard") ||
    lowerMessage.includes("overview") ||
    (lowerMessage.includes("performance") && lowerMessage.includes("summary"))
  ) {
    actions.push({
      label: "Go to Dashboard",
      action: "open_dashboard",
    });
  }

  return actions;
}

/**
 * Detect if AI needs more information
 */
function detectNeedsMoreInfo(aiResponse: string): boolean {
  const needsMorePatterns = [
    "could you provide",
    "can you tell me",
    "what type of",
    "which team",
    "who should",
    "when would you like",
    "would you like me to",
    "do you want",
    "should i",
  ];

  const lowerResponse = aiResponse.toLowerCase();
  return needsMorePatterns.some((pattern) => lowerResponse.includes(pattern));
}

/**
 * Quick help responses for common performance questions
 */
export function getPerformanceQuickHelp(topic: string): string {
  const helpTopics: Record<string, string> = {
    objectives: `**Creating Objectives (OKRs)**

1. **Company Objectives**: Set by leadership, define strategic goals
2. **Team Objectives**: Align departments with company strategy
3. **Personal Objectives**: Individual goals aligned with team objectives

Each objective should have:
- Clear, inspiring title
- 2-5 measurable key results
- Owner and timeline
- Regular progress updates

Example: "Increase customer satisfaction"
- KR1: Achieve NPS of 80+
- KR2: Reduce support tickets by 30%`,

    meetings: `**1-2-1 Meetings Best Practices**

- **Weekly cadence** for direct reports
- **Employee-led agenda** using templates
- **Document action items** with owners and due dates
- **Follow up** on previous commitments
- **Focus on support** not just status updates

Use templates:
- Weekly 1-2-1 for regular check-ins
- Quarterly Review for deep dives
- Probation Review for new hires`,

    reviews: `**360° Review Cycles**

**Setup Process:**
1. Choose participants and timeline
2. Select review template
3. Set deadlines for each stage
4. Configure anonymity settings

**Review Stages:**
- Self Review: Employee self-assessment
- Peer Review: Colleague feedback
- Manager Review: Manager assessment
- Compilation: Aggregate insights

**After Reviews:**
- One-on-one discussion
- Development plan creation
- Regular follow-up check-ins`,

    "action-items": `**Managing Action Items**

Action items from 1-2-1s help track follow-through:

- **Specific**: Clear, actionable tasks
- **Assigned**: Named owner
- **Deadline**: Due date set
- **Priority**: HIGH/MEDIUM/LOW
- **Status**: TODO → IN_PROGRESS → COMPLETED

Track completion rates and follow up on overdue items in your next meeting.`,
  };

  return helpTopics[topic] || "I can help with objectives, 1-2-1 meetings, review cycles, and action items. What would you like to know?";
}
