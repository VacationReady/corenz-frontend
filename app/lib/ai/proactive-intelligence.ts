/**
 * Proactive Intelligence Engine
 * Detects anomalies, generates unprompted insights, and provides predictive recommendations
 * Makes the AI truly intelligent by anticipating needs rather than just responding
 */

import { prisma } from "@/lib/prisma";
import { openai, AI_CONFIG } from "./openai-client";
import { hrKnowledgeBase, type HRInsight } from "./knowledge-base";
import { getSystemContext, type SystemContext } from "./system-context";

// ==================== TYPES ====================

export interface Anomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern_break' | 'outlier' | 'trend';
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric: string;
  description: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  detectedAt: Date;
  possibleCauses: string[];
  recommendations: string[];
}

export interface PredictiveInsight {
  type: 'risk_forecast' | 'opportunity' | 'trend_prediction' | 'capacity_planning';
  title: string;
  description: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  preventiveActions?: string[];
  data?: any;
}

export interface ProactiveRecommendation {
  id: string;
  category: 'retention' | 'compliance' | 'performance' | 'cost_optimization' | 'culture' | 'growth';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  actionSteps: string[];
  expectedBenefit: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  roi?: string;
  deadline?: Date;
}

export interface HealthCheckResult {
  overallScore: number; // 0-100
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  areas: {
    compliance: AreaHealth;
    workforce: AreaHealth;
    engagement: AreaHealth;
    operations: AreaHealth;
    growth: AreaHealth;
  };
  anomalies: Anomaly[];
  insights: PredictiveInsight[];
  recommendations: ProactiveRecommendation[];
  summary: string;
}

interface AreaHealth {
  score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  strengths: string[];
}

// ==================== PROACTIVE INTELLIGENCE ENGINE ====================

export class ProactiveIntelligenceEngine {
  /**
   * Run comprehensive health check on HR system
   */
  async runHealthCheck(companyId: string): Promise<HealthCheckResult> {
    console.log('[Proactive Intelligence] Running health check for company:', companyId);

    const systemContext = await getSystemContext(companyId);
    
    // Run all checks in parallel
    const [
      anomalies,
      complianceHealth,
      workforceHealth,
      engagementHealth,
      operationsHealth,
      growthHealth,
      predictiveInsights,
      recommendations
    ] = await Promise.all([
      this.detectAnomalies(companyId, systemContext),
      this.checkComplianceHealth(companyId, systemContext),
      this.checkWorkforceHealth(companyId, systemContext),
      this.checkEngagementHealth(companyId, systemContext),
      this.checkOperationsHealth(companyId, systemContext),
      this.checkGrowthHealth(companyId, systemContext),
      this.generatePredictiveInsights(companyId, systemContext),
      this.generateProactiveRecommendations(companyId, systemContext)
    ]);

    // Calculate overall score
    const overallScore = Math.round(
      (complianceHealth.score * 0.25 +
       workforceHealth.score * 0.25 +
       engagementHealth.score * 0.2 +
       operationsHealth.score * 0.15 +
       growthHealth.score * 0.15)
    );

    const status = this.getHealthStatus(overallScore);

    // Generate AI summary
    const summary = await this.generateHealthSummary({
      overallScore,
      status,
      anomalies,
      insights: predictiveInsights,
      areas: { compliance: complianceHealth, workforce: workforceHealth, engagement: engagementHealth, operations: operationsHealth, growth: growthHealth }
    });

    return {
      overallScore,
      status,
      areas: {
        compliance: complianceHealth,
        workforce: workforceHealth,
        engagement: engagementHealth,
        operations: operationsHealth,
        growth: growthHealth
      },
      anomalies,
      insights: predictiveInsights,
      recommendations,
      summary
    };
  }

  /**
   * Detect anomalies in HR data
   */
  async detectAnomalies(companyId: string, context: SystemContext): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Detect turnover spike
    const recentTerminations = await prisma.employee.count({
      where: {
        companyId,
        isActive: false,
        User: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }
    });

    const monthlyTurnoverRate = (recentTerminations / context.employees.active) * 100;
    const expectedTurnoverRate = 1.5; // ~18% annual = 1.5% monthly

    if (monthlyTurnoverRate > expectedTurnoverRate * 2) {
      anomalies.push({
        id: 'turnover-spike',
        type: 'spike',
        severity: 'high',
        metric: 'turnover_rate',
        description: 'Abnormally high turnover rate detected',
        currentValue: monthlyTurnoverRate,
        expectedValue: expectedTurnoverRate,
        deviation: ((monthlyTurnoverRate - expectedTurnoverRate) / expectedTurnoverRate) * 100,
        detectedAt: new Date(),
        possibleCauses: [
          'Recent organizational changes',
          'Compensation issues',
          'Management problems',
          'Seasonal fluctuation',
          'Market conditions'
        ],
        recommendations: [
          'Conduct urgent exit interviews to identify patterns',
          'Review compensation against market rates',
          'Survey remaining employees for engagement issues',
          'Check for department-specific problems'
        ]
      });
    }

    // Detect leave request spike
    if (context.recentActivity.pendingLeave > context.employees.active * 0.3) {
      anomalies.push({
        id: 'leave-spike',
        type: 'spike',
        severity: 'medium',
        metric: 'pending_leave_requests',
        description: 'Unusually high number of pending leave requests',
        currentValue: context.recentActivity.pendingLeave,
        expectedValue: context.employees.active * 0.1,
        deviation: 200,
        detectedAt: new Date(),
        possibleCauses: [
          'Upcoming holiday period',
          'Leave approval backlog',
          'Manager absence',
          'System/process issues'
        ],
        recommendations: [
          'Fast-track leave approvals to reduce backlog',
          'Check if specific managers are bottleneck',
          'Consider delegating approval authority',
          'Review leave approval workflow efficiency'
        ]
      });
    }

    // Detect workflow failures
    if (context.workflows.failed24h > 5) {
      anomalies.push({
        id: 'workflow-failures',
        type: 'spike',
        severity: 'high',
        metric: 'workflow_failures',
        description: 'Multiple workflow failures detected',
        currentValue: context.workflows.failed24h,
        expectedValue: 1,
        deviation: 400,
        detectedAt: new Date(),
        possibleCauses: [
          'System integration issues',
          'Data quality problems',
          'Configuration errors',
          'External service outages'
        ],
        recommendations: [
          'Review error logs for common patterns',
          'Check external integrations status',
          'Validate workflow configurations',
          'Test with sample data to reproduce issues'
        ]
      });
    }

    // Detect compliance gaps
    if (context.employees.withoutIRD > context.employees.active * 0.1) {
      anomalies.push({
        id: 'compliance-gap',
        type: 'outlier',
        severity: 'critical',
        metric: 'missing_compliance_data',
        description: 'Significant number of employees missing IRD numbers',
        currentValue: context.employees.withoutIRD,
        expectedValue: 0,
        deviation: Infinity,
        detectedAt: new Date(),
        possibleCauses: [
          'Incomplete onboarding process',
          'Recent bulk import without validation',
          'Historical data migration issues',
          'Process not enforced'
        ],
        recommendations: [
          'Run compliance sweep immediately',
          'Update onboarding checklist to require IRD',
          'Send automated reminders to affected employees',
          'Block payroll processing until resolved'
        ]
      });
    }

    return anomalies;
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(companyId: string, context: SystemContext): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Predict contract expirations
    if (context.employees.contractsExpiringSoon > 0) {
      insights.push({
        type: 'risk_forecast',
        title: 'Contract Renewals Required Soon',
        description: `${context.employees.contractsExpiringSoon} employee contract(s) expiring in next 60 days`,
        prediction: `Without action, you risk losing ${context.employees.contractsExpiringSoon} employees or facing employment law issues`,
        confidence: 0.95,
        timeframe: 'next 60 days',
        impact: 'high',
        preventiveActions: [
          'Schedule renewal discussions with affected employees',
          'Review contract terms and update if needed',
          'Prepare offers 30 days before expiry',
          'Have backup plans for key roles'
        ],
        data: { count: context.employees.contractsExpiringSoon }
      });
    }

    // Predict capacity issues
    const newHiresRate = (context.recentActivity.newHires / context.employees.active) * 100;
    if (newHiresRate > 15) {
      insights.push({
        type: 'capacity_planning',
        title: 'Rapid Growth May Strain Resources',
        description: `${context.recentActivity.newHires} new hires in last 30 days (${newHiresRate.toFixed(1)}% growth rate)`,
        prediction: 'Continued high growth rate may overwhelm onboarding capacity and management bandwidth',
        confidence: 0.75,
        timeframe: 'next 3 months',
        impact: 'medium',
        preventiveActions: [
          'Scale onboarding resources proportionally',
          'Consider hiring dedicated onboarding coordinator',
          'Automate more of onboarding process',
          'Adjust manager span of control if needed',
          'Prepare infrastructure for continued growth'
        ],
        data: { newHires: context.recentActivity.newHires, growthRate: newHiresRate }
      });
    }

    // Predict engagement issues based on survey data
    if (context.surveys.avgResponseRate < 50 && context.surveys.active > 0) {
      insights.push({
        type: 'trend_prediction',
        title: 'Low Survey Engagement Indicates Broader Issues',
        description: `Survey response rate at ${context.surveys.avgResponseRate}% (target: 70%+)`,
        prediction: 'Low survey engagement often precedes turnover spikes and productivity drops',
        confidence: 0.7,
        timeframe: 'next 6 months',
        impact: 'medium',
        preventiveActions: [
          'Make surveys shorter and more relevant',
          'Show how previous feedback led to changes',
          'Send from leadership with personal message',
          'Incentivize participation appropriately',
          'Address survey fatigue if over-surveying'
        ],
        data: { responseRate: context.surveys.avgResponseRate, active: context.surveys.active }
      });
    }

    // Predict performance review bottlenecks
    if (context.performance.activeReviewCycles > 0 && context.performance.upcomingReviews > 20) {
      insights.push({
        type: 'risk_forecast',
        title: 'Performance Review Capacity Risk',
        description: `${context.performance.upcomingReviews} reviews upcoming with active cycles`,
        prediction: 'High volume may lead to delayed reviews, rushed feedback, and manager burnout',
        confidence: 0.8,
        timeframe: 'next 30 days',
        impact: 'medium',
        preventiveActions: [
          'Stagger review schedules to spread load',
          'Provide manager training on efficient reviews',
          'Use AI-assisted feedback drafting',
          'Simplify review forms/process',
          'Set clear deadlines with reminders'
        ],
        data: { upcomingReviews: context.performance.upcomingReviews }
      });
    }

    return insights;
  }

  /**
   * Generate proactive recommendations
   */
  async generateProactiveRecommendations(companyId: string, context: SystemContext): Promise<ProactiveRecommendation[]> {
    const recommendations: ProactiveRecommendation[] = [];

    // Get compliance insights from knowledge base
    const complianceInsights = await hrKnowledgeBase.checkCompliance(companyId);
    
    for (const insight of complianceInsights) {
      if (insight.priority === 'critical' || insight.priority === 'high') {
        recommendations.push({
          id: `compliance-${Date.now()}`,
          category: 'compliance',
          priority: insight.priority === 'critical' ? 'urgent' : 'high',
          title: insight.title,
          description: insight.description,
          reasoning: insight.impact,
          actionSteps: [insight.recommendation],
          expectedBenefit: 'Avoid legal penalties, maintain compliance, protect company reputation',
          estimatedEffort: insight.effort,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
        });
      }
    }

    // Recommend automation opportunities
    if (context.workflows.total < 5 && context.employees.active > 20) {
      recommendations.push({
        id: 'automation-opportunity',
        category: 'cost_optimization',
        priority: 'medium',
        title: 'Automate Repetitive HR Tasks',
        description: 'You have few automation workflows set up despite having a sizable workforce',
        reasoning: 'Automation can save 10-20 hours per week on routine tasks like onboarding, reminders, and reporting',
        actionSteps: [
          'Identify top 5 most time-consuming manual tasks',
          'Start with simple automations (birthday wishes, contract expiry alerts)',
          'Build onboarding automation workflow',
          'Set up automatic report generation',
          'Create leave approval reminders'
        ],
        expectedBenefit: '10-20 hours saved per week, reduced errors, better employee experience',
        estimatedEffort: 'medium',
        roi: '300-500% ROI based on time saved'
      });
    }

    // Recommend engagement improvements
    if (context.surveys.total < 3 && context.employees.active > 10) {
      recommendations.push({
        id: 'engagement-measurement',
        category: 'culture',
        priority: 'medium',
        title: 'Implement Regular Engagement Measurement',
        description: 'Limited survey activity detected - missing opportunity to gauge employee sentiment',
        reasoning: 'Companies with regular engagement measurement have 25% lower turnover and higher productivity',
        actionSteps: [
          'Set up monthly pulse surveys (2-3 questions)',
          'Run quarterly eNPS to track loyalty',
          'Annual comprehensive engagement survey',
          'Act on feedback and communicate changes',
          'Track trends over time'
        ],
        expectedBenefit: 'Early warning system for issues, data-driven culture improvements, higher retention',
        estimatedEffort: 'low'
      });
    }

    // Recommend performance management improvements
    if (context.performance.totalObjectives === 0 && context.employees.active > 5) {
      recommendations.push({
        id: 'performance-framework',
        category: 'performance',
        priority: 'high',
        title: 'Establish Performance Management Framework',
        description: 'No objectives tracked in system - missing critical performance visibility',
        reasoning: 'Clear objectives improve performance by 20-25% and provide alignment with company goals',
        actionSteps: [
          'Define company-level objectives first',
          'Cascade to department and individual level',
          'Train managers on OKR/goal-setting methodology',
          'Set up quarterly review cycles',
          'Use system to track progress and check-ins'
        ],
        expectedBenefit: 'Better alignment, clearer expectations, higher performance, easier promotion decisions',
        estimatedEffort: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Check compliance health
   */
  private async checkComplianceHealth(companyId: string, context: SystemContext): Promise<AreaHealth> {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (context.employees.withoutIRD > 0) {
      issues.push(`${context.employees.withoutIRD} employees missing IRD numbers`);
      score -= 20;
    }

    const complianceInsights = await hrKnowledgeBase.checkCompliance(companyId);
    score -= complianceInsights.filter(i => i.priority === 'critical').length * 15;
    score -= complianceInsights.filter(i => i.priority === 'high').length * 10;

    complianceInsights.forEach(insight => {
      if (insight.priority === 'critical' || insight.priority === 'high') {
        issues.push(insight.description);
      }
    });

    if (issues.length === 0) {
      strengths.push('No critical compliance issues detected');
      strengths.push('Employment agreements properly documented');
    }

    return {
      score: Math.max(0, score),
      status: this.getHealthStatus(score),
      issues,
      strengths
    };
  }

  /**
   * Check workforce health
   */
  private async checkWorkforceHealth(companyId: string, context: SystemContext): Promise<AreaHealth> {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    // Check turnover
    const recentTerminations = await prisma.employee.count({
      where: {
        companyId,
        isActive: false,
        User: { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      }
    });
    const monthlyTurnover = (recentTerminations / context.employees.active) * 100;

    if (monthlyTurnover > 3) {
      issues.push(`High turnover rate: ${monthlyTurnover.toFixed(1)}% monthly`);
      score -= 25;
    } else {
      strengths.push('Healthy turnover rate');
    }

    // Check contract expirations
    if (context.employees.contractsExpiringSoon > 0) {
      issues.push(`${context.employees.contractsExpiringSoon} contracts expiring soon`);
      score -= 10;
    }

    // Check growth
    if (context.recentActivity.newHires > 0) {
      strengths.push(`${context.recentActivity.newHires} new hires in last 30 days`);
    }

    return {
      score: Math.max(0, score),
      status: this.getHealthStatus(score),
      issues,
      strengths
    };
  }

  /**
   * Check engagement health
   */
  private async checkEngagementHealth(companyId: string, context: SystemContext): Promise<AreaHealth> {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (context.surveys.active === 0 && context.employees.active > 10) {
      issues.push('No active engagement surveys');
      score -= 30;
    }

    if (context.surveys.avgResponseRate < 50 && context.surveys.active > 0) {
      issues.push(`Low survey response rate: ${context.surveys.avgResponseRate}%`);
      score -= 20;
    } else if (context.surveys.avgResponseRate >= 70) {
      strengths.push(`High survey engagement: ${context.surveys.avgResponseRate}%`);
    }

    if (context.surveys.total > 5) {
      strengths.push(`${context.surveys.total} surveys conducted`);
    }

    return {
      score: Math.max(0, score),
      status: this.getHealthStatus(score),
      issues,
      strengths
    };
  }

  /**
   * Check operations health
   */
  private async checkOperationsHealth(companyId: string, context: SystemContext): Promise<AreaHealth> {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (context.workflows.failed24h > 5) {
      issues.push(`${context.workflows.failed24h} workflow failures in last 24 hours`);
      score -= 30;
    } else if (context.workflows.failed24h === 0) {
      strengths.push('All workflows running smoothly');
    }

    if (context.recentActivity.pendingLeave > context.employees.active * 0.2) {
      issues.push(`High leave approval backlog: ${context.recentActivity.pendingLeave} pending`);
      score -= 15;
    }

    if (context.workflows.active > 5) {
      strengths.push(`${context.workflows.active} automation workflows active`);
    }

    if (context.actionItems.overdue > context.actionItems.totalPending * 0.3) {
      issues.push(`${context.actionItems.overdue} action items overdue`);
      score -= 20;
    }

    return {
      score: Math.max(0, score),
      status: this.getHealthStatus(score),
      issues,
      strengths
    };
  }

  /**
   * Check growth health
   */
  private async checkGrowthHealth(companyId: string, context: SystemContext): Promise<AreaHealth> {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    if (context.performance.totalObjectives === 0 && context.employees.active > 5) {
      issues.push('No performance objectives set');
      score -= 25;
    }

    if (context.performance.activeObjectives > 0) {
      strengths.push(`${context.performance.activeObjectives} active objectives being tracked`);
    }

    if (context.performance.upcomingMeetings > 0) {
      strengths.push(`${context.performance.upcomingMeetings} 1-on-1s scheduled`);
    }

    if (context.journeys.total === 0 && context.employees.active > 10) {
      issues.push('No employee journey templates created');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      status: this.getHealthStatus(score),
      issues,
      strengths
    };
  }

  /**
   * Generate health summary using AI
   */
  private async generateHealthSummary(healthData: Partial<HealthCheckResult>): Promise<string> {
    const prompt = `Generate a concise, actionable health check summary for an HR system.

Overall Score: ${healthData.overallScore}/100 (${healthData.status})

Key Issues:
${healthData.anomalies?.slice(0, 3).map(a => `- ${a.description}`).join('\n') || 'None'}

Areas Needing Attention:
${Object.entries(healthData.areas || {})
  .filter(([_, area]) => area.status === 'needs_attention' || area.status === 'critical')
  .map(([name, area]) => `- ${name}: ${area.issues.join(', ')}`)
  .join('\n') || 'All areas healthy'}

Generate a 2-3 sentence executive summary that:
1. States overall health status
2. Highlights most critical issue(s)
3. Provides one key action to take

Be direct and actionable.`;

    try {
      if (!openai) {
        throw new Error("OpenAI client not initialized");
      }

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        temperature: 0.5,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: 'You are an HR analytics expert providing executive summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return completion.choices[0].message.content || 'Health check completed. Review detailed metrics for insights.';
    } catch (error) {
      console.error('[Proactive Intelligence] Error generating summary:', error);
      return `System health: ${healthData.status}. Score: ${healthData.overallScore}/100. ${healthData.anomalies?.length || 0} issues detected requiring attention.`;
    }
  }

  /**
   * Get health status from score
   */
  private getHealthStatus(score: number): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs_attention';
    return 'critical';
  }
}

// Export singleton instance
export const proactiveIntelligence = new ProactiveIntelligenceEngine();
