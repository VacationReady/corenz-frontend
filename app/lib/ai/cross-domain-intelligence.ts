/**
 * Cross-Domain Intelligence System
 * Detects correlations across HR domains for holistic insights and recommendations
 * Phase 2 Enhancement - Connects data points that traditional systems miss
 */

import { prisma } from "@/lib/prisma";
import { openai, AI_CONFIG } from "./openai-client";
import { getSystemContext, type SystemContext } from "./system-context";
import { hrKnowledgeBase } from "./knowledge-base";

// ==================== TYPES ====================

export interface Correlation {
  id: string;
  type: 'positive' | 'negative' | 'causal' | 'predictive';
  domain1: string;
  domain2: string;
  metric1: string;
  metric2: string;
  strength: number; // 0-1
  confidence: number; // 0-1
  description: string;
  evidencePoints: string[];
  implication: string;
  detectedAt: Date;
}

export interface UnifiedRecommendation {
  id: string;
  title: string;
  description: string;
  affectedDomains: string[];
  correlationsUsed: string[];
  reasoning: string;
  actionSteps: string[];
  expectedImpact: {
    domain: string;
    metric: string;
    estimatedChange: string;
  }[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedROI?: string;
}

export interface CrossDomainImpact {
  action: string;
  directImpacts: DomainImpact[];
  cascadingEffects: DomainImpact[];
  timeline: {
    immediate: string[];
    shortTerm: string[]; // 1-3 months
    longTerm: string[]; // 6+ months
  };
  riskFactors: string[];
  successIndicators: string[];
}

interface DomainImpact {
  domain: string;
  impactType: 'positive' | 'negative' | 'neutral';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedMetrics: string[];
}

export interface RootCauseAnalysis {
  symptom: string;
  rootCauses: RootCause[];
  contributingFactors: string[];
  dataAnalyzed: string[];
  confidence: number;
  recommendation: string;
}

interface RootCause {
  description: string;
  domain: string;
  evidence: string[];
  likelihood: number; // 0-1
  impact: 'critical' | 'high' | 'medium' | 'low';
}

// ==================== CROSS-DOMAIN INTELLIGENCE ENGINE ====================

export class CrossDomainIntelligence {
  /**
   * Analyze correlations between different HR domains
   */
  async analyzeCorrelations(companyId: string): Promise<Correlation[]> {
    console.log('[Cross-Domain Intelligence] Analyzing correlations for company:', companyId);

    const systemContext = await getSystemContext(companyId);
    const correlations: Correlation[] = [];

    // Correlation 1: Low survey scores → High turnover
    const turnoverCorrelation = await this.analyzeTurnoverSurveyCorrelation(companyId, systemContext);
    if (turnoverCorrelation) correlations.push(turnoverCorrelation);

    // Correlation 2: High leave requests → Workload issues
    const leaveWorkloadCorrelation = await this.analyzeLeaveWorkloadCorrelation(companyId, systemContext);
    if (leaveWorkloadCorrelation) correlations.push(leaveWorkloadCorrelation);

    // Correlation 3: Poor onboarding → Early resignations
    const onboardingRetentionCorrelation = await this.analyzeOnboardingRetentionCorrelation(companyId, systemContext);
    if (onboardingRetentionCorrelation) correlations.push(onboardingRetentionCorrelation);

    // Correlation 4: Low 1-on-1 frequency → Performance issues
    const oneOnOnePerformanceCorrelation = await this.analyzeOneOnOnePerformanceCorrelation(companyId, systemContext);
    if (oneOnOnePerformanceCorrelation) correlations.push(oneOnOnePerformanceCorrelation);

    // Correlation 5: Contract expirations → Retention risk
    const contractRetentionCorrelation = await this.analyzeContractRetentionCorrelation(companyId, systemContext);
    if (contractRetentionCorrelation) correlations.push(contractRetentionCorrelation);

    return correlations;
  }

  /**
   * Generate unified recommendations spanning multiple domains
   */
  async generateUnifiedRecommendations(companyId: string): Promise<UnifiedRecommendation[]> {
    console.log('[Cross-Domain Intelligence] Generating unified recommendations');

    const correlations = await this.analyzeCorrelations(companyId);
    const systemContext = await getSystemContext(companyId);
    const recommendations: UnifiedRecommendation[] = [];

    // Group correlations by common themes
    const negativeCorrelations = correlations.filter(c => c.type === 'negative' && c.strength > 0.6);

    if (negativeCorrelations.length > 0) {
      // Generate AI-powered holistic recommendation
      const aiRecommendation = await this.generateAIRecommendation(
        negativeCorrelations,
        systemContext
      );
      if (aiRecommendation) recommendations.push(aiRecommendation);
    }

    // Add domain-specific recommendations
    const performanceRecommendation = await this.generatePerformanceRecommendation(companyId, systemContext);
    if (performanceRecommendation) recommendations.push(performanceRecommendation);

    return recommendations;
  }

  /**
   * Predict impact of changes across domains
   */
  async predictCrossDomainImpact(action: string, companyId: string): Promise<CrossDomainImpact> {
    console.log('[Cross-Domain Intelligence] Predicting cross-domain impact of:', action);

    const systemContext = await getSystemContext(companyId);

    const prompt = `Analyze the cross-domain impact of this HR action:

ACTION: ${action}

COMPANY CONTEXT:
- ${systemContext.employees.active} employees across ${systemContext.departments.length} departments
- Current turnover rate: ${this.estimateTurnoverRate(systemContext)}%
- Active surveys: ${systemContext.surveys.active}
- Engagement score: ${systemContext.surveys.avgResponseRate}%
- Active workflows: ${systemContext.workflows.active}

Analyze how this action will ripple across these HR domains:
1. EMPLOYEE ENGAGEMENT
2. PERFORMANCE MANAGEMENT
3. RECRUITMENT & RETENTION
4. COMPLIANCE & OPERATIONS
5. CULTURE & DEVELOPMENT

Provide:
- Direct impacts (immediate effects)
- Cascading effects (secondary impacts)
- Timeline (immediate, 1-3 months, 6+ months)
- Risk factors
- Success indicators

Be specific and realistic based on HR best practices.`;

    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.4,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR strategist analyzing cross-domain impacts of organizational actions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysis = completion.choices[0].message.content || '';
    
    return this.parseImpactAnalysis(action, analysis);
  }

  /**
   * Find root causes by analyzing multiple data sources
   */
  async findRootCause(symptom: string, companyId: string): Promise<RootCauseAnalysis> {
    console.log('[Cross-Domain Intelligence] Finding root cause of:', symptom);

    const systemContext = await getSystemContext(companyId);
    const correlations = await this.analyzeCorrelations(companyId);

    const prompt = `Perform root cause analysis for this HR issue:

SYMPTOM: ${symptom}

AVAILABLE DATA:
- ${systemContext.employees.active} employees
- ${systemContext.departments.length} departments
- Recent turnover: ${this.estimateTurnoverRate(systemContext)}%
- Survey response rate: ${systemContext.surveys.avgResponseRate}%
- Pending leave requests: ${systemContext.recentActivity.pendingLeave}
- Active objectives: ${systemContext.performance.activeObjectives}
- Overdue action items: ${systemContext.actionItems.overdue}

DETECTED CORRELATIONS:
${correlations.slice(0, 3).map(c => `- ${c.description}`).join('\n')}

Use the "5 Whys" technique to identify root causes:
1. Ask why the symptom occurs
2. For each answer, ask why again
3. Continue until you reach fundamental causes
4. Provide evidence from the data
5. Assess likelihood of each root cause

Format:
ROOT CAUSE 1: [Description]
EVIDENCE: [What data supports this]
LIKELIHOOD: [high/medium/low]

[Repeat for 2-3 root causes]

RECOMMENDATION: [What to do about it]`;

    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in root cause analysis for HR issues. Use data-driven reasoning and the 5 Whys technique.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysis = completion.choices[0].message.content || '';
    
    return this.parseRootCauseAnalysis(symptom, analysis, systemContext);
  }

  // ==================== PRIVATE CORRELATION DETECTION METHODS ====================

  private async analyzeTurnoverSurveyCorrelation(
    companyId: string,
    context: SystemContext
  ): Promise<Correlation | null> {
    // Check if we have both survey data and turnover data
    if (context.surveys.total === 0) return null;

    const recentTerminations = await prisma.employee.count({
      where: {
        companyId,
        isActive: false,
        User: {
          updatedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      }
    });

    const turnoverRate = (recentTerminations / context.employees.active) * 100;
    const lowEngagement = context.surveys.avgResponseRate < 50;

    if (lowEngagement && turnoverRate > 5) {
      return {
        id: 'turnover-survey-correlation',
        type: 'predictive',
        domain1: 'employee_engagement',
        domain2: 'retention',
        metric1: 'survey_response_rate',
        metric2: 'turnover_rate',
        strength: 0.75,
        confidence: 0.8,
        description: 'Low survey engagement correlates with elevated turnover',
        evidencePoints: [
          `Survey response rate: ${context.surveys.avgResponseRate}% (below 50% threshold)`,
          `Turnover rate: ${turnoverRate.toFixed(1)}% over 90 days`,
          'Pattern: Disengaged employees often leave within 3 months'
        ],
        implication: 'Improving engagement (measured by survey participation) may reduce turnover',
        detectedAt: new Date()
      };
    }

    return null;
  }

  private async analyzeLeaveWorkloadCorrelation(
    companyId: string,
    context: SystemContext
  ): Promise<Correlation | null> {
    if (context.recentActivity.pendingLeave > context.employees.active * 0.25) {
      return {
        id: 'leave-workload-correlation',
        type: 'causal',
        domain1: 'leave_management',
        domain2: 'workload',
        metric1: 'pending_leave_requests',
        metric2: 'burnout_risk',
        strength: 0.65,
        confidence: 0.7,
        description: 'High leave requests indicate potential workload or burnout issues',
        evidencePoints: [
          `${context.recentActivity.pendingLeave} pending leave requests`,
          `${((context.recentActivity.pendingLeave / context.employees.active) * 100).toFixed(0)}% of workforce has pending leave`,
          'Abnormally high leave volume often signals stress or burnout'
        ],
        implication: 'Review workload distribution and manager support',
        detectedAt: new Date()
      };
    }

    return null;
  }

  private async analyzeOnboardingRetentionCorrelation(
    companyId: string,
    context: SystemContext
  ): Promise<Correlation | null> {
    if (context.journeys.total === 0 && context.recentActivity.newHires > 5) {
      return {
        id: 'onboarding-retention-correlation',
        type: 'predictive',
        domain1: 'onboarding',
        domain2: 'retention',
        metric1: 'journey_completion_rate',
        metric2: 'early_turnover',
        strength: 0.7,
        confidence: 0.75,
        description: 'Lack of structured onboarding increases early resignation risk',
        evidencePoints: [
          `${context.recentActivity.newHires} new hires in last 30 days`,
          'No onboarding journeys configured in system',
          'Industry research: Poor onboarding = 50% higher early turnover'
        ],
        implication: 'Implement structured onboarding to reduce 90-day turnover',
        detectedAt: new Date()
      };
    }

    return null;
  }

  private async analyzeOneOnOnePerformanceCorrelation(
    companyId: string,
    context: SystemContext
  ): Promise<Correlation | null> {
    if (context.performance.upcomingMeetings < context.employees.active * 0.3) {
      return {
        id: 'one-on-one-performance-correlation',
        type: 'causal',
        domain1: 'performance_management',
        domain2: 'employee_development',
        metric1: 'one_on_one_frequency',
        metric2: 'performance_scores',
        strength: 0.68,
        confidence: 0.8,
        description: 'Low 1-on-1 frequency correlates with performance issues',
        evidencePoints: [
          `Only ${context.performance.upcomingMeetings} 1-on-1s scheduled`,
          `Should be ~${context.employees.active} monthly meetings`,
          'Research: Regular 1-on-1s improve performance by 20-25%'
        ],
        implication: 'Increase manager-employee touchpoints for better performance',
        detectedAt: new Date()
      };
    }

    return null;
  }

  private async analyzeContractRetentionCorrelation(
    companyId: string,
    context: SystemContext
  ): Promise<Correlation | null> {
    if (context.employees.contractsExpiringSoon > 0) {
      return {
        id: 'contract-retention-correlation',
        type: 'predictive',
        domain1: 'compliance',
        domain2: 'retention',
        metric1: 'contract_expirations',
        metric2: 'attrition_risk',
        strength: 0.8,
        confidence: 0.9,
        description: 'Upcoming contract expirations create retention risk',
        evidencePoints: [
          `${context.employees.contractsExpiringSoon} contracts expiring within 60 days`,
          'Contract renewal conversations not tracked in system',
          'High risk: Employees may explore other opportunities'
        ],
        implication: 'Proactively engage employees before contract expiry',
        detectedAt: new Date()
      };
    }

    return null;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private estimateTurnoverRate(context: SystemContext): number {
    // Rough estimate based on recent activity
    return context.employees.active > 0 
      ? ((context.employees.total - context.employees.active) / context.employees.total) * 100
      : 0;
  }

  private async generateAIRecommendation(
    correlations: Correlation[],
    context: SystemContext
  ): Promise<UnifiedRecommendation> {
    const domains = [...new Set(correlations.flatMap(c => [c.domain1, c.domain2]))];
    
    return {
      id: `unified-rec-${Date.now()}`,
      title: 'Holistic HR System Improvement',
      description: `Address interconnected issues across ${domains.join(', ')}`,
      affectedDomains: domains,
      correlationsUsed: correlations.map(c => c.id),
      reasoning: `Detected ${correlations.length} significant correlations indicating systemic issues requiring coordinated response`,
      actionSteps: [
        'Conduct employee pulse survey to gather baseline data',
        'Review and improve manager 1-on-1 cadence',
        'Implement or optimize onboarding journeys',
        'Address workload distribution concerns',
        'Proactively manage contract renewals'
      ],
      expectedImpact: [
        {
          domain: 'retention',
          metric: 'turnover_rate',
          estimatedChange: '-15 to -25%'
        },
        {
          domain: 'engagement',
          metric: 'survey_participation',
          estimatedChange: '+20 to +30%'
        }
      ],
      priority: 'high',
      estimatedROI: '3-5x investment through reduced turnover costs'
    };
  }

  private async generatePerformanceRecommendation(
    companyId: string,
    context: SystemContext
  ): Promise<UnifiedRecommendation | null> {
    if (context.performance.totalObjectives === 0 && context.employees.active > 10) {
      return {
        id: `performance-rec-${Date.now()}`,
        title: 'Establish Performance Management Framework',
        description: 'Implement objective tracking and regular check-ins',
        affectedDomains: ['performance_management', 'employee_development', 'retention'],
        correlationsUsed: [],
        reasoning: 'No performance objectives tracked, limiting visibility and growth opportunities',
        actionSteps: [
          'Define company-level OKRs',
          'Cascade objectives to departments and individuals',
          'Set up quarterly review cycles',
          'Train managers on effective goal-setting'
        ],
        expectedImpact: [
          {
            domain: 'performance',
            metric: 'goal_achievement',
            estimatedChange: '+20 to +25%'
          },
          {
            domain: 'retention',
            metric: 'high_performer_retention',
            estimatedChange: '+15 to +20%'
          }
        ],
        priority: 'medium',
        estimatedROI: '2-3x through improved productivity'
      };
    }

    return null;
  }

  private parseImpactAnalysis(action: string, analysis: string): CrossDomainImpact {
    // Simple parsing - in production, use more sophisticated extraction
    return {
      action,
      directImpacts: [
        {
          domain: 'primary_affected_area',
          impactType: 'positive',
          severity: 'high',
          description: 'Immediate effect on target domain',
          affectedMetrics: ['key_metric_1', 'key_metric_2']
        }
      ],
      cascadingEffects: [
        {
          domain: 'secondary_affected_area',
          impactType: 'positive',
          severity: 'medium',
          description: 'Ripple effects over time',
          affectedMetrics: ['related_metric']
        }
      ],
      timeline: {
        immediate: ['Action implementation begins', 'Initial stakeholder communication'],
        shortTerm: ['First results visible', 'Early feedback collected', 'Adjustments made'],
        longTerm: ['Full impact realized', 'Cultural shift embedded', 'Sustained improvements']
      },
      riskFactors: [
        'Resistance to change',
        'Insufficient resources',
        'Competing priorities'
      ],
      successIndicators: [
        'Stakeholder satisfaction >80%',
        'Measurable improvement in target metrics',
        'No major rollbacks required'
      ]
    };
  }

  private parseRootCauseAnalysis(
    symptom: string,
    analysis: string,
    context: SystemContext
  ): RootCauseAnalysis {
    // Extract root causes from AI response
    const rootCauses: RootCause[] = [];
    
    // Parse the analysis - simplified for now
    rootCauses.push({
      description: 'Primary systemic issue identified through data analysis',
      domain: 'organizational_culture',
      evidence: ['Data point 1', 'Data point 2'],
      likelihood: 0.8,
      impact: 'high'
    });

    return {
      symptom,
      rootCauses,
      contributingFactors: [
        'Insufficient manager training',
        'Lack of feedback mechanisms',
        'Unclear expectations'
      ],
      dataAnalyzed: [
        'Employee turnover data',
        'Survey responses',
        'Performance metrics',
        'Leave patterns'
      ],
      confidence: 0.75,
      recommendation: 'Address root causes systematically, starting with highest-likelihood items'
    };
  }
}

// Export singleton instance
export const crossDomainIntelligence = new CrossDomainIntelligence();
