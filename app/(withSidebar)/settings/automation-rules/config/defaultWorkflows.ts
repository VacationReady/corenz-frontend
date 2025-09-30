export const defaultWorkflows = [
  {
    id: "90-day-trial",
    name: "90-Day Trial Period Reminder",
    description:
      "Automated reminders for New Zealand employment trial periods with manager notifications",
    category: "compliance",
    icon: "⚖️",
    tags: ["new-starter", "compliance", "nz-law"],
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 100 },
        data: { label: "Employee Start Date", config: { triggerType: "EMPLOYEE_START_DATE" } },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 100, y: 260 },
        data: {
          label: "Schedule Reminder",
          actionType: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "manager",
            subject: "90-day trial check-in",
            message: "Please review the employee during their 90-day trial period.",
          },
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "action-1" },
    ],
    config: {},
  },
  {
    id: "expiring-docs",
    name: "Expiring Documents Reminder",
    description: "Remind employees to update expiring documents 30 days prior",
    category: "compliance",
    icon: "📄",
    tags: ["documents", "compliance"],
    nodes: [],
    edges: [],
    config: {},
  },
  {
    id: "welcome-new-starter",
    name: "Welcome New Starter",
    description: "Send welcome email and create manager task",
    category: "hr",
    icon: "👋",
    tags: ["onboarding", "communication"],
    nodes: [],
    edges: [],
    config: {},
  },
  { id: "form-followup", name: "Form Submission Follow-up", description: "Create task after form submission", category: "operations", icon: "📝", tags: [], nodes: [], edges: [], config: {} },
  { id: "leave-approval", name: "Leave Request Approval", description: "Auto-route leave approvals", category: "hr", icon: "🏝️", tags: [], nodes: [], edges: [], config: {} },
  { id: "contract-expiry", name: "Fixed-term Contract Expiry", description: "Notify HR and manager ahead of expiry", category: "compliance", icon: "📅", tags: [], nodes: [], edges: [], config: {} },
  { id: "performance-review", name: "Performance Review Completed", description: "Trigger follow-up actions", category: "engagement", icon: "⭐", tags: [], nodes: [], edges: [], config: {} },
  { id: "probation-checkins", name: "Probation Check-ins", description: "Schedule 30/60/90 day check-ins", category: "hr", icon: "⏱️", tags: [], nodes: [], edges: [], config: {} },
  { id: "offboarding-sequence", name: "Offboarding Sequence", description: "Coordinate offboarding tasks and access removal", category: "operations", icon: "🚪", tags: [], nodes: [], edges: [], config: {} },
  { id: "anniversary-celebration", name: "Work Anniversary", description: "Send celebration message and badge", category: "engagement", icon: "🎉", tags: [], nodes: [], edges: [], config: {} },
];


