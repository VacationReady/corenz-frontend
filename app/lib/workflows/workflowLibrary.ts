/**
 * Enterprise Workflow Library
 * 40 pre-built, executable HR workflows organized by category
 * Tailored for New Zealand employment law and best practices
 */

import { Node, Edge } from "reactflow";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  tags: string[];
  icon: string;
  isPremium?: boolean;
  isPopular?: boolean;
  usageCount?: number;
  estimatedTime?: string; // Time saved per execution
  nodes: Node[];
  edges: Edge[];
  config: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    alertOnFailure?: boolean;
    requiresApproval?: boolean;
    customizable?: string[]; // Fields that can be customized
  };
  benefits: string[];
  requirements?: string[];
}

export interface WorkflowCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export const workflowCategories: WorkflowCategory[] = [
  {
    id: "onboarding-probation",
    name: "Onboarding & Probation",
    description: "Streamline new employee experiences and probation management",
    icon: "🚀",
    color: "blue",
    order: 1,
  },
  {
    id: "leave-time",
    name: "Leave & Time Management",
    description: "Automate leave requests, approvals, and balance tracking",
    icon: "🏖️",
    color: "green",
    order: 2,
  },
  {
    id: "performance-development",
    name: "Performance & Development",
    description: "Performance reviews, training, and career development",
    icon: "📈",
    color: "purple",
    order: 3,
  },
  {
    id: "compliance-documentation",
    name: "Compliance & Documentation",
    description: "Stay compliant with NZ employment law and documentation",
    icon: "📋",
    color: "amber",
    order: 4,
  },
  {
    id: "offboarding-transitions",
    name: "Offboarding & Transitions",
    description: "Smooth employee exits and role transitions",
    icon: "👋",
    color: "red",
    order: 5,
  },
  {
    id: "engagement-culture",
    name: "Engagement & Culture",
    description: "Build culture and improve employee engagement",
    icon: "🎉",
    color: "pink",
    order: 6,
  },
  {
    id: "health-safety",
    name: "Health & Safety",
    description: "Workplace safety, wellness, and incident management",
    icon: "🏥",
    color: "orange",
    order: 7,
  },
  {
    id: "payroll-benefits",
    name: "Payroll & Benefits",
    description: "Compensation, benefits, and KiwiSaver management",
    icon: "💰",
    color: "emerald",
    order: 8,
  },
];

// Helper function to create standard workflow nodes
function createWorkflowNodes(config: {
  trigger: { type: string; config: any };
  conditions?: Array<{ type: string; config: any }>;
  actions: Array<{ type: string; config: any }>;
  delays?: Array<{ days?: number; hours?: number; position?: number }>;
  branches?: Array<{ type: string; position?: number }>;
}): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yPos = 0;
  let nodeCount = 0;

  // Add trigger node
  nodes.push({
    id: `trigger-${++nodeCount}`,
    type: "trigger",
    position: { x: 250, y: yPos },
    data: {
      label: "Trigger",
      icon: "⚡",
      triggerType: config.trigger.type,
      config: config.trigger.config,
    },
  });
  yPos += 120;

  let lastNodeId = `trigger-${nodeCount}`;

  // Add conditions
  config.conditions?.forEach((condition, index) => {
    const conditionId = `condition-${++nodeCount}`;
    nodes.push({
      id: conditionId,
      type: "condition",
      position: { x: 250, y: yPos },
      data: {
        label: `Condition ${index + 1}`,
        icon: "🔍",
        conditionType: condition.type,
        config: condition.config,
      },
    });
    edges.push({
      id: `edge-${edges.length + 1}`,
      source: lastNodeId,
      target: conditionId,
      animated: true,
    });
    lastNodeId = conditionId;
    yPos += 120;
  });

  // Add delays if specified
  config.delays?.forEach((delay, index) => {
    const position = delay.position ?? index;
    if (position === 0 || position === index) {
      const delayId = `delay-${++nodeCount}`;
      nodes.push({
        id: delayId,
        type: "delay",
        position: { x: 250, y: yPos },
        data: {
          label: `Wait ${delay.days || 0} days`,
          icon: "⏰",
          config: delay,
        },
      });
      edges.push({
        id: `edge-${edges.length + 1}`,
        source: lastNodeId,
        target: delayId,
        animated: true,
      });
      lastNodeId = delayId;
      yPos += 120;
    }
  });

  // Add branches if specified
  config.branches?.forEach((branch) => {
    const branchId = `branch-${++nodeCount}`;
    nodes.push({
      id: branchId,
      type: "branch",
      position: { x: 250, y: yPos },
      data: {
        label: "Branch",
        icon: "🔀",
        config: branch,
      },
    });
    edges.push({
      id: `edge-${edges.length + 1}`,
      source: lastNodeId,
      target: branchId,
      animated: true,
    });
    lastNodeId = branchId;
    yPos += 120;
  });

  // Add actions
  config.actions.forEach((action, index) => {
    const actionId = `action-${++nodeCount}`;
    nodes.push({
      id: actionId,
      type: "action",
      position: { x: 250, y: yPos },
      data: {
        label: `Action ${index + 1}`,
        icon: "✅",
        actionType: action.type,
        config: action.config,
      },
    });
    edges.push({
      id: `edge-${edges.length + 1}`,
      source: lastNodeId,
      target: actionId,
      animated: true,
    });
    
    // For parallel actions, connect from branch
    if (config.branches?.length && index < config.actions.length - 1) {
      // Keep lastNodeId as branch for parallel actions
      if (config.branches[0].type !== 'parallel') {
        lastNodeId = actionId;
      }
    } else {
      lastNodeId = actionId;
    }
    
    if (config.branches?.length && config.branches[0].type === 'parallel') {
      // Spread actions horizontally for parallel branches
      nodes[nodes.length - 1].position = { 
        x: 150 + (index * 200), 
        y: yPos 
      };
    } else {
      yPos += 120;
    }
  });

  return { nodes, edges };
}

export const workflowTemplates: WorkflowTemplate[] = [
  // ============ ONBOARDING & PROBATION (8 workflows) ============
  {
    id: "comprehensive-onboarding",
    name: "Comprehensive New Employee Onboarding",
    description: "Complete 14-day onboarding journey with automated tasks and check-ins",
    category: workflowCategories[0],
    tags: ["onboarding", "new-starter", "essential"],
    icon: "🎯",
    isPopular: true,
    estimatedTime: "4 hours",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: { employmentType: ["PERMANENT", "FIXED_TERM"] },
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Welcome to {{company.name}}! 🎉",
            message: "Welcome aboard! Your onboarding journey starts today.",
          },
        },
        {
          type: "create_task",
          config: {
            title: "Prepare workspace for {{employee.name}}",
            assigneeType: "manager",
            dueDays: 1,
          },
        },
        {
          type: "assign_form",
          config: {
            formId: "employee-details",
            assignTo: "employee",
            dueInDays: 3,
          },
        },
        {
          type: "assign_training",
          config: {
            courseId: "company-induction",
            mandatory: true,
            dueInDays: 7,
          },
        },
      ],
    }),
    config: {
      retryOnFailure: true,
      maxRetries: 3,
      customizable: ["dueDays", "formId", "courseId"],
    },
    benefits: [
      "100% consistent onboarding experience",
      "Reduces time-to-productivity by 40%",
      "Ensures compliance with all requirements",
      "Improves new starter satisfaction",
    ],
    requirements: ["Active onboarding templates", "Training modules configured"],
  },

  {
    id: "buddy-assignment",
    name: "Onboarding Buddy Program",
    description: "Automatically assign and coordinate onboarding buddies",
    category: workflowCategories[0],
    tags: ["onboarding", "mentorship", "culture"],
    icon: "🤝",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      conditions: [
        {
          type: "department",
          config: { operator: "not_equals", value: ["CONTRACTOR"] },
        },
      ],
      actions: [
        {
          type: "auto_assign_buddy",
          config: {
            criteria: "same_department",
            minTenure: 180, // days
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email", "slack"],
            recipientType: "buddy",
            subject: "You're a buddy for {{employee.name}}",
            message: "You've been selected as an onboarding buddy. Meeting invite to follow.",
          },
        },
        {
          type: "create_calendar_event",
          config: {
            title: "Buddy Introduction - {{employee.name}}",
            attendees: ["employee", "buddy"],
            duration: 30,
            withinDays: 2,
          },
        },
      ],
    }),
    config: { customizable: ["minTenure", "criteria"] },
    benefits: [
      "70% faster cultural integration",
      "Reduces early turnover by 25%",
      "Builds stronger team connections",
    ],
  },

  {
    id: "30-60-90-day-reviews",
    name: "30-60-90 Day Review Cycle",
    description: "Automated probation reviews at key milestones",
    category: workflowCategories[0],
    tags: ["probation", "review", "performance"],
    icon: "📊",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_START_DATE",
        config: {},
      },
      delays: [{ days: 25 }],
      actions: [
        {
          type: "send_form",
          config: {
            formId: "30-day-review",
            assignTo: "manager",
            ccEmployee: true,
          },
        },
        {
          type: "create_task",
          config: {
            title: "Schedule 30-day review meeting",
            assigneeType: "manager",
            dueDays: 5,
          },
        },
      ],
    }),
    config: {
      customizable: ["reviewDays", "formId"],
    },
    benefits: [
      "Never miss a probation review",
      "Structured feedback at critical points",
      "Clear documentation for decisions",
    ],
  },

  {
    id: "90-day-trial-nz",
    name: "90-Day Trial Period Management (NZ)",
    description: "Compliant management of New Zealand 90-day trial periods",
    category: workflowCategories[0],
    tags: ["probation", "nz-law", "compliance", "essential"],
    icon: "⚖️",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: { employmentType: ["PERMANENT"] },
      },
      conditions: [
        {
          type: "custom_field",
          config: {
            field: "hasTrial Period",
            operator: "equals",
            value: true,
          },
        },
      ],
      delays: [{ days: 80 }],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "manager",
            subject: "⚠️ 90-Day Trial Ending Soon - {{employee.name}}",
            message: "Trial period ends in 10 days. Decision required by day 89.",
            priority: "HIGH",
          },
        },
        {
          type: "create_approval",
          config: {
            title: "Trial period decision for {{employee.name}}",
            approver: "manager",
            escalateTo: "hr",
            deadlineDays: 8,
          },
        },
      ],
    }),
    config: {
      alertOnFailure: true,
      customizable: ["notificationDays"],
    },
    benefits: [
      "100% compliance with NZ employment law",
      "Never miss critical trial period deadlines",
      "Proper documentation for all decisions",
    ],
  },

  {
    id: "it-equipment-provisioning",
    name: "IT Equipment & Access Provisioning",
    description: "Automated IT setup for new starters",
    category: workflowCategories[0],
    tags: ["onboarding", "it", "equipment"],
    icon: "💻",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      conditions: [
        {
          type: "contractType",
          config: { value: ["PERMANENT", "FIXED_TERM"] },
        },
      ],
      actions: [
        {
          type: "create_task",
          config: {
            title: "Provision laptop and equipment",
            assigneeType: "it_team",
            description: "Standard setup: {{employee.jobRole}}",
            dueDays: -3, // 3 days before start
          },
        },
        {
          type: "create_task",
          config: {
            title: "Create user accounts",
            assigneeType: "it_team",
            description: "Email, Slack, system access per role",
            dueDays: -2,
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Your IT equipment is ready",
            message: "Equipment will be available on your first day.",
            sendBeforeStart: 1,
          },
        },
      ],
    }),
    config: { customizable: ["equipment", "accounts"] },
    benefits: [
      "Day 1 productivity for new starters",
      "Standardized equipment provisioning",
      "Reduced IT support tickets",
    ],
  },

  {
    id: "pre-boarding-engagement",
    name: "Pre-boarding Engagement Campaign",
    description: "Keep new hires engaged between offer acceptance and start date",
    category: workflowCategories[0],
    tags: ["onboarding", "engagement", "retention"],
    icon: "📧",
    ...createWorkflowNodes({
      trigger: {
        type: "OFFER_ACCEPTED",
        config: {},
      },
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Welcome to the team! What to expect",
            message: "Your first day details and what we're excited about.",
            template: "pre-boarding-welcome",
          },
        },
        {
          type: "schedule_series",
          config: {
            emails: [
              { daysBefore: 14, template: "meet-the-team" },
              { daysBefore: 7, template: "company-culture" },
              { daysBefore: 3, template: "first-day-logistics" },
            ],
          },
        },
      ],
    }),
    config: { customizable: ["emailSchedule", "content"] },
    benefits: [
      "Reduces pre-start anxiety",
      "15% lower offer reneging rate",
      "Higher day-1 engagement",
    ],
  },

  {
    id: "role-specific-onboarding",
    name: "Role-Specific Onboarding Paths",
    description: "Customized onboarding based on job role",
    category: workflowCategories[0],
    tags: ["onboarding", "customization", "roles"],
    icon: "🎭",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      branches: [{ type: "conditional" }],
      actions: [
        {
          type: "check_job_role",
          config: {},
        },
        {
          type: "assign_role_checklist",
          config: {
            engineering: ["dev-environment", "code-standards", "ci-cd"],
            sales: ["crm-training", "product-demo", "sales-process"],
            hr: ["hris-training", "compliance", "policies"],
          },
        },
      ],
    }),
    config: { customizable: ["roleChecklists"] },
    benefits: [
      "Relevant training from day 1",
      "Faster role competency",
      "Better resource utilization",
    ],
  },

  {
    id: "remote-onboarding",
    name: "Remote Employee Onboarding",
    description: "Special onboarding flow for remote workers",
    category: workflowCategories[0],
    tags: ["onboarding", "remote", "hybrid"],
    icon: "🏠",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      conditions: [
        {
          type: "custom_field",
          config: {
            field: "workLocation",
            operator: "equals",
            value: "REMOTE",
          },
        },
      ],
      actions: [
        {
          type: "ship_equipment",
          config: {
            items: ["laptop", "monitor", "keyboard", "mouse"],
            address: "{{employee.homeAddress}}",
            trackingNotification: true,
          },
        },
        {
          type: "schedule_virtual_sessions",
          config: {
            sessions: [
              { day: 1, title: "Virtual office tour" },
              { day: 2, title: "Tools and systems training" },
              { day: 3, title: "Team virtual coffee" },
            ],
          },
        },
        {
          type: "assign_form",
          config: {
            formId: "home-office-setup",
            includesStipend: true,
            amount: 500,
          },
        },
      ],
    }),
    config: { customizable: ["equipment", "stipend"] },
    benefits: [
      "Seamless remote onboarding",
      "Equal experience for all locations",
      "Higher remote employee retention",
    ],
  },

  // ============ LEAVE & TIME MANAGEMENT (6 workflows) ============
  {
    id: "leave-request-approval",
    name: "Smart Leave Request Approval",
    description: "Intelligent routing based on leave type and duration",
    category: workflowCategories[1],
    tags: ["leave", "approval", "essential"],
    icon: "✈️",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "LEAVE_REQUEST",
        config: {},
      },
      conditions: [
        {
          type: "leave_duration",
          config: { operator: ">", value: 5 },
        },
      ],
      branches: [{ type: "conditional" }],
      actions: [
        {
          type: "check_leave_balance",
          config: {},
        },
        {
          type: "route_approval",
          config: {
            shortLeave: "manager",
            longLeave: "manager_and_hr",
            sickLeave: "auto_approve_under_3_days",
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email", "slack"],
            recipientType: "approver",
            subject: "Leave request from {{employee.name}}",
            includeCalendarFile: true,
          },
        },
      ],
    }),
    config: { customizable: ["approvalRouting", "autoApprovalRules"] },
    benefits: [
      "50% faster leave approvals",
      "Consistent approval routing",
      "Reduced admin overhead",
    ],
  },

  {
    id: "return-from-leave",
    name: "Return from Extended Leave",
    description: "Smooth reintegration after parental, sabbatical, or medical leave",
    category: workflowCategories[1],
    tags: ["leave", "return", "parental"],
    icon: "🏡",
    ...createWorkflowNodes({
      trigger: {
        type: "LEAVE_ENDING",
        config: { leaveTypes: ["PARENTAL", "SABBATICAL", "MEDICAL"] },
      },
      delays: [{ days: -14 }], // 14 days before return
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Welcome back planning",
            message: "Let's plan your smooth return to work",
            template: "return-from-leave",
          },
        },
        {
          type: "create_task",
          config: {
            title: "Schedule return-to-work meeting",
            assigneeType: "manager",
            description: "Discuss workload, updates, and support needs",
            dueDays: 10,
          },
        },
        {
          type: "reactivate_access",
          config: {
            systems: ["email", "slack", "hris"],
            notifyIT: true,
          },
        },
      ],
    }),
    config: { customizable: ["returnPeriod", "meetingAgenda"] },
    benefits: [
      "Smooth transition back to work",
      "Reduced anxiety for returning employees",
      "Better retention post-leave",
    ],
  },

  {
    id: "leave-balance-management",
    name: "Annual Leave Balance Alerts",
    description: "Proactive management of leave balances and accruals",
    category: workflowCategories[1],
    tags: ["leave", "balance", "compliance"],
    icon: "📊",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 * *" }, // Monthly
      },
      conditions: [
        {
          type: "leave_balance",
          config: { operator: ">", value: 15 },
        },
      ],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Your leave balance update",
            message: "You have {{leave.balance}} days. Consider planning time off!",
            includeBalance: true,
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "manager",
            subject: "Team leave balances",
            message: "Review attached report for planning",
            attachReport: true,
          },
        },
      ],
    }),
    config: { customizable: ["thresholds", "frequency"] },
    benefits: [
      "Prevents excessive accruals",
      "Better leave planning",
      "Compliance with leave policies",
    ],
  },

  {
    id: "sick-leave-followup",
    name: "Sick Leave Care & Compliance",
    description: "Caring follow-up and documentation for sick leave",
    category: workflowCategories[1],
    tags: ["leave", "wellness", "compliance"],
    icon: "🏥",
    ...createWorkflowNodes({
      trigger: {
        type: "LEAVE_REQUEST",
        config: { leaveType: "SICK" },
      },
      conditions: [
        {
          type: "leave_duration",
          config: { operator: ">=", value: 3 },
        },
      ],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Get well soon!",
            message: "Take care. Let us know if you need anything.",
            tone: "caring",
          },
        },
        {
          type: "create_task",
          config: {
            title: "Check in with {{employee.name}}",
            assigneeType: "manager",
            dueDays: 2,
            taskType: "wellness_check",
          },
        },
        {
          type: "request_document",
          config: {
            documentType: "medical_certificate",
            requiredAfterDays: 3,
            reminderDays: 5,
          },
        },
      ],
    }),
    config: { customizable: ["certificateRequirement", "checkInSchedule"] },
    benefits: [
      "Shows genuine care for employees",
      "Ensures compliance documentation",
      "Reduces unplanned absence patterns",
    ],
  },

  {
    id: "public-holiday-scheduling",
    name: "Public Holiday Roster Management",
    description: "Automated scheduling for NZ public holidays",
    category: workflowCategories[1],
    tags: ["leave", "holidays", "nz-specific"],
    icon: "🎊",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 11 *" }, // November 1st
      },
      actions: [
        {
          type: "generate_roster",
          config: {
            holidays: ["christmas", "boxing_day", "new_year"],
            method: "voluntary_then_rotation",
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "all_employees",
            subject: "Holiday roster preferences",
            message: "Submit your holiday work preferences",
            formLink: true,
            deadline: 14,
          },
        },
        {
          type: "publish_roster",
          config: {
            publishDate: 21, // days after trigger
            notifyAll: true,
          },
        },
      ],
    }),
    config: { customizable: ["holidays", "rosterMethod"] },
    benefits: [
      "Fair holiday scheduling",
      "Advance notice for planning",
      "Reduced scheduling conflicts",
    ],
  },

  {
    id: "overtime-approval",
    name: "Overtime Pre-Approval & Tracking",
    description: "Manage overtime requests and compliance",
    category: workflowCategories[1],
    tags: ["time", "overtime", "compliance"],
    icon: "⏰",
    ...createWorkflowNodes({
      trigger: {
        type: "OVERTIME_REQUEST",
        config: {},
      },
      conditions: [
        {
          type: "hours_requested",
          config: { operator: ">", value: 10 },
        },
      ],
      actions: [
        {
          type: "check_budget",
          config: {
            budgetType: "department_overtime",
          },
        },
        {
          type: "route_approval",
          config: {
            under10Hours: "manager",
            over10Hours: "manager_and_finance",
          },
        },
        {
          type: "track_hours",
          config: {
            system: "payroll",
            includeRates: true,
          },
        },
      ],
    }),
    config: { customizable: ["approvalThresholds", "budgetLimits"] },
    benefits: [
      "Controlled overtime costs",
      "Compliance with hour limits",
      "Accurate payroll processing",
    ],
  },

  // ============ PERFORMANCE & DEVELOPMENT (5 workflows) ============
  {
    id: "performance-review-cycle",
    name: "Annual Performance Review Cycle",
    description: "Complete performance review process with 360 feedback",
    category: workflowCategories[2],
    tags: ["performance", "review", "essential"],
    icon: "🎯",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 6 *" }, // June 1st
      },
      actions: [
        {
          type: "initiate_review_cycle",
          config: {
            reviewType: "annual",
            include360: true,
          },
        },
        {
          type: "send_form",
          config: {
            formId: "self-assessment",
            assignTo: "all_employees",
            dueDays: 14,
          },
        },
        {
          type: "send_form",
          config: {
            formId: "manager-assessment",
            assignTo: "managers",
            dueDays: 21,
          },
        },
        {
          type: "schedule_reviews",
          config: {
            duration: 60,
            withinDays: 30,
          },
        },
      ],
    }),
    config: { customizable: ["reviewSchedule", "forms"] },
    benefits: [
      "100% review completion rate",
      "Consistent review process",
      "Better performance insights",
    ],
  },

  {
    id: "continuous-feedback",
    name: "Continuous Feedback Loop",
    description: "Regular check-ins and feedback collection",
    category: workflowCategories[2],
    tags: ["performance", "feedback", "agile"],
    icon: "💬",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 * * MON" }, // Weekly
      },
      actions: [
        {
          type: "send_pulse_survey",
          config: {
            questions: ["wins", "challenges", "support_needed"],
            anonymous: false,
          },
        },
        {
          type: "aggregate_responses",
          config: {
            groupBy: "department",
            threshold: 3, // flag if score < 3
          },
        },
        {
          type: "notify_if_concerning",
          config: {
            recipient: "manager",
            escalateTo: "hr",
          },
        },
      ],
    }),
    config: { customizable: ["frequency", "questions"] },
    benefits: [
      "Early issue detection",
      "Improved manager-employee communication",
      "Higher engagement scores",
    ],
  },

  {
    id: "training-completion",
    name: "Training Completion & Certification",
    description: "Track and certify training completions",
    category: workflowCategories[2],
    tags: ["training", "development", "compliance"],
    icon: "🎓",
    ...createWorkflowNodes({
      trigger: {
        type: "TRAINING_COMPLETED",
        config: {},
      },
      actions: [
        {
          type: "generate_certificate",
          config: {
            template: "completion_certificate",
            signatory: "hr_manager",
          },
        },
        {
          type: "update_skills_matrix",
          config: {
            system: "competency_tracker",
          },
        },
        {
          type: "notify_stakeholders",
          config: {
            recipients: ["employee", "manager", "hr"],
            includeCertificate: true,
          },
        },
      ],
    }),
    config: { customizable: ["certificateTemplate", "notifications"] },
    benefits: [
      "Automated certification process",
      "Updated skills tracking",
      "Compliance documentation",
    ],
  },

  {
    id: "promotion-workflow",
    name: "Promotion & Role Change Process",
    description: "Manage promotions and internal transitions",
    category: workflowCategories[2],
    tags: ["promotion", "career", "transition"],
    icon: "🚀",
    ...createWorkflowNodes({
      trigger: {
        type: "ROLE_CHANGE",
        config: { changeType: "PROMOTION" },
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "update_org_chart",
          config: { automatic: true },
        },
        {
          type: "adjust_compensation",
          config: {
            effectiveDate: "next_pay_period",
            notifyPayroll: true,
          },
        },
        {
          type: "update_access_permissions",
          config: {
            basedOnRole: true,
            notifyIT: true,
          },
        },
        {
          type: "announce_promotion",
          config: {
            channels: ["email", "slack"],
            audience: "company_wide",
            template: "promotion_announcement",
          },
        },
      ],
    }),
    config: { customizable: ["announcement", "effectiveDate"] },
    benefits: [
      "Seamless role transitions",
      "Consistent communication",
      "Proper system updates",
    ],
  },

  {
    id: "pip-management",
    name: "Performance Improvement Plan",
    description: "Structured PIP process with regular check-ins",
    category: workflowCategories[2],
    tags: ["performance", "improvement", "support"],
    icon: "📈",
    ...createWorkflowNodes({
      trigger: {
        type: "PIP_INITIATED",
        config: {},
      },
      actions: [
        {
          type: "create_pip_document",
          config: {
            template: "standard_pip",
            duration: 90,
            checkpoints: [30, 60, 90],
          },
        },
        {
          type: "schedule_checkpoints",
          config: {
            frequency: "biweekly",
            attendees: ["employee", "manager", "hr"],
          },
        },
        {
          type: "assign_support",
          config: {
            mentor: true,
            additionalTraining: true,
          },
        },
      ],
    }),
    config: { customizable: ["duration", "checkpoints"] },
    benefits: [
      "Structured improvement process",
      "Clear documentation",
      "Fair and supportive approach",
    ],
  },

  // ============ COMPLIANCE & DOCUMENTATION (5 workflows) ============
  {
    id: "visa-expiry-management",
    name: "Work Visa & Permit Management",
    description: "Track and manage work visa expiries and renewals",
    category: workflowCategories[3],
    tags: ["compliance", "visa", "nz-specific", "essential"],
    icon: "🛂",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "DOCUMENT_EXPIRING",
        config: {
          documentType: "WORK_VISA",
          daysBefore: 90,
        },
      },
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Visa renewal reminder",
            message: "Your visa expires in 90 days. Start renewal process.",
            priority: "HIGH",
          },
        },
        {
          type: "create_task",
          config: {
            title: "Assist with visa renewal - {{employee.name}}",
            assigneeType: "hr",
            description: "Contact immigration lawyer if needed",
            dueDays: 7,
          },
        },
        {
          type: "track_renewal",
          config: {
            checkpoints: [60, 30, 14, 7],
            escalateIfNotStarted: 30,
          },
        },
      ],
    }),
    config: {
      alertOnFailure: true,
      customizable: ["notificationSchedule", "escalation"],
    },
    benefits: [
      "100% visa compliance",
      "No work interruptions",
      "Reduced legal risks",
    ],
  },

  {
    id: "employment-agreement-updates",
    name: "Employment Agreement Updates",
    description: "Manage changes to employment terms and conditions",
    category: workflowCategories[3],
    tags: ["compliance", "contracts", "documentation"],
    icon: "📑",
    ...createWorkflowNodes({
      trigger: {
        type: "AGREEMENT_CHANGE",
        config: {},
      },
      actions: [
        {
          type: "generate_variation",
          config: {
            template: "employment_variation",
            includeChangeSummary: true,
          },
        },
        {
          type: "send_for_signature",
          config: {
            system: "docusign",
            signatories: ["employee", "employer_rep"],
            reminderDays: [3, 5, 7],
          },
        },
        {
          type: "file_signed_document",
          config: {
            location: "employee_file",
            notify: ["hr", "payroll"],
          },
        },
      ],
    }),
    config: { customizable: ["template", "signatories"] },
    benefits: [
      "Legal compliance maintained",
      "Proper documentation trail",
      "Faster agreement processing",
    ],
  },

  {
    id: "privacy-act-requests",
    name: "Privacy Act Information Requests",
    description: "Handle employee information requests under NZ Privacy Act",
    category: workflowCategories[3],
    tags: ["compliance", "privacy", "nz-law"],
    icon: "🔒",
    ...createWorkflowNodes({
      trigger: {
        type: "PRIVACY_REQUEST",
        config: {},
      },
      actions: [
        {
          type: "acknowledge_request",
          config: {
            withinHours: 48,
            reference: "auto_generate",
          },
        },
        {
          type: "gather_information",
          config: {
            sources: ["hris", "emails", "documents"],
            redactThirdParty: true,
          },
        },
        {
          type: "provide_information",
          config: {
            deadline: 20, // working days as per Privacy Act
            format: "secure_portal",
            includeLog: true,
          },
        },
      ],
    }),
    config: {
      alertOnFailure: true,
      customizable: ["sources", "format"],
    },
    benefits: [
      "Privacy Act compliance",
      "Timely response to requests",
      "Audit trail maintained",
    ],
  },

  {
    id: "audit-preparation",
    name: "HR Audit Preparation",
    description: "Prepare for internal or external HR audits",
    category: workflowCategories[3],
    tags: ["compliance", "audit", "documentation"],
    icon: "🔍",
    ...createWorkflowNodes({
      trigger: {
        type: "AUDIT_SCHEDULED",
        config: {},
      },
      delays: [{ days: -30 }], // Start 30 days before
      actions: [
        {
          type: "create_audit_checklist",
          config: {
            auditType: "comprehensive",
            areas: ["payroll", "leave", "health_safety", "training"],
          },
        },
        {
          type: "assign_prep_tasks",
          config: {
            byArea: true,
            owners: "area_managers",
          },
        },
        {
          type: "collect_documentation",
          config: {
            required: ["policies", "procedures", "records", "registers"],
            centralLocation: true,
          },
        },
        {
          type: "conduct_self_audit",
          config: {
            daysBefore: 7,
            reportTo: "leadership",
          },
        },
      ],
    }),
    config: { customizable: ["auditAreas", "timeline"] },
    benefits: [
      "Audit readiness improved by 80%",
      "Fewer audit findings",
      "Streamlined preparation",
    ],
  },

  {
    id: "policy-acknowledgment",
    name: "Policy Update & Acknowledgment",
    description: "Distribute and track policy acknowledgments",
    category: workflowCategories[3],
    tags: ["compliance", "policies", "essential"],
    icon: "📖",
    ...createWorkflowNodes({
      trigger: {
        type: "POLICY_UPDATED",
        config: {},
      },
      actions: [
        {
          type: "notify_affected",
          config: {
            determineBy: "policy_scope",
            channels: ["email", "portal"],
          },
        },
        {
          type: "require_acknowledgment",
          config: {
            deadline: 14,
            includeQuiz: false,
            blockSystemAccess: false,
          },
        },
        {
          type: "track_compliance",
          config: {
            reminders: [7, 3, 1],
            escalateToManager: true,
          },
        },
        {
          type: "generate_report",
          config: {
            includeNonCompliant: true,
            sendTo: "hr_leadership",
          },
        },
      ],
    }),
    config: { customizable: ["deadline", "enforcement"] },
    benefits: [
      "100% policy awareness",
      "Compliance tracking",
      "Risk mitigation",
    ],
  },

  // ============ OFFBOARDING & TRANSITIONS (5 workflows) ============
  {
    id: "resignation-processing",
    name: "Resignation & Notice Period Management",
    description: "Complete resignation process from notice to last day",
    category: workflowCategories[4],
    tags: ["offboarding", "resignation", "essential"],
    icon: "📝",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "RESIGNATION_SUBMITTED",
        config: {},
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "acknowledge_resignation",
          config: {
            template: "resignation_acknowledgment",
            cc: ["manager", "hr"],
          },
        },
        {
          type: "calculate_last_day",
          config: {
            basedOn: "notice_period",
            excludePublicHolidays: true,
          },
        },
        {
          type: "create_offboarding_plan",
          config: {
            template: "standard_offboarding",
            assignTasks: true,
          },
        },
        {
          type: "schedule_exit_interview",
          config: {
            daysBeforeLastDay: 3,
            interviewer: "hr",
          },
        },
        {
          type: "initiate_handover",
          config: {
            createChecklist: true,
            assignBuddy: true,
          },
        },
      ],
    }),
    config: { customizable: ["noticePeriod", "exitProcess"] },
    benefits: [
      "Smooth transition planning",
      "Nothing falls through cracks",
      "Professional exit experience",
    ],
  },

  {
    id: "knowledge-transfer",
    name: "Knowledge Transfer & Handover",
    description: "Systematic knowledge capture before departure",
    category: workflowCategories[4],
    tags: ["offboarding", "knowledge", "continuity"],
    icon: "🧠",
    ...createWorkflowNodes({
      trigger: {
        type: "OFFBOARDING_STARTED",
        config: {},
      },
      actions: [
        {
          type: "create_handover_doc",
          config: {
            template: "knowledge_transfer",
            sections: ["projects", "contacts", "processes", "passwords"],
          },
        },
        {
          type: "schedule_sessions",
          config: {
            withReplacement: true,
            withTeam: true,
            recordSessions: true,
          },
        },
        {
          type: "document_processes",
          config: {
            critical: true,
            createSOPs: true,
          },
        },
        {
          type: "verify_completion",
          config: {
            reviewer: "manager",
            signoff: true,
          },
        },
      ],
    }),
    config: { customizable: ["handoverPeriod", "documentation"] },
    benefits: [
      "Zero knowledge loss",
      "Faster replacement onboarding",
      "Business continuity maintained",
    ],
  },

  {
    id: "exit-interview-insights",
    name: "Exit Interview & Insights Capture",
    description: "Structured exit interviews with actionable insights",
    category: workflowCategories[4],
    tags: ["offboarding", "feedback", "retention"],
    icon: "🎤",
    ...createWorkflowNodes({
      trigger: {
        type: "EXIT_INTERVIEW_SCHEDULED",
        config: {},
      },
      actions: [
        {
          type: "send_pre_interview_survey",
          config: {
            anonymous: false,
            topics: ["role", "management", "culture", "growth", "compensation"],
          },
        },
        {
          type: "conduct_interview",
          config: {
            format: "structured",
            duration: 60,
            recordingOptional: true,
          },
        },
        {
          type: "analyze_feedback",
          config: {
            sentiment: true,
            themes: true,
            compareToTrends: true,
          },
        },
        {
          type: "create_action_plan",
          config: {
            ifNegativeFeedback: true,
            assignTo: "relevant_manager",
            trackImplementation: true,
          },
        },
      ],
    }),
    config: { customizable: ["interviewFormat", "analysis"] },
    benefits: [
      "Valuable retention insights",
      "Improved workplace culture",
      "Data-driven improvements",
    ],
  },

  {
    id: "final-pay-calculation",
    name: "Final Pay & Entitlements",
    description: "Calculate and process all final payments",
    category: workflowCategories[4],
    tags: ["offboarding", "payroll", "compliance"],
    icon: "💵",
    ...createWorkflowNodes({
      trigger: {
        type: "LAST_DAY_APPROACHING",
        config: { daysBefore: 5 },
      },
      actions: [
        {
          type: "calculate_entitlements",
          config: {
            include: ["salary", "leave_balance", "allowances", "bonuses"],
            proRate: true,
          },
        },
        {
          type: "generate_statement",
          config: {
            detailed: true,
            requireApproval: "manager_and_hr",
          },
        },
        {
          type: "process_payment",
          config: {
            timing: "with_final_day",
            method: "standard_payroll",
          },
        },
        {
          type: "provide_documentation",
          config: {
            items: ["final_pay_slip", "leave_balance", "tax_certificate"],
            delivery: "secure_email",
          },
        },
      ],
    }),
    config: { customizable: ["paymentTiming", "calculations"] },
    benefits: [
      "Accurate final payments",
      "Compliance with employment law",
      "Reduced payment disputes",
    ],
  },

  {
    id: "alumni-program",
    name: "Alumni Network Enrollment",
    description: "Transition departing employees to alumni network",
    category: workflowCategories[4],
    tags: ["offboarding", "alumni", "networking"],
    icon: "🤝",
    ...createWorkflowNodes({
      trigger: {
        type: "OFFBOARDING_COMPLETED",
        config: {},
      },
      conditions: [
        {
          type: "departure_type",
          config: { 
            eligible: ["resignation", "end_of_contract"],
            exclude: ["termination", "misconduct"],
          },
        },
      ],
      actions: [
        {
          type: "invite_to_alumni",
          config: {
            platform: "alumni_portal",
            benefits: ["newsletter", "events", "referral_program"],
          },
        },
        {
          type: "maintain_connection",
          config: {
            linkedIn: true,
            occasionalUpdates: true,
          },
        },
        {
          type: "enable_referrals",
          config: {
            referralBonus: true,
            rehireEligible: true,
          },
        },
      ],
    }),
    config: { customizable: ["eligibility", "benefits"] },
    benefits: [
      "Maintain positive relationships",
      "Referral pipeline",
      "Potential rehire pool",
    ],
  },

  // ============ ENGAGEMENT & CULTURE (4 workflows) ============
  {
    id: "birthday-anniversary-celebrations",
    name: "Birthday & Anniversary Celebrations",
    description: "Automated celebrations and recognition",
    category: workflowCategories[5],
    tags: ["engagement", "culture", "recognition"],
    icon: "🎂",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 * * *" }, // Daily at 9am
      },
      conditions: [
        {
          type: "date_match",
          config: {
            checkBirthdays: true,
            checkWorkAnniversaries: true,
          },
        },
      ],
      actions: [
        {
          type: "send_celebration",
          config: {
            channels: ["email", "slack"],
            audience: "team",
            includeGiftVoucher: true,
            amount: 50,
          },
        },
        {
          type: "post_announcement",
          config: {
            platform: "company_feed",
            allowComments: true,
          },
        },
        {
          type: "schedule_celebration",
          config: {
            monthlyGathering: true,
            virtualOption: true,
          },
        },
      ],
    }),
    config: { customizable: ["celebration type", "gift_amount"] },
    benefits: [
      "Improved employee satisfaction",
      "Stronger team bonds",
      "Recognition culture",
    ],
  },

  {
    id: "pulse-survey-action",
    name: "Pulse Survey & Action Loop",
    description: "Regular pulse checks with automatic action triggers",
    category: workflowCategories[5],
    tags: ["engagement", "survey", "feedback"],
    icon: "📊",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 * *" }, // Monthly
      },
      actions: [
        {
          type: "send_pulse_survey",
          config: {
            questions: 5,
            anonymous: true,
            topics: ["satisfaction", "workload", "growth", "recognition"],
          },
        },
        {
          type: "analyze_results",
          config: {
            benchmark: "previous_quarter",
            identifyTrends: true,
          },
        },
        {
          type: "trigger_interventions",
          config: {
            lowScore: "manager_coaching",
            declining: "team_workshop",
            improved: "celebrate_success",
          },
        },
        {
          type: "share_results",
          config: {
            transparency: "department_level",
            includeActions: true,
          },
        },
      ],
    }),
    config: { customizable: ["frequency", "questions", "interventions"] },
    benefits: [
      "Real-time engagement monitoring",
      "Proactive issue resolution",
      "Data-driven culture improvements",
    ],
  },

  {
    id: "recognition-program",
    name: "Peer Recognition Program",
    description: "Facilitate and amplify peer-to-peer recognition",
    category: workflowCategories[5],
    tags: ["engagement", "recognition", "culture"],
    icon: "⭐",
    ...createWorkflowNodes({
      trigger: {
        type: "RECOGNITION_GIVEN",
        config: {},
      },
      actions: [
        {
          type: "amplify_recognition",
          config: {
            channels: ["slack", "newsletter"],
            addToProfile: true,
          },
        },
        {
          type: "award_points",
          config: {
            giver: 10,
            receiver: 50,
            redeemable: true,
          },
        },
        {
          type: "track_values",
          config: {
            alignToCompanyValues: true,
            generateReport: "quarterly",
          },
        },
      ],
    }),
    config: { customizable: ["points", "rewards", "visibility"] },
    benefits: [
      "Increased recognition frequency",
      "Stronger culture alignment",
      "Higher engagement scores",
    ],
  },

  {
    id: "new-parent-support",
    name: "New Parent Support Program",
    description: "Comprehensive support for new parents",
    category: workflowCategories[5],
    tags: ["engagement", "wellbeing", "parents"],
    icon: "👶",
    ...createWorkflowNodes({
      trigger: {
        type: "PARENTAL_LEAVE_APPROVED",
        config: {},
      },
      actions: [
        {
          type: "create_support_plan",
          config: {
            phases: ["pre-leave", "during-leave", "return"],
            flexibility: true,
          },
        },
        {
          type: "assign_resources",
          config: {
            parentingResources: true,
            eppContacts: true,
            flexibleWorkOptions: true,
          },
        },
        {
          type: "schedule_touchpoints",
          config: {
            duringLeave: "monthly_optional",
            beforeReturn: "2_weeks",
            afterReturn: "weekly_first_month",
          },
        },
        {
          type: "offer_benefits",
          config: {
            phasedReturn: true,
            nursingSupport: true,
            childcareAssistance: true,
          },
        },
      ],
    }),
    config: { customizable: ["support_level", "touchpoint_frequency"] },
    benefits: [
      "Better parent retention",
      "Reduced stress for new parents",
      "Inclusive workplace culture",
    ],
  },

  // ============ HEALTH & SAFETY (4 workflows) ============
  {
    id: "incident-reporting",
    name: "Incident Report & Investigation",
    description: "Comprehensive incident management per WorkSafe NZ",
    category: workflowCategories[6],
    tags: ["safety", "incident", "compliance", "essential"],
    icon: "🚨",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "INCIDENT_REPORTED",
        config: {},
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "assess_severity",
          config: {
            notifiable: "worksafe_nz",
            serious: "immediate_investigation",
          },
        },
        {
          type: "notify_stakeholders",
          config: {
            internal: ["safety_officer", "management"],
            external: ["worksafe", "insurance"],
            timing: "based_on_severity",
          },
        },
        {
          type: "conduct_investigation",
          config: {
            team: "safety_committee",
            timeline: 48, // hours
            report: true,
          },
        },
        {
          type: "implement_corrections",
          config: {
            immediate: true,
            preventive: true,
            trackCompletion: true,
          },
        },
      ],
    }),
    config: {
      alertOnFailure: true,
      customizable: ["investigation_team", "notification_list"],
    },
    benefits: [
      "WorkSafe NZ compliance",
      "Reduced incident recurrence",
      "Proper documentation",
    ],
  },

  {
    id: "safety-training-compliance",
    name: "Safety Training & Certification",
    description: "Manage mandatory safety training and renewals",
    category: workflowCategories[6],
    tags: ["safety", "training", "compliance"],
    icon: "🦺",
    ...createWorkflowNodes({
      trigger: {
        type: "TRAINING_DUE",
        config: { type: "safety" },
      },
      conditions: [
        {
          type: "training_required",
          config: {
            basedOn: "role_hazards",
          },
        },
      ],
      actions: [
        {
          type: "schedule_training",
          config: {
            provider: "certified_trainer",
            format: "role_appropriate",
          },
        },
        {
          type: "track_attendance",
          config: {
            mandatory: true,
            makeupSessions: true,
          },
        },
        {
          type: "issue_certification",
          config: {
            uponCompletion: true,
            registerWithWorksafe: true,
          },
        },
      ],
    }),
    config: { customizable: ["training_types", "renewal_periods"] },
    benefits: [
      "100% safety compliance",
      "Reduced workplace accidents",
      "Audit ready documentation",
    ],
  },

  {
    id: "wellness-check-ins",
    name: "Employee Wellness Program",
    description: "Proactive mental health and wellness support",
    category: workflowCategories[6],
    tags: ["wellness", "mental-health", "support"],
    icon: "💚",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 15 * *" }, // Mid-month
      },
      actions: [
        {
          type: "send_wellness_check",
          config: {
            format: "confidential_survey",
            topics: ["stress", "workload", "support_needs"],
          },
        },
        {
          type: "provide_resources",
          config: {
            eap: true,
            wellnessApp: true,
            flexibleWork: true,
          },
        },
        {
          type: "flag_concerns",
          config: {
            anonymous: true,
            supportTeam: "hr_wellness",
            followUp: "within_48_hours",
          },
        },
      ],
    }),
    config: { customizable: ["check_frequency", "resources"] },
    benefits: [
      "Improved employee wellbeing",
      "Reduced stress-related absence",
      "Supportive workplace culture",
    ],
  },

  {
    id: "return-to-work",
    name: "Return to Work After Injury",
    description: "ACC compliant return to work program",
    category: workflowCategories[6],
    tags: ["safety", "injury", "acc", "nz-specific"],
    icon: "🏥",
    ...createWorkflowNodes({
      trigger: {
        type: "INJURY_LEAVE_ENDING",
        config: {},
      },
      actions: [
        {
          type: "medical_clearance",
          config: {
            requireCertificate: true,
            assessCapacity: true,
          },
        },
        {
          type: "create_return_plan",
          config: {
            graduated: true,
            accommodations: true,
            accCompliant: true,
          },
        },
        {
          type: "monitor_progress",
          config: {
            checkIns: [1, 7, 14, 30], // days
            adjustAsNeeded: true,
          },
        },
      ],
    }),
    config: { customizable: ["return_schedule", "monitoring"] },
    benefits: [
      "Safe return to work",
      "ACC compliance",
      "Reduced re-injury risk",
    ],
  },

  // ============ PAYROLL & BENEFITS (3 workflows) ============
  {
    id: "kiwisaver-management",
    name: "KiwiSaver Enrollment & Changes",
    description: "Automated KiwiSaver administration",
    category: workflowCategories[7],
    tags: ["payroll", "kiwisaver", "nz-specific", "essential"],
    icon: "🏦",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_ELIGIBLE",
        config: { 
          eligibility: "kiwisaver",
          checkAge: true,
        },
      },
      delays: [{ days: 56 }], // 8 weeks opt-out period
      actions: [
        {
          type: "provide_information",
          config: {
            ks3Form: true,
            investmentInfo: true,
            optOutInfo: true,
          },
        },
        {
          type: "process_enrollment",
          config: {
            afterOptOut: true,
            defaultRate: 3,
            employerContribution: true,
          },
        },
        {
          type: "notify_ird",
          config: {
            automatic: true,
            employerSchedule: true,
          },
        },
      ],
    }),
    config: { customizable: ["contribution_rates", "opt_out_period"] },
    benefits: [
      "Automated compliance",
      "Reduced admin burden",
      "Accurate deductions",
    ],
  },

  {
    id: "salary-review-cycle",
    name: "Annual Salary Review Process",
    description: "Structured compensation review cycle",
    category: workflowCategories[7],
    tags: ["payroll", "compensation", "review"],
    icon: "📈",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 3 *" }, // March 1
      },
      actions: [
        {
          type: "initiate_review",
          config: {
            marketData: true,
            performanceLink: true,
            budgetConstraints: true,
          },
        },
        {
          type: "manager_recommendations",
          config: {
            template: "salary_review",
            justification: true,
            deadline: 21,
          },
        },
        {
          type: "approval_workflow",
          config: {
            levels: ["manager", "hr", "finance", "ceo"],
            thresholds: true,
          },
        },
        {
          type: "communicate_decisions",
          config: {
            individual: true,
            effectiveDate: "April 1",
            updatePayroll: true,
          },
        },
      ],
    }),
    config: { customizable: ["review_criteria", "approval_levels"] },
    benefits: [
      "Fair compensation process",
      "Market competitiveness",
      "Transparent decisions",
    ],
  },

  {
    id: "flexible-benefits",
    name: "Flexible Benefits Enrollment",
    description: "Annual benefits selection and changes",
    category: workflowCategories[7],
    tags: ["benefits", "enrollment", "flexibility"],
    icon: "🎁",
    ...createWorkflowNodes({
      trigger: {
        type: "BENEFITS_WINDOW_OPEN",
        config: {},
      },
      actions: [
        {
          type: "notify_employees",
          config: {
            openEnrollment: true,
            changes: true,
            deadline: 30,
          },
        },
        {
          type: "provide_calculator",
          config: {
            scenarios: true,
            recommendations: true,
            comparison: true,
          },
        },
        {
          type: "process_selections",
          config: {
            validation: true,
            confirmation: true,
            effectiveDate: "next_year",
          },
        },
        {
          type: "update_deductions",
          config: {
            payroll: true,
            providers: true,
            cards: true,
          },
        },
      ],
    }),
    config: { customizable: ["benefits_options", "enrollment_period"] },
    benefits: [
      "Employee choice",
      "Optimized benefits usage",
      "Cost control",
    ],
  },

  // ============ ADDITIONAL HIGH-VALUE WORKFLOWS (20 more) ============
  
  // More Onboarding & Probation
  {
    id: "contractor-onboarding",
    name: "Contractor & Consultant Onboarding",
    description: "Streamlined onboarding for temporary and contract workers",
    category: workflowCategories[0],
    tags: ["onboarding", "contractor", "compliance"],
    icon: "👔",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: { employmentType: ["CONTRACTOR", "CONSULTANT"] },
      },
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Welcome - Contract Details & Next Steps",
            message: "Your contract start details and access information",
          },
        },
        {
          type: "create_task",
          config: {
            title: "Review contractor agreement",
            assigneeType: "hr",
            dueDays: 1,
          },
        },
        {
          type: "provision_limited_access",
          config: {
            systems: ["email", "project_tools"],
            duration: "contract_length",
          },
        },
      ],
    }),
    config: { customizable: ["access_level", "duration"] },
    benefits: [
      "Fast contractor ramp-up",
      "Appropriate access controls",
      "Compliance maintained",
    ],
  },

  {
    id: "manager-onboarding",
    name: "New Manager Transition Program",
    description: "Specialized onboarding for new managers and leaders",
    category: workflowCategories[0],
    tags: ["onboarding", "leadership", "development"],
    icon: "👨‍💼",
    ...createWorkflowNodes({
      trigger: {
        type: "ROLE_CHANGE",
        config: { newRole: "MANAGER" },
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "assign_training",
          config: {
            courseId: "manager-fundamentals",
            mandatory: true,
            dueInDays: 14,
          },
        },
        {
          type: "schedule_coaching",
          config: {
            sessions: 4,
            with: "senior_leader",
            frequency: "weekly",
          },
        },
        {
          type: "provide_resources",
          config: {
            managerPlaybook: true,
            teamTemplates: true,
            budgetAccess: true,
          },
        },
      ],
    }),
    config: { customizable: ["training_path", "coaching_schedule"] },
    benefits: [
      "Confident new managers",
      "Reduced team disruption",
      "Better leadership outcomes",
    ],
  },

  // More Leave & Time
  {
    id: "bereavement-support",
    name: "Bereavement Leave & Support",
    description: "Compassionate handling of bereavement situations",
    category: workflowCategories[1],
    tags: ["leave", "wellbeing", "support"],
    icon: "🕊️",
    ...createWorkflowNodes({
      trigger: {
        type: "LEAVE_REQUEST",
        config: { leaveType: "BEREAVEMENT" },
      },
      actions: [
        {
          type: "auto_approve",
          config: {
            immediate: true,
            notifyManager: true,
          },
        },
        {
          type: "send_condolences",
          config: {
            from: "leadership_team",
            includeResources: true,
            eapContact: true,
          },
        },
        {
          type: "arrange_coverage",
          config: {
            temporary: true,
            redistributeUrgent: true,
          },
        },
        {
          type: "offer_support",
          config: {
            counseling: true,
            additionalLeave: true,
            flexibleReturn: true,
          },
        },
      ],
    }),
    config: { customizable: ["support_options", "leave_duration"] },
    benefits: [
      "Compassionate response",
      "Reduced employee stress",
      "Strengthened trust",
    ],
  },

  {
    id: "flexible-working-requests",
    name: "Flexible Working Request Management",
    description: "Handle requests for flexible working arrangements",
    category: workflowCategories[1],
    tags: ["flexibility", "remote", "work-life"],
    icon: "🏡",
    ...createWorkflowNodes({
      trigger: {
        type: "FLEXIBLE_WORK_REQUEST",
        config: {},
      },
      actions: [
        {
          type: "assess_eligibility",
          config: {
            criteria: ["tenure", "role_suitability", "performance"],
          },
        },
        {
          type: "manager_review",
          config: {
            deadline: 10,
            includeTrialOption: true,
          },
        },
        {
          type: "send_decision",
          config: {
            channels: ["email"],
            includeAgreement: true,
            effectiveDate: true,
          },
        },
      ],
    }),
    config: { customizable: ["eligibility_criteria", "trial_period"] },
    benefits: [
      "Consistent flex work decisions",
      "Better work-life balance",
      "Higher retention",
    ],
  },

  // More Performance & Development
  {
    id: "goal-setting-cascade",
    name: "Cascading Goal Setting",
    description: "Align individual goals with company objectives",
    category: workflowCategories[2],
    tags: ["performance", "goals", "okrs"],
    icon: "🎯",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 1 *" }, // January 1
      },
      actions: [
        {
          type: "publish_company_goals",
          config: {
            audience: "all_employees",
            format: "okr",
          },
        },
        {
          type: "cascade_to_departments",
          config: {
            deadline: 14,
            alignmentRequired: true,
          },
        },
        {
          type: "individual_goal_setting",
          config: {
            withManager: true,
            deadline: 30,
            linkToCompany: true,
          },
        },
        {
          type: "track_progress",
          config: {
            frequency: "monthly",
            dashboards: true,
          },
        },
      ],
    }),
    config: { customizable: ["goal_framework", "timeline"] },
    benefits: [
      "Strategic alignment",
      "Clear priorities",
      "Better accountability",
    ],
  },

  {
    id: "skill-gap-analysis",
    name: "Automated Skill Gap Analysis",
    description: "Identify and address skill gaps proactively",
    category: workflowCategories[2],
    tags: ["development", "skills", "training"],
    icon: "📊",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 */3 *" }, // Quarterly
      },
      actions: [
        {
          type: "assess_current_skills",
          config: {
            sources: ["self_assessment", "manager_input", "certifications"],
          },
        },
        {
          type: "identify_gaps",
          config: {
            compareToRoleRequirements: true,
            futureNeeds: true,
          },
        },
        {
          type: "recommend_training",
          config: {
            personalized: true,
            budgetConscious: true,
          },
        },
        {
          type: "create_development_plan",
          config: {
            timeline: 90,
            managerApproval: true,
          },
        },
      ],
    }),
    config: { customizable: ["assessment_frequency", "skill_matrix"] },
    benefits: [
      "Proactive skill development",
      "Career growth support",
      "Future-ready workforce",
    ],
  },

  {
    id: "succession-planning",
    name: "Succession Planning & Talent Pipeline",
    description: "Identify and develop future leaders",
    category: workflowCategories[2],
    tags: ["succession", "leadership", "retention"],
    icon: "🌟",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 6,12 *" }, // Biannual
      },
      actions: [
        {
          type: "identify_critical_roles",
          config: {
            riskAssessment: true,
            businessImpact: true,
          },
        },
        {
          type: "assess_talent",
          config: {
            ninebox: true,
            potential: true,
            readiness: true,
          },
        },
        {
          type: "create_development_plans",
          config: {
            targeted: true,
            accelerated: true,
          },
        },
        {
          type: "track_readiness",
          config: {
            dashboard: true,
            quarterlyReview: true,
          },
        },
      ],
    }),
    config: { customizable: ["assessment_criteria", "development_paths"] },
    benefits: [
      "Leadership continuity",
      "Internal promotion pipeline",
      "Reduced hiring costs",
    ],
  },

  // More Compliance & Documentation
  {
    id: "right-to-work-verification",
    name: "Right to Work Verification (NZ)",
    description: "Automated verification of work eligibility",
    category: workflowCategories[3],
    tags: ["compliance", "immigration", "nz-specific"],
    icon: "✅",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      conditions: [
        {
          type: "custom_field",
          config: {
            field: "requiresWorkVisa",
            operator: "equals",
            value: true,
          },
        },
      ],
      actions: [
        {
          type: "request_documents",
          config: {
            documents: ["passport", "visa", "work_permit"],
            deadline: 3,
            blocking: true,
          },
        },
        {
          type: "verify_authenticity",
          config: {
            method: "digital_check",
            manualReview: true,
          },
        },
        {
          type: "record_verification",
          config: {
            system: "compliance_register",
            expiryTracking: true,
          },
        },
      ],
    }),
    config: { customizable: ["verification_method", "document_types"] },
    benefits: [
      "Legal compliance",
      "Reduced immigration risks",
      "Audit-ready records",
    ],
  },

  {
    id: "data-retention-policy",
    name: "Automated Data Retention & Deletion",
    description: "Comply with data retention laws and privacy requirements",
    category: workflowCategories[3],
    tags: ["compliance", "privacy", "gdpr"],
    icon: "🗑️",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 2 1 * *" }, // Monthly at 2am
      },
      actions: [
        {
          type: "identify_expired_data",
          config: {
            retentionPeriods: {
              applications: 6,
              employee_records: 84, // 7 years
              payroll: 84,
              leave_records: 24,
            },
          },
        },
        {
          type: "notify_before_deletion",
          config: {
            stakeholders: ["hr", "legal"],
            daysNotice: 30,
          },
        },
        {
          type: "anonymize_or_delete",
          config: {
            method: "secure_deletion",
            auditLog: true,
            exceptions: "legal_hold",
          },
        },
      ],
    }),
    config: { customizable: ["retention_periods", "deletion_method"] },
    benefits: [
      "Privacy law compliance",
      "Reduced data liability",
      "Automated cleanup",
    ],
  },

  {
    id: "employment-law-changes",
    name: "Employment Law Change Alerts",
    description: "Stay updated with NZ employment law changes",
    category: workflowCategories[3],
    tags: ["compliance", "law", "nz-specific"],
    icon: "⚖️",
    ...createWorkflowNodes({
      trigger: {
        type: "LAW_CHANGE_DETECTED",
        config: {},
      },
      actions: [
        {
          type: "analyze_impact",
          config: {
            affectedPolicies: true,
            requiredActions: true,
          },
        },
        {
          type: "notify_stakeholders",
          config: {
            recipients: ["hr_manager", "legal", "leadership"],
            priority: "HIGH",
          },
        },
        {
          type: "create_action_plan",
          config: {
            deadline: "compliance_date",
            assignTasks: true,
          },
        },
        {
          type: "track_implementation",
          config: {
            milestones: true,
            reportProgress: "weekly",
          },
        },
      ],
    }),
    config: { customizable: ["monitoring_sources", "notification_list"] },
    benefits: [
      "Always compliant",
      "Proactive updates",
      "Risk mitigation",
    ],
  },

  // More Health & Safety
  {
    id: "workplace-hazard-reporting",
    name: "Hazard Identification & Resolution",
    description: "Proactive hazard management system",
    category: workflowCategories[6],
    tags: ["safety", "hazards", "prevention"],
    icon: "⚠️",
    ...createWorkflowNodes({
      trigger: {
        type: "HAZARD_REPORTED",
        config: {},
      },
      actions: [
        {
          type: "assess_risk",
          config: {
            matrix: "likelihood_x_severity",
            prioritize: true,
          },
        },
        {
          type: "immediate_controls",
          config: {
            highRisk: "isolate_hazard",
            mediumRisk: "warning_signs",
          },
        },
        {
          type: "investigate_root_cause",
          config: {
            method: "5_whys",
            involve: "safety_committee",
          },
        },
        {
          type: "implement_solutions",
          config: {
            hierarchy: "elimination_first",
            trackCompletion: true,
          },
        },
      ],
    }),
    config: { customizable: ["risk_matrix", "control_hierarchy"] },
    benefits: [
      "Proactive safety culture",
      "Reduced incidents",
      "WorkSafe compliance",
    ],
  },

  {
    id: "ergonomic-assessments",
    name: "Workstation Ergonomic Reviews",
    description: "Regular ergonomic assessments for office workers",
    category: workflowCategories[6],
    tags: ["safety", "ergonomics", "wellness"],
    icon: "🪑",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 */6 *" }, // Every 6 months
      },
      conditions: [
        {
          type: "custom_field",
          config: {
            field: "workLocation",
            operator: "in",
            value: ["OFFICE", "HYBRID"],
          },
        },
      ],
      actions: [
        {
          type: "send_assessment_form",
          config: {
            formId: "ergonomic_self_assessment",
            deadline: 14,
          },
        },
        {
          type: "identify_concerns",
          config: {
            flagHighRisk: true,
            prioritize: "discomfort_reported",
          },
        },
        {
          type: "arrange_assessment",
          config: {
            inPerson: "if_needed",
            assessor: "occ_health",
          },
        },
        {
          type: "provide_equipment",
          config: {
            budget: 500,
            approvalRequired: "over_200",
          },
        },
      ],
    }),
    config: { customizable: ["assessment_frequency", "equipment_budget"] },
    benefits: [
      "Prevents injuries",
      "Improved comfort",
      "Reduced ACC claims",
    ],
  },

  // More Engagement & Culture
  {
    id: "employee-referrals",
    name: "Employee Referral Program",
    description: "Automated referral tracking and rewards",
    category: workflowCategories[5],
    tags: ["engagement", "recruitment", "referrals"],
    icon: "🤝",
    ...createWorkflowNodes({
      trigger: {
        type: "REFERRAL_SUBMITTED",
        config: {},
      },
      actions: [
        {
          type: "acknowledge_referral",
          config: {
            thankYou: true,
            trackingNumber: true,
          },
        },
        {
          type: "track_candidate",
          config: {
            updateReferrer: ["shortlisted", "interviewed", "offered"],
          },
        },
        {
          type: "process_reward",
          config: {
            onHire: 500,
            onCompletion90Days: 500,
            method: "bonus_or_voucher",
          },
        },
        {
          type: "celebrate_success",
          config: {
            announce: "company_wide",
            leaderboard: true,
          },
        },
      ],
    }),
    config: { customizable: ["reward_amounts", "milestones"] },
    benefits: [
      "Quality hires from referrals",
      "Lower recruitment costs",
      "Engaged employees",
    ],
  },

  {
    id: "team-building-scheduler",
    name: "Automated Team Building Events",
    description: "Regular team activities and bonding sessions",
    category: workflowCategories[5],
    tags: ["engagement", "culture", "teamwork"],
    icon: "🎉",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 15 */2 *" }, // Bimonthly
      },
      actions: [
        {
          type: "poll_team",
          config: {
            activityOptions: ["lunch", "activity", "workshop", "social"],
            budgetPerPerson: 50,
          },
        },
        {
          type: "book_activity",
          config: {
            basedOnVote: true,
            considerRemote: true,
          },
        },
        {
          type: "send_invites",
          config: {
            calendar: true,
            includeDetails: true,
            rsvp: true,
          },
        },
        {
          type: "follow_up",
          config: {
            feedbackSurvey: true,
            photoSharing: true,
          },
        },
      ],
    }),
    config: { customizable: ["frequency", "budget", "activity_types"] },
    benefits: [
      "Stronger team bonds",
      "Improved morale",
      "Better collaboration",
    ],
  },

  {
    id: "diversity-inclusion-tracking",
    name: "Diversity & Inclusion Initiatives",
    description: "Track and improve D&I metrics",
    category: workflowCategories[5],
    tags: ["diversity", "inclusion", "culture"],
    icon: "🌈",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 */3 *" }, // Quarterly
      },
      actions: [
        {
          type: "collect_demographics",
          config: {
            voluntary: true,
            anonymous: true,
          },
        },
        {
          type: "analyze_representation",
          config: {
            byLevel: true,
            byDepartment: true,
            payEquity: true,
          },
        },
        {
          type: "set_targets",
          config: {
            realistic: true,
            measurable: true,
          },
        },
        {
          type: "track_initiatives",
          config: {
            hiring: true,
            promotion: true,
            retention: true,
          },
        },
      ],
    }),
    config: { customizable: ["metrics", "targets", "initiatives"] },
    benefits: [
      "Improved diversity",
      "Inclusive culture",
      "Better decision making",
    ],
  },

  // More Payroll & Benefits
  {
    id: "expense-reimbursement",
    name: "Expense Claim Processing",
    description: "Streamlined expense submission and approval",
    category: workflowCategories[7],
    tags: ["payroll", "expenses", "approval"],
    icon: "🧾",
    ...createWorkflowNodes({
      trigger: {
        type: "EXPENSE_SUBMITTED",
        config: {},
      },
      conditions: [
        {
          type: "expense_amount",
          config: { operator: ">", value: 100 },
        },
      ],
      actions: [
        {
          type: "validate_policy",
          config: {
            checkLimits: true,
            requireReceipts: true,
          },
        },
        {
          type: "route_approval",
          config: {
            under500: "manager",
            over500: "manager_and_finance",
          },
        },
        {
          type: "process_payment",
          config: {
            method: "next_payrun",
            notifyEmployee: true,
          },
        },
      ],
    }),
    config: { customizable: ["approval_thresholds", "payment_timing"] },
    benefits: [
      "Faster reimbursements",
      "Policy compliance",
      "Reduced admin time",
    ],
  },

  {
    id: "payroll-anomaly-detection",
    name: "Payroll Anomaly Detection",
    description: "Catch payroll errors before processing",
    category: workflowCategories[7],
    tags: ["payroll", "quality", "compliance"],
    icon: "🔍",
    ...createWorkflowNodes({
      trigger: {
        type: "PAYROLL_PREPARED",
        config: {},
      },
      actions: [
        {
          type: "run_checks",
          config: {
            checks: ["duplicate_payments", "zero_hours", "unusual_amounts", "missing_tax"],
          },
        },
        {
          type: "flag_anomalies",
          config: {
            threshold: "statistical_outlier",
            requireReview: true,
          },
        },
        {
          type: "notify_payroll_team",
          config: {
            urgency: "HIGH",
            includeDetails: true,
          },
        },
        {
          type: "require_signoff",
          config: {
            onlyIfClean: true,
            dualApproval: "over_threshold",
          },
        },
      ],
    }),
    config: { customizable: ["anomaly_rules", "approval_workflow"] },
    benefits: [
      "Prevent costly errors",
      "Employee trust",
      "Compliance maintained",
    ],
  },

  // Onboarding - International
  {
    id: "international-assignment",
    name: "International Assignment Management",
    description: "Manage expat assignments and relocations",
    category: workflowCategories[0],
    tags: ["onboarding", "international", "relocation"],
    icon: "✈️",
    isPremium: true,
    ...createWorkflowNodes({
      trigger: {
        type: "ASSIGNMENT_APPROVED",
        config: {},
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "arrange_immigration",
          config: {
            visa: true,
            workPermit: true,
            legal: true,
          },
        },
        {
          type: "coordinate_relocation",
          config: {
            housing: true,
            schooling: true,
            shipping: true,
          },
        },
        {
          type: "setup_compensation",
          config: {
            currency: "host_country",
            allowances: true,
            tax_gross_up: true,
          },
        },
        {
          type: "cultural_training",
          config: {
            employee: true,
            family: true,
          },
        },
      ],
    }),
    config: { customizable: ["relocation_package", "support_services"] },
    benefits: [
      "Smooth transitions",
      "Assignment success",
      "Family satisfaction",
    ],
  },

  // Performance - Probation
  {
    id: "probation-extension",
    name: "Probation Period Extension",
    description: "Manage probation extensions with proper documentation",
    category: workflowCategories[2],
    tags: ["probation", "performance", "compliance"],
    icon: "📅",
    ...createWorkflowNodes({
      trigger: {
        type: "PROBATION_EXTENSION_INITIATED",
        config: {},
      },
      actions: [
        {
          type: "document_reasons",
          config: {
            template: "extension_letter",
            reasonsRequired: true,
            improvementPlan: true,
          },
        },
        {
          type: "gain_approvals",
          config: {
            manager: true,
            hr: true,
            employeeAcknowledgment: true,
          },
        },
        {
          type: "schedule_reviews",
          config: {
            frequency: "biweekly",
            duration: "extension_period",
          },
        },
        {
          type: "final_decision_reminder",
          config: {
            daysBeforeEnd: 7,
            escalate: true,
          },
        },
      ],
    }),
    config: { customizable: ["extension_length", "review_frequency"] },
    benefits: [
      "Fair probation process",
      "Clear expectations",
      "Legal protection",
    ],
  },

  // Leave - Special
  {
    id: "parental-leave-planning",
    name: "Parental Leave Planning & Support",
    description: "Complete parental leave management (NZ compliant)",
    category: workflowCategories[1],
    tags: ["leave", "parental", "nz-law"],
    icon: "👶",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "PARENTAL_LEAVE_REQUESTED",
        config: {},
      },
      delays: [{ days: -42 }], // 6 weeks before
      actions: [
        {
          type: "confirm_eligibility",
          config: {
            checkTenure: true,
            checkHours: true,
            governmentPayment: true,
          },
        },
        {
          type: "plan_coverage",
          config: {
            backfill: true,
            redistribute: true,
            temporary: "if_needed",
          },
        },
        {
          type: "maintain_connection",
          config: {
            keepInLoopOptional: true,
            companyUpdates: true,
          },
        },
        {
          type: "plan_return",
          config: {
            flexibleOptions: true,
            supportProgram: true,
          },
        },
      ],
    }),
    config: { customizable: ["leave_length", "support_level"] },
    benefits: [
      "NZ law compliance",
      "Parent support",
      "Higher retention",
    ],
  },

  // Compliance - Training
  {
    id: "mandatory-training-compliance",
    name: "Mandatory Training Enforcement",
    description: "Ensure completion of required training",
    category: workflowCategories[3],
    tags: ["training", "compliance", "enforcement"],
    icon: "🎓",
    ...createWorkflowNodes({
      trigger: {
        type: "TRAINING_DUE",
        config: { type: "mandatory" },
      },
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email", "slack"],
            recipientType: "employee",
            subject: "Required Training Due",
            message: "Please complete {{training.name}} by {{deadline}}",
          },
        },
        {
          type: "send_reminders",
          config: {
            schedule: [7, 3, 1, 0], // days before
            escalate: "manager",
          },
        },
        {
          type: "restrict_if_overdue",
          config: {
            gracePeriod: 3,
            limitation: "system_warning",
          },
        },
        {
          type: "report_compliance",
          config: {
            toManagement: true,
            includeNonCompliant: true,
          },
        },
      ],
    }),
    config: { customizable: ["reminder_schedule", "enforcement_level"] },
    benefits: [
      "100% training compliance",
      "Reduced risk",
      "Audit readiness",
    ],
  },

  // Offboarding - Security
  {
    id: "access-revocation",
    name: "System Access Revocation",
    description: "Immediate and secure access removal on termination",
    category: workflowCategories[4],
    tags: ["offboarding", "security", "it"],
    icon: "🔐",
    ...createWorkflowNodes({
      trigger: {
        type: "TERMINATION_EFFECTIVE",
        config: {},
      },
      actions: [
        {
          type: "disable_accounts",
          config: {
            systems: ["email", "slack", "hris", "vpn"],
            immediate: true,
          },
        },
        {
          type: "retrieve_assets",
          config: {
            items: ["laptop", "phone", "cards", "keys"],
            deadline: 1,
          },
        },
        {
          type: "backup_data",
          config: {
            emails: 30, // days retention
            files: true,
            transferOwnership: "manager",
          },
        },
        {
          type: "security_audit",
          config: {
            checkAccess: true,
            confirmRevocation: true,
          },
        },
      ],
    }),
    config: { customizable: ["systems", "retention_periods"] },
    benefits: [
      "Security maintained",
      "No data loss",
      "Compliance assured",
    ],
  },

  // Compliance - Contracts
  {
    id: "contract-renewal-tracking",
    name: "Fixed-Term Contract Renewals",
    description: "Proactive management of contract end dates",
    category: workflowCategories[3],
    tags: ["contracts", "compliance", "retention"],
    icon: "📋",
    ...createWorkflowNodes({
      trigger: {
        type: "CONTRACT_EXPIRING",
        config: { daysBefore: 60 },
      },
      actions: [
        {
          type: "notify_stakeholders",
          config: {
            manager: true,
            hr: true,
            employee: 30, // days before
          },
        },
        {
          type: "review_performance",
          config: {
            quickReview: true,
            renewalRecommendation: true,
          },
        },
        {
          type: "prepare_renewal",
          config: {
            template: "contract_extension",
            termsReview: true,
          },
        },
        {
          type: "obtain_signatures",
          config: {
            deadline: 14, // days before expiry
            digitalSignature: true,
          },
        },
      ],
    }),
    config: { customizable: ["notification_schedule", "renewal_process"] },
    benefits: [
      "No unwanted contract lapses",
      "Retain valuable contractors",
      "Continuous workforce planning",
    ],
  },

  // Performance - Underperformance
  {
    id: "early-warning-system",
    name: "Performance Early Warning System",
    description: "Detect and address performance concerns early",
    category: workflowCategories[2],
    tags: ["performance", "support", "retention"],
    icon: "📉",
    ...createWorkflowNodes({
      trigger: {
        type: "PERFORMANCE_ALERT",
        config: { 
          triggers: ["missed_deadlines", "quality_issues", "low_engagement"],
        },
      },
      actions: [
        {
          type: "notify_manager",
          config: {
            confidential: true,
            suggestActions: true,
          },
        },
        {
          type: "schedule_check_in",
          config: {
            within: 3,
            informal: true,
            supportFocus: true,
          },
        },
        {
          type: "provide_resources",
          config: {
            coaching: true,
            training: true,
            wellnessSupport: true,
          },
        },
        {
          type: "track_improvement",
          config: {
            period: 30,
            escalateIfNoImprovement: true,
          },
        },
      ],
    }),
    config: { customizable: ["alert_triggers", "support_options"] },
    benefits: [
      "Early intervention",
      "Prevented terminations",
      "Improved performance",
    ],
  },

  // Engagement - Onboarding feedback
  {
    id: "onboarding-feedback-loop",
    name: "New Hire Experience Feedback",
    description: "Continuous improvement of onboarding process",
    category: workflowCategories[5],
    tags: ["onboarding", "feedback", "improvement"],
    icon: "💭",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_START_DATE",
        config: {},
      },
      delays: [{ days: 30 }, { days: 60 }, { days: 90 }],
      actions: [
        {
          type: "send_survey",
          config: {
            formId: "onboarding_nps",
            anonymous: false,
            topics: ["clarity", "support", "resources", "culture_fit"],
          },
        },
        {
          type: "analyze_feedback",
          config: {
            trends: true,
            departmentComparison: true,
          },
        },
        {
          type: "action_improvements",
          config: {
            assignToHR: true,
            trackImplementation: true,
          },
        },
      ],
    }),
    config: { customizable: ["survey_schedule", "questions"] },
    benefits: [
      "Continuously improving onboarding",
      "Higher new hire satisfaction",
      "Better retention rates",
    ],
  },

  // Leave - Time off
  {
    id: "lieu-time-management",
    name: "Time in Lieu (TOIL) Management",
    description: "Track and manage overtime compensation",
    category: workflowCategories[1],
    tags: ["time", "overtime", "compliance"],
    icon: "⏱️",
    ...createWorkflowNodes({
      trigger: {
        type: "OVERTIME_WORKED",
        config: {},
      },
      actions: [
        {
          type: "calculate_toil",
          config: {
            rate: 1.5,
            round: "nearest_15_min",
          },
        },
        {
          type: "add_to_balance",
          config: {
            system: "leave_management",
            expiryPeriod: 90,
          },
        },
        {
          type: "notify_employee",
          config: {
            channels: ["email"],
            includeBalance: true,
            reminderToUse: true,
          },
        },
      ],
    }),
    config: { customizable: ["toil_rate", "expiry_period"] },
    benefits: [
      "Fair compensation",
      "Better work-life balance",
      "Compliance tracking",
    ],
  },

  // Health & Safety - Emergency
  {
    id: "emergency-contact-verification",
    name: "Emergency Contact Updates",
    description: "Regular verification of emergency contact information",
    category: workflowCategories[6],
    tags: ["safety", "emergency", "compliance"],
    icon: "🚨",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 6,12 *" }, // Biannual
      },
      actions: [
        {
          type: "request_verification",
          config: {
            formId: "emergency_contacts",
            deadline: 14,
          },
        },
        {
          type: "flag_outdated",
          config: {
            olderThan: 12, // months
            requireUpdate: true,
          },
        },
        {
          type: "remind_incomplete",
          config: {
            schedule: [7, 3, 1],
            escalateToManager: true,
          },
        },
      ],
    }),
    config: { customizable: ["verification_frequency"] },
    benefits: [
      "Updated emergency contacts",
      "Duty of care compliance",
      "Peace of mind",
    ],
  },

  // Offboarding - Redundancy
  {
    id: "redundancy-process-nz",
    name: "Redundancy Process (NZ Law Compliant)",
    description: "Fair and legally compliant redundancy process",
    category: workflowCategories[4],
    tags: ["offboarding", "redundancy", "nz-law"],
    icon: "⚖️",
    ...createWorkflowNodes({
      trigger: {
        type: "REDUNDANCY_PROPOSED",
        config: {},
      },
      actions: [
        {
          type: "consultation_process",
          config: {
            genuine: true,
            alternatives: ["redeployment", "reduction"],
            timeline: 14, // minimum days
          },
        },
        {
          type: "calculate_entitlements",
          config: {
            redundancyPay: true,
            notice: true,
            leave: true,
          },
        },
        {
          type: "provide_support",
          config: {
            outplacement: true,
            cvReview: true,
            references: true,
          },
        },
        {
          type: "process_final_pay",
          config: {
            timing: "last_day",
            documentation: "comprehensive",
          },
        },
      ],
    }),
    config: { customizable: ["consultation_period", "support_package"] },
    benefits: [
      "Legal compliance",
      "Fair treatment",
      "Reduced litigation risk",
    ],
  },

  // Engagement - Onboarding
  {
    id: "first-day-excellence",
    name: "Perfect First Day Experience",
    description: "Orchestrate an unforgettable first day",
    category: workflowCategories[5],
    tags: ["onboarding", "experience", "culture"],
    icon: "🌟",
    isPopular: true,
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_START_DATE",
        config: { daysOffset: 0 },
      },
      branches: [{ type: "parallel" }],
      actions: [
        {
          type: "send_welcome_package",
          config: {
            swag: true,
            personalNote: true,
            scheduleOverview: true,
          },
        },
        {
          type: "coordinate_workspace",
          config: {
            desk: true,
            equipment: true,
            supplies: true,
          },
        },
        {
          type: "schedule_introductions",
          config: {
            team: true,
            key_stakeholders: true,
            lunch: true,
          },
        },
        {
          type: "assign_first_task",
          config: {
            meaningful: true,
            achievable: true,
            winnable: true,
          },
        },
      ],
    }),
    config: { customizable: ["welcome_package", "first_day_agenda"] },
    benefits: [
      "Memorable first impression",
      "Faster integration",
      "Higher early engagement",
    ],
  },

  // Performance - Career
  {
    id: "career-development-planning",
    name: "Individual Career Development Plans",
    description: "Structured career planning and growth tracking",
    category: workflowCategories[2],
    tags: ["development", "career", "retention"],
    icon: "🚀",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 1 *" }, // Annually
      },
      actions: [
        {
          type: "career_conversation",
          config: {
            manager: true,
            aspirations: true,
            timeline: "3_5_years",
          },
        },
        {
          type: "create_development_plan",
          config: {
            skills: true,
            experiences: true,
            milestones: true,
          },
        },
        {
          type: "identify_opportunities",
          config: {
            projects: true,
            rotations: true,
            mentorship: true,
          },
        },
        {
          type: "track_progress",
          config: {
            quarterly_reviews: true,
            adjust_as_needed: true,
          },
        },
      ],
    }),
    config: { customizable: ["planning_frequency", "development_options"] },
    benefits: [
      "Clear career paths",
      "Improved retention",
      "Internal mobility",
    ],
  },

  // Compliance - Audit
  {
    id: "wage-hour-compliance",
    name: "Wage & Hour Compliance Monitoring",
    description: "Ensure compliance with minimum wage and hour laws",
    category: workflowCategories[3],
    tags: ["compliance", "payroll", "nz-law"],
    icon: "💵",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 3 1 * *" }, // Monthly
      },
      actions: [
        {
          type: "audit_hours",
          config: {
            checkMinimumWage: true,
            checkMaxHours: true,
            checkBreaks: true,
          },
        },
        {
          type: "flag_violations",
          config: {
            threshold: "any_violation",
            urgent: true,
          },
        },
        {
          type: "investigate_issues",
          config: {
            assignToHR: true,
            rootCause: true,
          },
        },
        {
          type: "remediate",
          config: {
            backpay: true,
            preventRecurrence: true,
          },
        },
      ],
    }),
    config: { customizable: ["audit_frequency", "thresholds"] },
    benefits: [
      "Legal compliance",
      "Fair compensation",
      "Avoided penalties",
    ],
  },

  // Engagement - Recognition
  {
    id: "milestone-celebrations",
    name: "Employment Milestone Recognition",
    description: "Celebrate 1, 5, 10+ year anniversaries with impact",
    category: workflowCategories[5],
    tags: ["recognition", "retention", "culture"],
    icon: "🏆",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 * * *" }, // Daily check
      },
      conditions: [
        {
          type: "anniversary",
          config: {
            years: [1, 5, 10, 15, 20, 25],
          },
        },
      ],
      actions: [
        {
          type: "prepare_recognition",
          config: {
            1: "card_and_gift",
            5: "award_and_celebration",
            10: "special_event_and_bonus",
          },
        },
        {
          type: "leadership_message",
          config: {
            personalized: true,
            highlight_contributions: true,
          },
        },
        {
          type: "company_announcement",
          config: {
            channels: ["all_hands", "newsletter"],
            photo: true,
          },
        },
      ],
    }),
    config: { customizable: ["recognition_tiers", "gift_budgets"] },
    benefits: [
      "Valued long-term employees",
      "Improved retention",
      "Positive culture",
    ],
  },

  // Leave - Compliance
  {
    id: "minimum-leave-enforcement",
    name: "Minimum Annual Leave Enforcement",
    description: "Ensure employees take minimum required leave (NZ)",
    category: workflowCategories[1],
    tags: ["leave", "compliance", "wellbeing"],
    icon: "🏖️",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 */2 *" }, // Bimonthly
      },
      conditions: [
        {
          type: "leave_taken",
          config: {
            operator: "<",
            value: 10, // days per year pro-rata
          },
        },
      ],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Time to Take a Break!",
            message: "You haven't taken enough leave. Plan some time off!",
          },
        },
        {
          type: "notify_manager",
          config: {
            encourage: true,
            scheduleConversation: true,
          },
        },
        {
          type: "escalate_if_persistent",
          config: {
            threshold: 6, // months
            escalateTo: "hr",
            mandatoryLeave: "last_resort",
          },
        },
      ],
    }),
    config: { customizable: ["minimum_days", "enforcement_level"] },
    benefits: [
      "Wellbeing protected",
      "Compliance with rest requirements",
      "Reduced burnout",
    ],
  },

  // Payroll - Tax
  {
    id: "tax-code-verification",
    name: "Tax Code Accuracy & IRD Compliance",
    description: "Ensure correct tax codes and IRD submissions",
    category: workflowCategories[7],
    tags: ["payroll", "tax", "ird", "nz-specific"],
    icon: "🧾",
    ...createWorkflowNodes({
      trigger: {
        type: "SCHEDULED",
        config: { schedule: "0 9 1 3 *" }, // March - start of tax year
      },
      actions: [
        {
          type: "verify_tax_codes",
          config: {
            requestConfirmation: true,
            flagUnusual: true,
          },
        },
        {
          type: "update_ird",
          config: {
            emsSubmission: true,
            paydayFiling: true,
          },
        },
        {
          type: "generate_summaries",
          config: {
            employeePaymentSummaries: true,
            deadline: "March 31",
          },
        },
      ],
    }),
    config: { customizable: ["verification_frequency"] },
    benefits: [
      "IRD compliance",
      "Accurate tax withholding",
      "Avoided penalties",
    ],
  },

  // Offboarding - Retirement
  {
    id: "retirement-planning",
    name: "Employee Retirement Support",
    description: "Thoughtful retirement planning and transition",
    category: workflowCategories[4],
    tags: ["offboarding", "retirement", "support"],
    icon: "🎊",
    ...createWorkflowNodes({
      trigger: {
        type: "RETIREMENT_ANNOUNCED",
        config: {},
      },
      delays: [{ days: -180 }], // 6 months before
      actions: [
        {
          type: "plan_transition",
          config: {
            knowledge_transfer: 120, // days
            recruitment: true,
            overlap: "if_possible",
          },
        },
        {
          type: "benefits_counseling",
          config: {
            kiwisaver: true,
            healthInsurance: true,
            pension: true,
          },
        },
        {
          type: "plan_celebration",
          config: {
            event: true,
            recognition: true,
            gift: true,
          },
        },
        {
          type: "maintain_connection",
          config: {
            alumni: true,
            consultingOpp: true,
          },
        },
      ],
    }),
    config: { customizable: ["transition_period", "celebration_type"] },
    benefits: [
      "Dignified retirement",
      "Knowledge preserved",
      "Positive legacy",
    ],
  },

  // Compliance - Document Management  
  {
    id: "qualification-verification",
    name: "Professional Qualification Verification",
    description: "Verify and track professional certifications",
    category: workflowCategories[3],
    tags: ["compliance", "qualifications", "verification"],
    icon: "🎓",
    ...createWorkflowNodes({
      trigger: {
        type: "EMPLOYEE_CREATED",
        config: {},
      },
      conditions: [
        {
          type: "custom_field",
          config: {
            field: "requiresProfessionalRegistration",
            operator: "equals",
            value: true,
          },
        },
      ],
      actions: [
        {
          type: "request_proof",
          config: {
            documents: ["certificate", "registration", "practicing_certificate"],
            deadline: 7,
          },
        },
        {
          type: "verify_with_authority",
          config: {
            authorities: ["nzqa", "professional_bodies"],
            automated: true,
          },
        },
        {
          type: "track_renewals",
          config: {
            expiryMonitoring: true,
            reminders: [60, 30, 14],
          },
        },
      ],
    }),
    config: { customizable: ["required_qualifications", "verification_method"] },
    benefits: [
      "Verified credentials",
      "Regulatory compliance",
      "Quality assurance",
    ],
  },

  // Performance - Mentorship
  {
    id: "mentorship-program",
    name: "Automated Mentorship Matching",
    description: "AI-powered mentor matching and program management",
    category: workflowCategories[2],
    tags: ["development", "mentorship", "growth"],
    icon: "🤝",
    ...createWorkflowNodes({
      trigger: {
        type: "MENTORSHIP_REQUEST",
        config: {},
      },
      actions: [
        {
          type: "match_mentor",
          config: {
            criteria: ["experience", "skills", "availability", "personality"],
            algorithm: "smart_match",
          },
        },
        {
          type: "introduce_pair",
          config: {
            kickoffMeeting: true,
            program_guidelines: true,
          },
        },
        {
          type: "schedule_checkIns",
          config: {
            frequency: "monthly",
            duration: 6, // months
          },
        },
        {
          type: "measure_success",
          config: {
            surveys: true,
            goalProgress: true,
          },
        },
      ],
    }),
    config: { customizable: ["matching_criteria", "program_duration"] },
    benefits: [
      "Better matching success",
      "Career development",
      "Knowledge sharing",
    ],
  },

  // Engagement - Internal Mobility
  {
    id: "internal-job-posting",
    name: "Internal Job Posting & Application",
    description: "Promote internal career opportunities",
    category: workflowCategories[5],
    tags: ["recruitment", "mobility", "retention"],
    icon: "📢",
    ...createWorkflowNodes({
      trigger: {
        type: "JOB_POSTED",
        config: { internal: true },
      },
      actions: [
        {
          type: "notify_qualified",
          config: {
            matchSkills: true,
            matchInterests: true,
            deadline: 14,
          },
        },
        {
          type: "process_applications",
          config: {
            managerNotification: true,
            fairProcess: true,
          },
        },
        {
          type: "provide_feedback",
          config: {
            all_applicants: true,
            constructive: true,
            developmentSuggestions: true,
          },
        },
      ],
    }),
    config: { customizable: ["notification_criteria", "timeline"] },
    benefits: [
      "Internal talent utilization",
      "Career growth opportunities",
      "Lower external hiring costs",
    ],
  },
];

// Helper function to get workflows by category
export function getWorkflowsByCategory(categoryId: string): WorkflowTemplate[] {
  return workflowTemplates.filter(w => w.category.id === categoryId);
}

// Helper function to get popular workflows
export function getPopularWorkflows(limit: number = 5): WorkflowTemplate[] {
  return workflowTemplates
    .filter(w => w.isPopular)
    .slice(0, limit);
}

// Helper function to search workflows
export function searchWorkflows(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(w => 
    w.name.toLowerCase().includes(lowerQuery) ||
    w.description.toLowerCase().includes(lowerQuery) ||
    w.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

// Export for use in components
export default {
  categories: workflowCategories,
  templates: workflowTemplates,
  getByCategory: getWorkflowsByCategory,
  getPopular: getPopularWorkflows,
  search: searchWorkflows,
};
