/**
 * Proactive Notification Engine
 * Generates intelligent alerts and daily digests without user prompting
 * Phase 2 Enhancement - Proactive intelligence delivery system
 */

import { prisma } from "@/lib/prisma";
import { getSystemContext, type SystemContext } from "./system-context";
import { proactiveIntelligence } from "./proactive-intelligence";
import { crossDomainIntelligence } from "./cross-domain-intelligence";
import { hrKnowledgeBase } from "./knowledge-base";

// ==================== TYPES ====================

export interface ProactiveNotification {
  id: string;
  type: 'health_alert' | 'risk_warning' | 'opportunity' | 'recommendation' | 'milestone' | 'deadline';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  actions?: NotificationAction[];
  expiresAt?: Date;
  createdAt: Date;
  metadata?: any;
}

export interface NotificationAction {
  label: string;
  actionType: string;
  parameters?: any;
  primary?: boolean;
}

export interface DailyDigest {
  date: Date;
  summary: string;
  notifications: ProactiveNotification[];
  insights: string[];
  metrics: DigestMetrics;
  recommendations: string[];
}

interface DigestMetrics {
  totalEmployees: number;
  activeWorkflows: number;
  criticalAlerts: number;
  opportunitiesFound: number;
  healthScore: number;
}

// ==================== IN-MEMORY NOTIFICATION STORE ====================

const notificationsByUser = new Map<string, ProactiveNotification[]>();
const notificationsByCompany = new Map<string, ProactiveNotification[]>();

function getNotificationKey(userId: string, companyId: string): string {
  return `${userId}-${companyId}`;
}

// ==================== NOTIFICATION ENGINE ====================

export class NotificationEngine {
  /**
   * Generate daily digest for company
   */
  async generateDailyDigest(companyId: string): Promise<DailyDigest> {
    console.log('[Notification Engine] Generating daily digest for company:', companyId);

    const systemContext = await getSystemContext(companyId);
    const notifications: ProactiveNotification[] = [];

    // Run health check
    const healthCheck = await proactiveIntelligence.runHealthCheck(companyId);
    
    // Add health alerts if critical
    if (healthCheck.status === 'critical' || healthCheck.status === 'needs_attention') {
      notifications.push({
        id: `health-alert-${Date.now()}`,
        type: 'health_alert',
        priority: healthCheck.status === 'critical' ? 'critical' : 'high',
        title: `System Health: ${healthCheck.status.toUpperCase()}`,
        message: healthCheck.summary,
        actionable: true,
        actions: [
          {
            label: 'View Details',
            actionType: 'run_health_check',
            primary: true
          }
        ],
        createdAt: new Date(),
        metadata: { score: healthCheck.overallScore }
      });
    }

    // Check for anomalies
    const anomalies = healthCheck.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    for (const anomaly of anomalies.slice(0, 3)) {
      notifications.push({
        id: `anomaly-${anomaly.id}-${Date.now()}`,
        type: 'health_alert',
        priority: anomaly.severity === 'critical' ? 'critical' : 'high',
        title: anomaly.description,
        message: `Detected: ${anomaly.description}. ${anomaly.possibleCauses.slice(0, 2).join(', ')}`,
        actionable: true,
        actions: anomaly.recommendations.slice(0, 2).map(rec => ({
          label: rec,
          actionType: 'custom_action'
        })),
        createdAt: new Date(),
        metadata: { deviation: anomaly.deviation }
      });
    }

    // Check for compliance issues
    const complianceInsights = await hrKnowledgeBase.checkCompliance(companyId);
    const criticalCompliance = complianceInsights.filter(i => i.priority === 'critical');
    
    for (const issue of criticalCompliance.slice(0, 2)) {
      notifications.push({
        id: `compliance-${Date.now()}`,
        type: 'risk_warning',
        priority: 'critical',
        title: issue.title,
        message: issue.description,
        actionable: true,
        actions: [
          {
            label: issue.recommendation,
            actionType: 'compliance_sweep',
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }

    // Check for deadlines/expirations
    await this.addDeadlineNotifications(companyId, systemContext, notifications);

    // Check for opportunities
    await this.addOpportunityNotifications(companyId, systemContext, notifications);

    // Generate summary
    const summary = this.generateDigestSummary(healthCheck, notifications, systemContext);

    // Extract top insights
    const insights = [
      ...healthCheck.insights.slice(0, 3).map(i => i.description),
      ...healthCheck.recommendations.slice(0, 2).map(r => r.title)
    ];

    return {
      date: new Date(),
      summary,
      notifications,
      insights,
      metrics: {
        totalEmployees: systemContext.employees.active,
        activeWorkflows: systemContext.workflows.active,
        criticalAlerts: notifications.filter(n => n.priority === 'critical').length,
        opportunitiesFound: notifications.filter(n => n.type === 'opportunity').length,
        healthScore: healthCheck.overallScore
      },
      recommendations: healthCheck.recommendations.slice(0, 5).map(r => r.title)
    };
  }

  /**
   * Check for alert-worthy events (run frequently)
   */
  async checkForAlerts(companyId: string): Promise<ProactiveNotification[]> {
    console.log('[Notification Engine] Checking for alerts');

    const systemContext = await getSystemContext(companyId);
    const alerts: ProactiveNotification[] = [];

    // Critical: Workflow failures
    if (systemContext.workflows.failed24h > 5) {
      alerts.push({
        id: `workflow-failures-${Date.now()}`,
        type: 'health_alert',
        priority: 'critical',
        title: 'Multiple Workflow Failures Detected',
        message: `${systemContext.workflows.failed24h} workflows have failed in the last 24 hours. This requires immediate attention.`,
        actionable: true,
        actions: [
          {
            label: 'View Error Logs',
            actionType: 'view_workflow_errors',
            primary: true
          },
          {
            label: 'Check Integrations',
            actionType: 'check_integrations'
          }
        ],
        createdAt: new Date()
      });
    }

    // Critical: Missing compliance data
    if (systemContext.employees.withoutIRD > systemContext.employees.active * 0.1) {
      alerts.push({
        id: `compliance-ird-${Date.now()}`,
        type: 'risk_warning',
        priority: 'critical',
        title: 'Compliance Risk: Missing IRD Numbers',
        message: `${systemContext.employees.withoutIRD} employees are missing IRD numbers. This blocks payroll processing.`,
        actionable: true,
        actions: [
          {
            label: 'Run Compliance Sweep',
            actionType: 'compliance_sweep',
            parameters: { field: 'ird' },
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }

    // High: Contract expirations within 7 days
    if (systemContext.employees.contractsExpiringSoon > 0) {
      const urgentContracts = await prisma.employee.count({
        where: {
          companyId,
          isActive: true,
          contractEndDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date()
          }
        }
      });

      if (urgentContracts > 0) {
        alerts.push({
          id: `contracts-urgent-${Date.now()}`,
          type: 'deadline',
          priority: 'high',
          title: 'Urgent: Contracts Expiring Within 7 Days',
          message: `${urgentContracts} employee contract(s) expire in the next 7 days. Immediate action required.`,
          actionable: true,
          actions: [
            {
              label: 'View Expiring Contracts',
              actionType: 'query_data',
              parameters: { query: 'contracts expiring soon' },
              primary: true
            },
            {
              label: 'Start Renewal Process',
              actionType: 'create_workflow'
            }
          ],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        });
      }
    }

    // High: Action items piling up
    if (systemContext.actionItems.overdue > 10) {
      alerts.push({
        id: `action-items-overdue-${Date.now()}`,
        type: 'health_alert',
        priority: 'high',
        title: 'Action Items Backlog Growing',
        message: `${systemContext.actionItems.overdue} action items are overdue. This may indicate blocked work or capacity issues.`,
        actionable: true,
        actions: [
          {
            label: 'Review Overdue Items',
            actionType: 'action_items_filter',
            parameters: { status: 'overdue' },
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    companyId: string,
    notification: ProactiveNotification
  ): Promise<void> {
    console.log('[Notification Engine] Scheduling notification:', notification.title);

    // Store notification
    const existing = notificationsByCompany.get(companyId) || [];
    existing.push(notification);
    notificationsByCompany.set(companyId, existing);

    // In production, this would be stored in database with scheduled delivery time
    console.log(`[Notification Engine] Notification scheduled for company ${companyId}`);
  }

  /**
   * Get pending notifications for user
   */
  async getPendingNotifications(
    userId: string,
    companyId: string
  ): Promise<ProactiveNotification[]> {
    console.log('[Notification Engine] Getting pending notifications');

    // Get company-wide notifications
    const companyNotifications = notificationsByCompany.get(companyId) || [];

    // Get user-specific notifications
    const key = getNotificationKey(userId, companyId);
    const userNotifications = notificationsByUser.get(key) || [];

    // Combine and filter out expired
    const allNotifications = [...companyNotifications, ...userNotifications];
    const now = new Date();
    
    return allNotifications.filter(n => 
      !n.expiresAt || n.expiresAt > now
    ).sort((a, b) => {
      // Sort by priority then date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(
    userId: string,
    companyId: string,
    notificationId: string
  ): Promise<void> {
    console.log('[Notification Engine] Dismissing notification:', notificationId);

    // Remove from user notifications
    const userKey = getNotificationKey(userId, companyId);
    const userNotifications = notificationsByUser.get(userKey) || [];
    notificationsByUser.set(
      userKey,
      userNotifications.filter(n => n.id !== notificationId)
    );

    // Remove from company notifications
    const companyNotifications = notificationsByCompany.get(companyId) || [];
    notificationsByCompany.set(
      companyId,
      companyNotifications.filter(n => n.id !== notificationId)
    );
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async addDeadlineNotifications(
    companyId: string,
    context: SystemContext,
    notifications: ProactiveNotification[]
  ): Promise<void> {
    // Contract expirations
    if (context.employees.contractsExpiringSoon > 0) {
      notifications.push({
        id: `deadline-contracts-${Date.now()}`,
        type: 'deadline',
        priority: 'medium',
        title: 'Contract Renewals Due Soon',
        message: `${context.employees.contractsExpiringSoon} employee contract(s) expiring in next 60 days`,
        actionable: true,
        actions: [
          {
            label: 'View Contracts',
            actionType: 'query_data',
            parameters: { query: 'expiring contracts' },
            primary: true
          }
        ],
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });
    }

    // Performance reviews upcoming
    if (context.performance.upcomingReviews > 20) {
      notifications.push({
        id: `deadline-reviews-${Date.now()}`,
        type: 'deadline',
        priority: 'medium',
        title: 'Performance Reviews Approaching',
        message: `${context.performance.upcomingReviews} reviews scheduled. Ensure managers are prepared.`,
        actionable: true,
        actions: [
          {
            label: 'View Review Schedule',
            actionType: 'performance_analytics',
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }
  }

  private async addOpportunityNotifications(
    companyId: string,
    context: SystemContext,
    notifications: ProactiveNotification[]
  ): Promise<void> {
    // Opportunity: Automation potential
    if (context.workflows.total < 5 && context.employees.active > 20) {
      notifications.push({
        id: `opportunity-automation-${Date.now()}`,
        type: 'opportunity',
        priority: 'low',
        title: 'Automation Opportunity Detected',
        message: `You could save 10-20 hours per week by automating routine tasks. Start with simple workflows.`,
        actionable: true,
        actions: [
          {
            label: 'Explore Workflows',
            actionType: 'create_workflow',
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }

    // Opportunity: Survey engagement
    if (context.surveys.total < 3 && context.employees.active > 10) {
      notifications.push({
        id: `opportunity-surveys-${Date.now()}`,
        type: 'opportunity',
        priority: 'low',
        title: 'Employee Engagement Opportunity',
        message: `Regular surveys improve retention by 25%. Consider setting up monthly pulse surveys.`,
        actionable: true,
        actions: [
          {
            label: 'Create Survey',
            actionType: 'create_survey',
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }

    // Opportunity: Performance management
    if (context.performance.totalObjectives === 0 && context.employees.active > 5) {
      notifications.push({
        id: `opportunity-performance-${Date.now()}`,
        type: 'opportunity',
        priority: 'medium',
        title: 'Performance Management Opportunity',
        message: `Setting clear objectives improves performance by 20-25%. Start with company-level goals.`,
        actionable: true,
        actions: [
          {
            label: 'Create Objectives',
            actionType: 'create_objective',
            primary: true
          }
        ],
        createdAt: new Date()
      });
    }
  }

  private generateDigestSummary(
    healthCheck: any,
    notifications: ProactiveNotification[],
    context: SystemContext
  ): string {
    const critical = notifications.filter(n => n.priority === 'critical').length;
    const high = notifications.filter(n => n.priority === 'high').length;
    const opportunities = notifications.filter(n => n.type === 'opportunity').length;

    let summary = `Daily HR System Digest - ${new Date().toLocaleDateString()}\n\n`;
    summary += `Overall Health: ${healthCheck.status.toUpperCase()} (${healthCheck.overallScore}/100)\n`;
    summary += `Active Employees: ${context.employees.active}\n`;
    summary += `Active Workflows: ${context.workflows.active}\n\n`;

    if (critical > 0) {
      summary += `⚠️ ${critical} critical alert${critical > 1 ? 's' : ''} requiring immediate attention\n`;
    }
    if (high > 0) {
      summary += `📌 ${high} high-priority issue${high > 1 ? 's' : ''} to address\n`;
    }
    if (opportunities > 0) {
      summary += `💡 ${opportunities} improvement opportunit${opportunities > 1 ? 'ies' : 'y'} identified\n`;
    }

    return summary;
  }
}

// Export singleton instance
export const notificationEngine = new NotificationEngine();
