/**
 * HR Knowledge Base System
 * Provides domain expertise, compliance rules, best practices, and benchmarks
 * Enhances AI with professional HR knowledge beyond simple data queries
 */

import { openai, AI_CONFIG } from "./openai-client";
import { prisma } from "@/lib/prisma";

// ==================== TYPES ====================

export interface ComplianceRule {
  id: string;
  category: 'employment_law' | 'privacy' | 'safety' | 'leave' | 'payroll' | 'contracts';
  title: string;
  description: string;
  jurisdiction: 'NZ' | 'AU' | 'UK' | 'US' | 'GLOBAL';
  severity: 'critical' | 'high' | 'medium' | 'low';
  requirements: string[];
  consequences: string;
  resources: string[];
}

export interface IndustryBenchmark {
  metric: string;
  industry: string;
  value: number;
  unit: string;
  source: string;
  lastUpdated: Date;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

export interface BestPractice {
  id: string;
  category: 'recruitment' | 'onboarding' | 'retention' | 'performance' | 'development' | 'offboarding';
  title: string;
  description: string;
  whenToUse: string;
  steps: string[];
  benefits: string[];
  pitfalls: string[];
  examples: string[];
}

export interface HRInsight {
  type: 'benchmark_comparison' | 'compliance_check' | 'best_practice' | 'risk_alert' | 'optimization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  data?: any;
}

// ==================== KNOWLEDGE BASE ====================

/**
 * New Zealand Employment Law Compliance Rules
 */
const NZ_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'nz-minimum-wage',
    category: 'employment_law',
    title: 'Minimum Wage Requirements',
    description: 'All employees must be paid at least the legal minimum wage',
    jurisdiction: 'NZ',
    severity: 'critical',
    requirements: [
      'Adult minimum wage: $23.15/hour (as of April 2024)',
      'Starting-out and training minimum wage: $18.52/hour',
      'Must review annually when rates change'
    ],
    consequences: 'Fines up to $20,000, back-pay requirements, reputational damage',
    resources: ['https://www.employment.govt.nz/hours-and-wages/pay/minimum-wage/']
  },
  {
    id: 'nz-holidays-act',
    category: 'leave',
    title: 'Holidays Act 2003 Compliance',
    description: 'Minimum leave entitlements for all employees',
    jurisdiction: 'NZ',
    severity: 'critical',
    requirements: [
      '4 weeks annual leave after 12 months employment',
      '11 public holidays per year',
      'Sick leave: 10 days per year after 6 months',
      'Bereavement leave: 3 days per instance',
      'Leave must be paid at relevant daily pay or average daily pay'
    ],
    consequences: 'Significant penalties, arrears payments, legal action',
    resources: ['https://www.employment.govt.nz/leave-and-holidays/']
  },
  {
    id: 'nz-employment-agreement',
    category: 'contracts',
    title: 'Employment Agreement Requirements',
    description: 'All employees must have a written employment agreement',
    jurisdiction: 'NZ',
    severity: 'critical',
    requirements: [
      'Must be in writing and signed',
      'Must include: names, description of work, hours, place of work, wages, leave provisions',
      'Must be provided before work starts or ASAP after',
      'Plain language requirement'
    ],
    consequences: 'Fines, penalties, employee claims',
    resources: ['https://www.employment.govt.nz/starting-employment/employment-agreements/']
  },
  {
    id: 'nz-privacy-act',
    category: 'privacy',
    title: 'Privacy Act 2020 Compliance',
    description: 'Protection of employee personal information',
    jurisdiction: 'NZ',
    severity: 'high',
    requirements: [
      'Only collect necessary information',
      'Store securely and protect from unauthorized access',
      'Allow employees to access and correct their information',
      'Have clear privacy policies',
      'Report privacy breaches within 72 hours'
    ],
    consequences: 'Privacy Commissioner investigation, fines up to $10,000 per breach',
    resources: ['https://www.privacy.org.nz/']
  },
  {
    id: 'nz-health-safety',
    category: 'safety',
    title: 'Health and Safety at Work Act 2015',
    description: 'Employer duty of care for worker safety',
    jurisdiction: 'NZ',
    severity: 'critical',
    requirements: [
      'Provide safe working environment',
      'Identify and manage risks',
      'Provide training and supervision',
      'Have emergency procedures',
      'Consult with workers on safety matters'
    ],
    consequences: 'Fines up to $3M for organizations, criminal charges possible',
    resources: ['https://www.worksafe.govt.nz/']
  }
];

/**
 * Industry Benchmarks for HR Metrics
 */
const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    metric: 'turnover_rate',
    industry: 'technology',
    value: 13.2,
    unit: 'percent_annual',
    source: 'LinkedIn Workforce Report 2024',
    lastUpdated: new Date('2024-01-01'),
    percentiles: { p25: 8, p50: 13.2, p75: 18, p90: 25 }
  },
  {
    metric: 'time_to_hire',
    industry: 'technology',
    value: 36,
    unit: 'days',
    source: 'Glassdoor Recruiting Report 2024',
    lastUpdated: new Date('2024-01-01'),
    percentiles: { p25: 25, p50: 36, p75: 45, p90: 60 }
  },
  {
    metric: 'employee_engagement',
    industry: 'general',
    value: 7.2,
    unit: 'score_out_of_10',
    source: 'Gallup State of the Workplace 2024',
    lastUpdated: new Date('2024-01-01'),
    percentiles: { p25: 6.0, p50: 7.2, p75: 8.0, p90: 8.5 }
  },
  {
    metric: 'eNPS',
    industry: 'general',
    value: 32,
    unit: 'score',
    source: 'Delighted eNPS Benchmarks 2024',
    lastUpdated: new Date('2024-01-01'),
    percentiles: { p25: 10, p50: 32, p75: 50, p90: 70 }
  },
  {
    metric: 'training_hours_per_employee',
    industry: 'general',
    value: 40,
    unit: 'hours_annual',
    source: 'LinkedIn Learning Report 2024',
    lastUpdated: new Date('2024-01-01'),
    percentiles: { p25: 20, p50: 40, p75: 60, p90: 80 }
  }
];

/**
 * HR Best Practices Library
 */
const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'onboarding-90-day',
    category: 'onboarding',
    title: '90-Day Structured Onboarding',
    description: 'Comprehensive onboarding program spanning first 90 days',
    whenToUse: 'For all new hires, especially critical or senior roles',
    steps: [
      'Day 1: Welcome, setup, team introductions',
      'Week 1: Role training, systems access, initial projects',
      'Week 4: First check-in, feedback session, adjust plan',
      'Day 60: Skills assessment, performance review',
      'Day 90: Final review, set future objectives'
    ],
    benefits: [
      '50% higher retention in first year',
      'Faster time to productivity (avg 30% faster)',
      'Better cultural integration',
      'Clearer performance expectations'
    ],
    pitfalls: [
      'Information overload in first week',
      'Lack of manager involvement',
      'No clear success metrics',
      'Generic program not tailored to role'
    ],
    examples: [
      'Google\'s "Noogler" program',
      'HubSpot\'s gradual responsibility ramp',
      'Atlassian\'s buddy system + structured learning'
    ]
  },
  {
    id: 'stay-interviews',
    category: 'retention',
    title: 'Regular Stay Interviews',
    description: 'Proactive conversations to understand what keeps employees engaged',
    whenToUse: 'Quarterly or bi-annually for all employees',
    steps: [
      'Schedule 30-45 minute one-on-one',
      'Ask: What keeps you here? What might make you leave?',
      'Discuss career aspirations and growth opportunities',
      'Identify pain points before they become exit reasons',
      'Document and take action on feedback'
    ],
    benefits: [
      'Early warning system for turnover risk',
      'Shows employees they\'re valued',
      'Actionable insights for improvement',
      'Cheaper than exit interviews'
    ],
    pitfalls: [
      'Not acting on feedback (destroys trust)',
      'Making it feel like performance review',
      'Asking questions but not listening',
      'No follow-up or visible changes'
    ],
    examples: [
      'Netflix culture of open feedback',
      'Salesforce quarterly career conversations',
      'Buffer\'s transparent retention strategy'
    ]
  },
  {
    id: 'continuous-feedback',
    category: 'performance',
    title: 'Continuous Performance Feedback',
    description: 'Replace annual reviews with ongoing feedback loops',
    whenToUse: 'For all employees, especially in fast-paced environments',
    steps: [
      'Weekly or bi-weekly check-ins (15-30 min)',
      'Focus on recent work, not historical events',
      'Use specific examples and data',
      'Two-way feedback (manager and employee)',
      'Document in real-time, not at year-end'
    ],
    benefits: [
      'More accurate performance assessment',
      'Faster course correction',
      'Reduces recency bias in reviews',
      'Builds stronger manager-employee relationships'
    ],
    pitfalls: [
      'Becoming micromanagement',
      'Inconsistent application across teams',
      'Feedback fatigue',
      'Not training managers on effective feedback'
    ],
    examples: [
      'Adobe\'s "Check-in" system',
      'Deloitte\'s performance snapshot',
      'GE\'s FastWorks approach'
    ]
  }
];

// ==================== KNOWLEDGE BASE CLASS ====================

export class HRKnowledgeBase {
  /**
   * Get compliance rules relevant to company context
   */
  async getRelevantComplianceRules(
    companyId: string,
    context?: { area?: string; severity?: string }
  ): Promise<ComplianceRule[]> {
    // Get company jurisdiction (default to NZ for now)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { country: true }
    });

    const jurisdiction = company?.country === 'New Zealand' ? 'NZ' : 'GLOBAL';

    let rules = NZ_COMPLIANCE_RULES.filter(
      rule => rule.jurisdiction === jurisdiction || rule.jurisdiction === 'GLOBAL'
    );

    if (context?.area) {
      rules = rules.filter(rule => rule.category === context.area);
    }

    if (context?.severity) {
      rules = rules.filter(rule => rule.severity === context.severity);
    }

    return rules;
  }

  /**
   * Check compliance against current system data
   */
  async checkCompliance(companyId: string): Promise<HRInsight[]> {
    const insights: HRInsight[] = [];

    // Check minimum wage compliance
    const lowPaidEmployees = await prisma.employee.count({
      where: {
        companyId,
        isActive: true,
        OR: [
          { hourlyRate: { lt: 23.15 } },
          { salaryAmount: { lt: 48150 } } // ~$23.15/hr annual
        ]
      }
    });

    if (lowPaidEmployees > 0) {
      insights.push({
        type: 'compliance_check',
        priority: 'critical',
        title: '⚠️ Minimum Wage Compliance Risk',
        description: `${lowPaidEmployees} employee(s) may be below NZ minimum wage ($23.15/hr)`,
        recommendation: 'Review and adjust salaries immediately to ensure compliance',
        impact: 'Legal penalties up to $20,000, back-pay requirements, reputational damage',
        effort: 'medium',
        data: { count: lowPaidEmployees, minimumWage: 23.15 }
      });
    }

    // Check employment agreement compliance
    const employeesWithoutContracts = await prisma.employee.count({
      where: {
        companyId,
        isActive: true,
        contractType: null
      }
    });

    if (employeesWithoutContracts > 0) {
      insights.push({
        type: 'compliance_check',
        priority: 'high',
        title: '📄 Missing Employment Agreements',
        description: `${employeesWithoutContracts} employee(s) don't have contract type recorded`,
        recommendation: 'Ensure all employees have written employment agreements on file',
        impact: 'Non-compliance with Employment Relations Act 2000',
        effort: 'low',
        data: { count: employeesWithoutContracts }
      });
    }

    // Check leave entitlement setup
    const employeesWithoutLeave = await prisma.employee.count({
      where: {
        companyId,
        isActive: true,
        LeaveEntitlements: { none: {} }
      }
    });

    if (employeesWithoutLeave > 0) {
      insights.push({
        type: 'compliance_check',
        priority: 'high',
        title: '🏖️ Leave Entitlements Not Configured',
        description: `${employeesWithoutLeave} employee(s) don't have leave entitlements set up`,
        recommendation: 'Configure annual leave, sick leave, and public holiday entitlements',
        impact: 'Risk of non-compliance with Holidays Act 2003',
        effort: 'medium',
        data: { count: employeesWithoutLeave }
      });
    }

    return insights;
  }

  /**
   * Get industry benchmarks for comparison
   */
  getBenchmark(metric: string, industry?: string): IndustryBenchmark | null {
    return INDUSTRY_BENCHMARKS.find(
      b => b.metric === metric && (!industry || b.industry === industry)
    ) || null;
  }

  /**
   * Compare company metrics to industry benchmarks
   */
  async compareToBenchmarks(
    companyId: string,
    metrics: { metric: string; value: number }[]
  ): Promise<HRInsight[]> {
    const insights: HRInsight[] = [];

    for (const { metric, value } of metrics) {
      const benchmark = this.getBenchmark(metric);
      if (!benchmark) continue;

      const percentile = this.calculatePercentile(value, benchmark);
      const difference = ((value - benchmark.value) / benchmark.value) * 100;

      if (metric === 'turnover_rate' && percentile > 75) {
        insights.push({
          type: 'benchmark_comparison',
          priority: 'high',
          title: '📊 Turnover Rate Above Industry Average',
          description: `Your turnover rate (${value.toFixed(1)}%) is in the ${percentile}th percentile (industry avg: ${benchmark.value}%)`,
          recommendation: 'Investigate root causes: conduct exit interviews, review compensation, assess management quality',
          impact: `High turnover costs 1.5-2x annual salary per departure. Potential savings: significant`,
          effort: 'high',
          data: { value, benchmark: benchmark.value, percentile, difference }
        });
      }

      if (metric === 'employee_engagement' && percentile < 25) {
        insights.push({
          type: 'benchmark_comparison',
          priority: 'high',
          title: '📉 Employee Engagement Below Average',
          description: `Your engagement score (${value.toFixed(1)}/10) is below industry average (${benchmark.value}/10)`,
          recommendation: 'Run pulse surveys, improve manager training, focus on career development and recognition',
          impact: 'Low engagement correlates with lower productivity, higher turnover, and reduced profitability',
          effort: 'medium',
          data: { value, benchmark: benchmark.value, percentile }
        });
      }
    }

    return insights;
  }

  /**
   * Get best practices recommendations
   */
  getBestPractice(category: BestPractice['category'], id?: string): BestPractice[] {
    if (id) {
      const practice = BEST_PRACTICES.find(p => p.id === id);
      return practice ? [practice] : [];
    }
    return BEST_PRACTICES.filter(p => p.category === category);
  }

  /**
   * Get contextual HR advice using AI + knowledge base
   */
  async getHRAdvice(
    question: string,
    companyContext: any
  ): Promise<string> {
    // Gather relevant knowledge
    const complianceRules = await this.getRelevantComplianceRules(companyContext.companyId);
    const complianceInsights = await this.checkCompliance(companyContext.companyId);

    const knowledgeContext = `
HR COMPLIANCE RULES:
${complianceRules.map(r => `- ${r.title}: ${r.description}`).join('\n')}

CURRENT COMPLIANCE STATUS:
${complianceInsights.map(i => `- ${i.title}: ${i.description}`).join('\n')}

BEST PRACTICES AVAILABLE:
${BEST_PRACTICES.map(p => `- ${p.title} (${p.category}): ${p.description}`).join('\n')}
    `;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are an expert HR advisor with deep knowledge of New Zealand employment law, industry best practices, and people management.

KNOWLEDGE BASE:
${knowledgeContext}

Provide professional, accurate HR advice citing specific compliance rules, benchmarks, or best practices when relevant.
Be practical and actionable. If there are compliance risks, clearly state them.`
        },
        {
          role: 'user',
          content: question
        }
      ]
    });

    return completion.choices[0].message.content || 'I need more information to provide accurate advice.';
  }

  /**
   * Calculate percentile rank for a value
   */
  private calculatePercentile(value: number, benchmark: IndustryBenchmark): number {
    const { p25, p50, p75, p90 } = benchmark.percentiles;

    if (value <= p25) return 25;
    if (value <= p50) return 25 + ((value - p25) / (p50 - p25)) * 25;
    if (value <= p75) return 50 + ((value - p50) / (p75 - p50)) * 25;
    if (value <= p90) return 75 + ((value - p75) / (p90 - p75)) * 15;
    return 90 + Math.min(((value - p90) / p90) * 10, 10);
  }
}

// Export singleton instance
export const hrKnowledgeBase = new HRKnowledgeBase();
