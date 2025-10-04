/**
 * AI-Powered Workflow Generator
 * Converts natural language to workflow node/edge definitions
 * with conversational multi-turn interactions
 */

import { openai, AI_CONFIG } from "./openai-client";
import { Node, Edge } from "reactflow";
import { actionTypes } from "@/(withSidebar)/settings/automation-rules/config/actionTypes";
import { conditionTypes } from "@/(withSidebar)/settings/automation-rules/config/conditionTypes";
import { prisma } from "@/lib/prisma";

export interface WorkflowGenerationResult {
  success: boolean;
  workflow?: {
    name: string;
    description: string;
    nodes: Node[];
    edges: Edge[];
    category?: string;
    estimatedTime?: string;
  };
  explanation?: string;
  error?: string;
  clarification?: string;
}

// Available trigger types from your system - Enhanced and matured
const TRIGGER_TYPES = [
  // Employee Lifecycle Triggers
  "EMPLOYEE_CREATED",
  "EMPLOYEE_START_DATE",
  "EMPLOYEE_UPDATED",
  "EMPLOYEE_DEPARTMENT_CHANGED",
  "EMPLOYEE_ROLE_CHANGED",
  "EMPLOYEE_SALARY_CHANGED",
  "EMPLOYEE_MANAGER_CHANGED",
  "EMPLOYEE_STATUS_CHANGED",
  "EMPLOYEE_TERMINATED",
  "EMPLOYEE_RESIGNED",
  "EMPLOYEE_RETIRED",
  
  // Contract & Document Triggers
  "CONTRACT_EXPIRING",
  "CONTRACT_RENEWED",
  "CONTRACT_TERMINATED",
  "DOCUMENT_EXPIRING",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_SIGNED",
  "DOCUMENT_REJECTED",
  "DOCUMENT_APPROVED",
  "COMPLIANCE_CHECK_FAILED",
  "COMPLIANCE_CHECK_PASSED",
  
  // Performance & Review Triggers
  "PROBATION_ENDING",
  "PROBATION_EXTENDED",
  "PROBATION_COMPLETED",
  "PERFORMANCE_REVIEW_DUE",
  "PERFORMANCE_REVIEW_COMPLETED",
  "PERFORMANCE_GOAL_SET",
  "PERFORMANCE_GOAL_ACHIEVED",
  "PERFORMANCE_IMPROVEMENT_PLAN_STARTED",
  "PERFORMANCE_IMPROVEMENT_PLAN_COMPLETED",
  
  // Leave & Time Management Triggers
  "LEAVE_REQUEST_SUBMITTED",
  "LEAVE_REQUEST_APPROVED",
  "LEAVE_REQUEST_REJECTED",
  "LEAVE_REQUEST_CANCELLED",
  "LEAVE_BALANCE_LOW",
  "LEAVE_BALANCE_ZERO",
  "LEAVE_TAKEN",
  "LEAVE_RETURNED",
  "OVERTIME_RECORDED",
  "ATTENDANCE_IRREGULAR",
  
  // Training & Development Triggers
  "TRAINING_ASSIGNED",
  "TRAINING_COMPLETED",
  "TRAINING_OVERDUE",
  "CERTIFICATION_EXPIRING",
  "CERTIFICATION_RENEWED",
  "SKILL_ASSESSMENT_DUE",
  "SKILL_ASSESSMENT_COMPLETED",
  "CAREER_DEVELOPMENT_PLAN_CREATED",
  
  // Form & Survey Triggers
  "FORM_SUBMITTED",
  "FORM_OVERDUE",
  "SURVEY_COMPLETED",
  "SURVEY_RESPONSE_RECEIVED",
  "FEEDBACK_SUBMITTED",
  "EXIT_INTERVIEW_COMPLETED",
  "ONBOARDING_STEP_COMPLETED",
  "ONBOARDING_STEP_OVERDUE",
  
  // System & Integration Triggers
  "SCHEDULED",
  "MANUAL",
  "WEBHOOK_RECEIVED",
  "API_CALL_RECEIVED",
  "DATA_SYNC_COMPLETED",
  "BACKUP_COMPLETED",
  "SYSTEM_MAINTENANCE_STARTED",
  "SYSTEM_MAINTENANCE_COMPLETED",
  
  // Communication Triggers
  "EMAIL_SENT",
  "EMAIL_OPENED",
  "EMAIL_CLICKED",
  "NOTIFICATION_SENT",
  "NOTIFICATION_READ",
  "MESSAGE_RECEIVED",
  "MEETING_SCHEDULED",
  "MEETING_CANCELLED",
  
  // Financial Triggers
  "PAYROLL_PROCESSED",
  "BONUS_AWARDED",
  "EXPENSE_SUBMITTED",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "BUDGET_EXCEEDED",
  "BUDGET_APPROVED",
  
  // Security & Compliance Triggers
  "SECURITY_BREACH_DETECTED",
  "ACCESS_GRANTED",
  "ACCESS_REVOKED",
  "PASSWORD_CHANGED",
  "TWO_FACTOR_ENABLED",
  "LOGIN_FAILED",
  "SUSPICIOUS_ACTIVITY",
  "AUDIT_TRAIL_CREATED",
];

// Build context for AI - Enhanced for conversational workflow building
function buildWorkflowContext() {
  return `You are a friendly HR automation assistant helping non-technical users build workflows.

Your job is to understand what they want to automate and ask simple, clear questions to build the workflow step-by-step.

WORKFLOW BUILDER UNDERSTANDING:
=================================

1. **TRIGGERS** (When should this workflow start?)
   Ask: "When should this happen?" or "What triggers this?"
   
   Available triggers with detailed explanations:
   - EMPLOYEE_CREATED: "When a new employee record is created in the system - this happens immediately when HR adds someone new"
   - EMPLOYEE_START_DATE: "On an employee's actual start date - perfect for onboarding workflows"
   - CONTRACT_EXPIRING: "When employee contracts are about to expire (configurable days before expiry)"
   - DOCUMENT_EXPIRING: "When important documents like passports, visas, or licenses expire soon"
   - PROBATION_ENDING: "When an employee's probation period is ending - great for performance reviews"
   - LEAVE_REQUEST_SUBMITTED: "When someone submits a leave request - triggers approval workflows"
   - FORM_SUBMITTED: "When any form is completed - can trigger follow-up actions"
   - SCHEDULED: "At specific times - daily reports, weekly reminders, monthly tasks"
   - MANUAL: "When someone manually starts it - for one-off processes"

2. **ACTIONS** (What should happen?)
   Ask: "What should happen next?" or "What would you like to do?"
   
   Available actions with detailed explanations:
   
   **Communication Actions:**
   - send_email: "Sends personalized emails with rich templates, attachments, and tracking. Supports {{firstName}}, {{department}}, {{salary}}, etc."
   - send_slack_message: "Sends messages to Slack channels/users with formatting, mentions, and file attachments"
   - send_teams_message: "Sends Microsoft Teams messages with rich cards and adaptive layouts"
   - send_sms: "Sends SMS notifications for urgent alerts or mobile-first communications"
   - send_whatsapp: "Sends WhatsApp Business messages for international teams"
   - send_notification: "Sends in-app notifications with priority levels, categories, and action buttons"
   - broadcast_announcement: "Sends company-wide announcements with targeting and read receipts"
   - send_reminder: "Sends timed reminders with escalation and snooze options"
   
   **Task & Workflow Actions:**
   - create_task: "Creates detailed tasks with assignees, due dates, priorities, and custom fields"
   - create_project: "Creates project templates with milestones, team assignments, and timelines"
   - assign_buddy: "Intelligently assigns onboarding buddies based on department, role, and availability"
   - create_checklist: "Generates personalized checklists for onboarding, offboarding, or processes"
   - schedule_meeting: "Books meetings with automatic room selection and attendee coordination"
   - schedule_performance_review: "Sets up comprehensive review cycles with 360 feedback"
   - create_escalation: "Escalates issues to managers or HR with automatic routing"
   - create_approval_workflow: "Creates multi-level approval processes with delegation"
   
   **Employee Data Actions:**
   - update_employee: "Updates any employee field with validation, audit trails, and notifications"
   - update_salary: "Handles salary changes with approval workflows and payroll integration"
   - change_department: "Transfers employees with automatic access updates and notifications"
   - change_manager: "Updates reporting structure with automatic team reassignment"
   - update_employment_status: "Changes employment status with compliance checks"
   - update_benefits: "Modifies benefit packages with enrollment period management"
   - update_working_hours: "Adjusts working patterns with overtime calculations"
   - update_location: "Changes work location with equipment and access updates"
   
   **Leave & Time Management:**
   - update_leave_balance: "Adjusts leave balances with accrual calculations and carry-over rules"
   - approve_leave: "Approves leave requests with automatic calendar updates and coverage planning"
   - reject_leave: "Rejects leave with detailed reasons and alternative suggestions"
   - create_leave_calendar: "Generates leave calendars with team visibility and conflict detection"
   - calculate_overtime: "Calculates overtime with policy compliance and payment integration"
   - track_attendance: "Monitors attendance patterns with anomaly detection"
   - schedule_shift: "Creates shift schedules with rotation and coverage optimization"
   
   **Training & Development:**
   - assign_training: "Assigns courses with prerequisites, deadlines, and progress tracking"
   - create_training_plan: "Develops personalized learning paths with skill assessments"
   - schedule_training: "Books training sessions with room and instructor management"
   - track_certifications: "Monitors certification expiry with renewal workflows"
   - create_skill_matrix: "Generates skill assessments with gap analysis"
   - assign_mentor: "Pairs employees with mentors based on goals and expertise"
   - create_career_plan: "Develops career progression plans with milestone tracking"
   
   **Document & Compliance:**
   - create_document: "Generates contracts, policies, reports with template customization"
   - request_signature: "Sends documents for electronic signature with legal compliance"
   - approve_document: "Approves documents with version control and audit trails"
   - archive_document: "Archives documents with retention policies and search indexing"
   - validate_compliance: "Runs compliance checks with regulatory updates"
   - create_audit_report: "Generates audit reports with evidence collection"
   - update_policy: "Updates policies with acknowledgment workflows"
   
   **Financial Actions:**
   - process_payroll: "Handles payroll calculations with tax compliance and reporting"
   - award_bonus: "Processes bonuses with approval workflows and tax calculations"
   - approve_expense: "Approves expenses with receipt validation and budget checks"
   - create_budget: "Generates budgets with forecasting and variance analysis"
   - calculate_benefits: "Computes benefit costs with enrollment changes"
   - process_reimbursement: "Handles reimbursements with approval chains"
   
   **Integration & Automation:**
   - webhook: "Sends data to external systems with retry logic and error handling"
   - api_call: "Makes API calls to external services with authentication and rate limiting"
   - data_sync: "Synchronizes data between systems with conflict resolution"
   - export_data: "Exports data in multiple formats with scheduling and delivery"
   - import_data: "Imports data with validation and error reporting"
   - backup_data: "Creates backups with encryption and retention policies"
   - monitor_system: "Monitors system health with alerting and reporting"
   
   **Advanced Actions:**
   - run_analytics: "Executes analytics queries with visualization and reporting"
   - generate_report: "Creates custom reports with scheduling and distribution"
   - create_dashboard: "Builds dashboards with real-time data and alerts"
   - predict_attrition: "Runs attrition prediction models with intervention suggestions"
   - optimize_scheduling: "Optimizes schedules using AI with constraints and preferences"
   - analyze_sentiment: "Analyzes communication sentiment with trend reporting"

   CRITICAL FOR EMAIL ACTIONS:
   When creating send_email actions, ALWAYS populate config with:
   - subject: Clear, professional email subject
   - body: Complete email message (personalized, warm, actionable)
   - to: Who receives it (e.g., "employee", "manager", "hr", or email address)
   
   Example email action node:
   {
     "id": "action-1",
     "type": "action",
     "position": { "x": 250, "y": 200 },
     "data": {
       "label": "Send Welcome Email",
       "icon": "✉️",
       "actionType": "send_email",
       "config": {
         "subject": "Welcome to the team!",
         "body": "Hi {{firstName}},\n\nWelcome to {{companyName}}! We're excited to have you join us.\n\nYour manager {{managerName}} will reach out soon to schedule your first meeting.\n\nBest regards,\n{{ceoName}}",
         "to": "employee"
       }
     }
   }

3. **CONDITIONS** (Should we check something first?)
   Ask: "Do you want to only do this for certain people?" or "Any conditions?"
   
   Available conditions with detailed explanations:
   
   **Basic Employee Filters:**
   - department_is: "Filters by department - only Sales, Engineering, Marketing, etc. Perfect for department-specific workflows"
   - job_role_is: "Filters by job role - only Managers, Developers, Analysts, etc. Role-based automation"
   - employment_type_is: "Filters by contract type - full-time, part-time, contractor, intern, casual"
   - employment_status_is: "Filters by status - active, inactive, on_leave, terminated, suspended"
   - location_is: "Filters by office location - remote, Auckland, Wellington, Sydney, etc."
   - manager_is: "Filters by who their manager is - only direct reports of specific managers"
   - team_is: "Filters by team membership - only members of specific teams or projects"
   
   **Advanced Employee Attributes:**
   - salary_range: "Filters by salary bracket - under_50k, 50k_100k, 100k_plus, executive_level"
   - tenure_range: "Filters by how long they've worked - new_hire (0-6m), established (6m-2y), veteran (2y+)"
   - age_range: "Filters by age groups - young (under_30), mid_career (30-50), senior (50+)"
   - education_level: "Filters by education - high_school, bachelor, master, phd, certification"
   - skill_has: "Filters by skills - has_python, has_leadership, has_project_management"
   - certification_has: "Filters by certifications - has_pmp, has_scrum_master, has_hr_certified"
   - language_speaks: "Filters by languages - speaks_spanish, speaks_mandarin, multilingual"
   
   **Time & Date Conditions:**
   - contract_end_date: "Checks contract expiry - expiring_soon (60d), expiring_this_quarter, never_expires"
   - start_date_range: "Filters by hire date - hired_last_month, hired_this_year, hired_before_date"
   - last_login_date: "Filters by system activity - active_user (7d), inactive_user (30d), never_logged_in"
   - last_performance_review: "Filters by review recency - reviewed_last_quarter, overdue_for_review"
   - birthday_month: "Filters by birth month - birthday_this_month, birthday_next_quarter"
   - anniversary_month: "Filters by work anniversary - anniversary_this_month, milestone_year (5y, 10y)"
   
   **Performance & Behavior:**
   - performance_rating: "Filters by performance - exceeds_expectations, meets_expectations, needs_improvement"
   - attendance_rate: "Filters by attendance - high_attendance (95%+), low_attendance (below_90%)"
   - leave_frequency: "Filters by leave patterns - frequent_leave_taker, rarely_takes_leave"
   - overtime_hours: "Filters by overtime - high_overtime (20h+), no_overtime, occasional_overtime"
   - training_completion: "Filters by training - completed_all_required, has_overdue_training"
   - goal_achievement: "Filters by goal performance - achieved_all_goals, missed_goals, exceeded_goals"
   
   **Leave & Time Conditions:**
   - leave_balance: "Filters by leave days - low_balance (under_5d), high_balance (over_20d), zero_balance"
   - leave_type_preference: "Filters by leave patterns - prefers_long_leave, prefers_short_leave"
   - probation_status: "Filters by probation - in_probation, completed_probation, probation_extended"
   - working_hours: "Filters by schedule - full_time, part_time, flexible_hours, shift_worker"
   - timezone_is: "Filters by timezone - NZST, AEST, PST, GMT, etc."
   
   **Compliance & Security:**
   - compliance_status: "Filters by compliance - compliant, non_compliant, pending_review"
   - document_status: "Filters by documents - all_documents_current, missing_documents, expired_documents"
   - security_clearance: "Filters by clearance level - public, confidential, secret, top_secret"
   - access_level: "Filters by system access - basic_user, power_user, admin, super_admin"
   - risk_level: "Filters by risk assessment - low_risk, medium_risk, high_risk"
   
   **Communication Preferences:**
   - communication_preference: "Filters by preferences - email_preferred, sms_preferred, app_notifications"
   - language_preference: "Filters by language - english_primary, bilingual, native_speaker"
   - timezone_preference: "Filters by preferred contact time - morning_person, evening_person"
   - notification_frequency: "Filters by notification settings - frequent_updates, weekly_digest, minimal_notifications"
   
   **Complex Multi-Conditions:**
   - and_condition: "Combines multiple conditions with AND logic - must meet ALL criteria"
   - or_condition: "Combines multiple conditions with OR logic - must meet ANY criteria"
   - not_condition: "Excludes employees meeting specific criteria"
   - custom_query: "Uses custom database queries for complex filtering"
   - dynamic_condition: "Conditions that change based on context or data"

4. **WORKFLOW STRUCTURE**
   - Start with ONE trigger
   - Add actions (what happens)
   - Optionally add conditions (filters)
   - Optionally add delays (wait before doing something)
   - Optionally add branches (if/else logic)
   - Optionally add loops (repeat actions)
   - Optionally add parallel processing (multiple actions simultaneously)
   - Optionally add data manipulation (transform data between steps)
   - Optionally add error handling (what to do if something fails)
   - Optionally add approval gates (human approval required)

5. **ADVANCED NODE TYPES**
   
   **Delay Nodes:**
   - fixed_delay: "Wait for a specific amount of time (hours, days, weeks)"
   - business_delay: "Wait until next business day, end of month, etc."
   - conditional_delay: "Wait based on conditions (e.g., until training completed)"
   - dynamic_delay: "Wait based on employee data (e.g., until probation period ends)"
   
   **Branch Nodes:**
   - simple_branch: "If/else logic based on single condition"
   - multi_branch: "Multiple paths based on different conditions"
   - switch_branch: "Route based on specific values (department, role, etc.)"
   - probability_branch: "Random routing with weighted probabilities"
   - time_branch: "Different paths based on time of day, day of week"
   
   **Loop Nodes:**
   - for_each: "Repeat action for each employee in a list"
   - while_loop: "Continue until condition is met"
   - retry_loop: "Retry failed actions with backoff"
   - batch_loop: "Process employees in batches"
   
   **Parallel Processing:**
   - parallel_actions: "Run multiple actions simultaneously"
   - parallel_conditions: "Check multiple conditions in parallel"
   - merge_results: "Combine results from parallel processes"
   - wait_for_all: "Wait for all parallel actions to complete"
   - wait_for_any: "Continue when any parallel action completes"
   
   **Data Manipulation:**
   - transform_data: "Convert data format, calculate values, format strings"
   - lookup_data: "Get additional data from external sources"
   - validate_data: "Check data quality and format"
   - aggregate_data: "Sum, count, average across employee groups"
   - filter_data: "Remove or include specific data fields"
   
   **Error Handling:**
   - try_catch: "Handle errors gracefully with fallback actions"
   - retry_with_backoff: "Retry failed actions with increasing delays"
   - escalate_on_error: "Send alerts when errors occur"
   - log_error: "Record errors for debugging and analysis"
   - skip_on_error: "Continue workflow even if some steps fail"
   
   **Approval Gates:**
   - manager_approval: "Require manager approval before proceeding"
   - hr_approval: "Require HR approval for sensitive actions"
   - multi_level_approval: "Require approval from multiple levels"
   - automatic_approval: "Auto-approve based on predefined rules"
   - delegated_approval: "Allow approval delegation when manager is away"

CONVERSATIONAL GUIDANCE:
========================

You are a friendly software engineer helping users build workflows. Be conversational and educational:

**Node Discovery & Capabilities:**
When users ask about specific nodes or capabilities, provide detailed explanations:
- "What triggers can I use?" → Explain all trigger types with examples
- "How do I filter employees?" → Show condition types with use cases  
- "What actions are available?" → List action categories with business value
- "How do I handle errors?" → Explain error handling nodes
- "Can I run things in parallel?" → Describe parallel processing options

**Conversational Workflow Building:**
Ask follow-up questions to guide users:
- "Great! So when should this workflow start? For example, when someone joins the company, or on a schedule?"
- "Perfect! Now, who should this apply to? Everyone, or just certain people like managers or specific departments?"
- "Excellent choice! What should happen next? Should we send an email, create a task, or update some information?"
- "That's a good start! Would you like to add any conditions? For instance, maybe only for people in probation, or only for certain departments?"
- "Nice! Should this happen right away, or would you like to wait a bit? Sometimes it's good to give people time to complete training first."
- "Almost done! Any final touches? Maybe add error handling, or require manager approval for sensitive changes?"

**Educational Responses:**
When explaining nodes, be like a mentor:
- "Ah, you're thinking about email notifications! The `send_email` action is perfect for that. It can personalize messages with employee data like their name, department, or manager."
- "Good question about filtering! You have lots of options. For example, `department_is` lets you target specific teams, while `tenure_range` helps you treat new hires differently from veterans."
- "Smart thinking about timing! The `delay` node gives you control. You can wait a fixed time, or wait until something happens, like training completion."
- "Great idea for error handling! The `try_catch` node will make your workflow robust. If an email fails, it can automatically try SMS instead."

**Technical Translation:**
Always translate technical terms to friendly language:
- "trigger" → "when should this start?"
- "action" → "what should happen?"
- "condition" → "who should this apply to?"
- "node" → "step"
- "edge" → "connection"
- "branch" → "decision point"
- "loop" → "repeat for multiple people"
- "parallel" → "do multiple things at once"

**Proactive Suggestions:**
Based on what they're building, suggest improvements:
- "That's a solid workflow! You might also want to add a condition to only send this to managers, or add a delay to give people time to prepare."
- "Good start! For something like this, you might also want to add error handling in case the email fails, and maybe track who received it."
- "Nice! You could make this even more powerful by adding parallel processing - send the email and create a task at the same time for faster execution."

TECHNICAL OUTPUT FORMAT:
========================

Generate ReactFlow nodes/edges:
- Triggers: y: 0, x: 250
- Each node: 200px below previous (give them space, no overlap!)
- Node IDs: trigger-1, action-1, condition-1, etc.
- Edges: { source, target, animated: true }

Node structure:
{
  id: string,
  type: "trigger" | "action" | "condition" | "delay" | "branch",
  position: { x: number, y: number },
  data: {
    label: string (user-friendly name),
    icon: string (emoji or icon name),
    triggerType/actionType/conditionType: string,
    config: { 
      // For email actions, ALWAYS include:
      subject: string (email subject line),
      body: string (email message content),
      to: string (recipient - e.g., "employee", "manager", "hr@company.com")
      // Other fields as needed
    }
  }
}`;
}

export async function generateWorkflow(
  prompt: string,
  companyId: string
): Promise<WorkflowGenerationResult> {
  try {
    // Check if the prompt is too vague and needs clarification
    const vaguePatterns = [
      /workflow for my boss/i,
      /workflow for.*boss/i,
      /create.*workflow/i,
      /make.*workflow/i,
      /build.*workflow/i,
      /workflow.*for/i,
    ];

    const isVague = vaguePatterns.some(pattern => pattern.test(prompt)) && 
                    prompt.length < 50; // Short prompts are likely vague

    if (isVague) {
      return {
        success: false,
        error: "CLARIFICATION_NEEDED",
        clarification: `I'd love to help you create a workflow! To build the right automation, I need a bit more detail:

**What should this workflow do for your boss?**

Here are some examples:
• "Send my boss a daily summary of new employees"
• "Alert my boss when contracts expire in 60 days"
• "Email my boss when someone requests leave"
• "Notify my boss about employees starting probation"

**Or tell me:**
• What triggers should start this workflow?
• What actions should happen?
• Who should receive notifications?

The more specific you are, the better I can help! 🚀`
      };
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: buildWorkflowContext(),
        },
        {
          role: "user",
          content: `Create a workflow for: "${prompt}"

Respond with JSON in this exact format:
{
  "name": "Workflow name",
  "description": "What this workflow does",
  "category": "custom",
  "estimatedTime": "Time saved per execution",
  "nodes": [/* array of node objects */],
  "edges": [/* array of edge objects */],
  "explanation": "DETAILED step-by-step explanation of what happens, including: 1) When this triggers, 2) Who it affects, 3) What actions occur, 4) What the outcome is, 5) How often it runs, 6) Who receives notifications"
}

EXPLANATION REQUIREMENTS:
- Be very specific about timing (when does this trigger?)
- Explain who receives what (emails, notifications, tasks)
- Describe the business value (what problem does this solve?)
- Mention any conditions or filters applied
- Explain the sequence of events clearly
- Use conversational, non-technical language

IMPORTANT:
- Always set category to "custom" for AI-generated workflows
- Start with exactly ONE trigger node
- Add at least ONE action node
- Use real action/condition IDs from the available lists
- Nodes flow vertically (increment y by 200 to avoid overlap!)
- All IDs are unique
- Use friendly, conversational labels for nodes
- For send_email actions: ALWAYS include subject, body, and to in config`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Force category to "custom" for AI-generated workflows
    aiResponse.category = "custom";

    // Validate the workflow structure
    const validationResult = validateWorkflow(aiResponse);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    return {
      success: true,
      workflow: {
        name: aiResponse.name,
        description: aiResponse.description,
        nodes: aiResponse.nodes,
        edges: aiResponse.edges,
        category: "custom", // Always custom for AI workflows
        estimatedTime: aiResponse.estimatedTime,
      },
      explanation: aiResponse.explanation,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate workflow",
    };
  }
}

// Save AI-generated workflow to database
export async function saveWorkflowToDatabase(
  workflow: any,
  userId: string,
  companyId: string
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert ReactFlow nodes/edges to workflow definition
    const workflowDefinition = {
      nodes: workflow.nodes,
      edges: workflow.edges,
    };

    // Create automation rule in database
    const automationRule = await prisma.automationRule.create({
      data: {
        id: workflowId,
        companyId,
        name: workflow.name,
        description: workflow.description || "AI-generated workflow",
        isActive: false, // Start inactive, user can activate
        triggerType: "MANUAL", // Default, will be updated based on trigger node
        triggerConfig: extractTriggerConfig(workflow.nodes),
        conditions: {},
        actions: extractActionsConfig(workflow.nodes),
        workflowDefinition,
        tags: ["ai-generated", "custom"],
        category: "custom", // Always save to custom category
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      workflowId: automationRule.id,
    };
  } catch (error: any) {
    console.error("[Save Workflow Error]", error);
    return {
      success: false,
      error: error.message || "Failed to save workflow",
    };
  }
}

// Extract trigger configuration from nodes
function extractTriggerConfig(nodes: any[]): any {
  const triggerNode = nodes.find(n => n.type === "trigger");
  if (!triggerNode) return {};
  
  return {
    type: triggerNode.data.triggerType,
    config: triggerNode.data.config || {},
  };
}

// Extract actions configuration from nodes
function extractActionsConfig(nodes: any[]): any {
  const actionNodes = nodes.filter(n => n.type === "action");
  
  return {
    actions: actionNodes.map(node => ({
      type: node.data.actionType,
      config: node.data.config || {},
    })),
  };
}

function validateWorkflow(workflow: any): { valid: boolean; error?: string } {
  // Check required fields
  if (!workflow.name || !workflow.nodes || !workflow.edges) {
    return { valid: false, error: "Missing required fields (name, nodes, edges)" };
  }

  // Must have at least one trigger
  const triggers = workflow.nodes.filter((n: any) => n.type === "trigger");
  if (triggers.length === 0) {
    return { valid: false, error: "Workflow must have at least one trigger node" };
  }

  // Must have at least one action
  const actions = workflow.nodes.filter((n: any) => n.type === "action");
  if (actions.length === 0) {
    return { valid: false, error: "Workflow must have at least one action node" };
  }

  // Validate node IDs are unique
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate node ID: ${node.id}` };
    }
    nodeIds.add(node.id);
  }

  // Validate edges reference existing nodes
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      return { valid: false, error: `Edge references non-existent source: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { valid: false, error: `Edge references non-existent target: ${edge.target}` };
    }
  }

  return { valid: true };
}

// Refine an existing workflow based on feedback
export async function refineWorkflow(
  existingWorkflow: any,
  refinementPrompt: string
): Promise<WorkflowGenerationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: buildWorkflowContext(),
        },
        {
          role: "user",
          content: `Here's an existing workflow:
${JSON.stringify(existingWorkflow, null, 2)}

Modify it based on this request: "${refinementPrompt}"

Return the complete updated workflow in the same JSON format.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    const validationResult = validateWorkflow(aiResponse);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    return {
      success: true,
      workflow: aiResponse,
      explanation: `Updated workflow: ${refinementPrompt}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Explain what an existing workflow does
export async function explainWorkflow(workflow: any): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `You explain HR workflows in simple, non-technical language. Be very detailed and specific about:
1. When the workflow triggers
2. Who it affects
3. What actions happen in sequence
4. What the business value is
5. Who receives notifications
6. How often it runs`,
        },
        {
          role: "user",
          content: `Provide a detailed explanation of this workflow:
${JSON.stringify(workflow, null, 2)}

Break it down into:
- **Trigger:** When does this start?
- **Process:** What happens step by step?
- **Outcome:** What's the result?
- **Business Value:** Why is this useful?
- **Frequency:** How often does this run?`,
        },
      ],
    });

    return completion.choices[0].message.content || "Unable to explain workflow";
  } catch (error) {
    return "Failed to generate explanation";
  }
}

// Handle conversational node discovery and guidance
export async function handleNodeDiscovery(query: string): Promise<{
  success: boolean;
  response: string;
  suggestions?: string[];
}> {
  const lowerQuery = query.toLowerCase();
  
  try {
    // Check if this is a node discovery question
    if (lowerQuery.includes('what triggers') || lowerQuery.includes('trigger types') || lowerQuery.includes('when can')) {
      return {
        success: true,
        response: `🚀 **Here are all the triggers you can use to start workflows:**

**Employee Lifecycle:**
• **New Employee:** When someone joins the company
• **Department Change:** When someone moves teams  
• **Salary Change:** When pay is updated
• **Manager Change:** When reporting structure changes
• **Employee Leaves:** When someone resigns or retires

**Performance & Reviews:**
• **Probation Ending:** When probation period is over
• **Performance Review Due:** When reviews are scheduled
• **Goals Achieved:** When someone hits their targets
• **Training Assigned:** When courses are given out

**Leave & Time:**
• **Leave Requested:** When someone wants time off
• **Leave Balance Low:** When someone has few days left
• **Overtime Recorded:** When extra hours are logged
• **Attendance Issues:** When someone is frequently absent

**Documents & Compliance:**
• **Contract Expiring:** When contracts need renewal
• **Documents Expiring:** When passports/visas expire
• **Training Overdue:** When required training is late

**System & Schedule:**
• **Scheduled Times:** Daily, weekly, monthly automation
• **Manual Trigger:** When someone starts it manually
• **External Systems:** When other tools send data

**What kind of workflow are you thinking about?** I can help you pick the perfect trigger! 🎯`,
        suggestions: [
          "Show me triggers for new employee onboarding",
          "What triggers work for leave management?",
          "How do I trigger workflows on a schedule?",
          "What about performance review triggers?"
        ]
      };
    }
    
    if (lowerQuery.includes('what actions') || lowerQuery.includes('action types') || lowerQuery.includes('what can happen')) {
      return {
        success: true,
        response: `⚡ **Here are all the actions your workflows can perform:**

**📧 Communication Actions:**
• **Send Email:** Personalized emails with employee data
• **Slack Messages:** Team notifications with formatting
• **SMS Alerts:** Urgent mobile notifications
• **Company Announcements:** Broadcast to everyone

**✅ Task & Project Management:**
• **Create Tasks:** Assign to-dos with deadlines
• **Create Projects:** Full project setup with milestones
• **Assign Buddies:** Pair new hires with mentors
• **Schedule Meetings:** Book rooms and send invites

**👤 Employee Data Management:**
• **Update Information:** Change any employee details
• **Department Transfers:** Move people between teams
• **Salary Changes:** Handle pay updates with approvals
• **Manager Changes:** Update reporting structure

**🏖️ Leave & Time Management:**
• **Approve/Reject Leave:** Handle time-off requests
• **Update Leave Balance:** Adjust available days
• **Calculate Overtime:** Compute extra hours and pay
• **Track Attendance:** Monitor attendance patterns

**📚 Training & Development:**
• **Assign Training:** Give out courses and certifications
• **Create Learning Plans:** Personalized development paths
• **Track Certifications:** Monitor expiry and renewals
• **Assign Mentors:** Pair people for career growth

**📄 Document & Compliance:**
• **Generate Documents:** Create contracts and reports
• **Request Signatures:** Electronic document signing
• **Compliance Checks:** Validate regulatory requirements
• **Audit Reports:** Generate compliance documentation

**💰 Financial Operations:**
• **Process Payroll:** Handle salary calculations
• **Award Bonuses:** Process performance rewards
• **Approve Expenses:** Handle expense reimbursements
• **Budget Management:** Track and control spending

**🔗 Integration & Automation:**
• **Webhook Calls:** Send data to external systems
• **API Integration:** Connect to other tools
• **Data Export:** Generate reports in multiple formats
• **System Monitoring:** Health checks and alerts

**What would you like your workflow to do?** I can help you choose the right actions! 🎯`,
        suggestions: [
          "Show me actions for employee onboarding",
          "What actions work for leave management?",
          "How do I send notifications to employees?",
          "What about updating employee data?"
        ]
      };
    }
    
    if (lowerQuery.includes('how do i filter') || lowerQuery.includes('conditions') || lowerQuery.includes('who should this apply')) {
      return {
        success: true,
        response: `🔍 **Here are all the ways you can filter who gets affected:**

**👥 Basic Employee Filters:**
• **By Department:** Only Sales, Engineering, Marketing, etc.
• **By Job Role:** Only Managers, Developers, Analysts, etc.
• **By Employment Type:** Full-time, part-time, contractor
• **By Location:** Remote, Auckland, Wellington, Sydney
• **By Manager:** Only people who report to specific managers

**📊 Advanced Employee Attributes:**
• **By Salary Range:** Different workflows for different pay levels
• **By Tenure:** New hires vs veterans (0-6m, 6m-2y, 2y+)
• **By Age Group:** Different policies for different ages
• **By Skills:** Only people with specific capabilities
• **By Certifications:** Only certified professionals

**📅 Time & Date Filters:**
• **Contract Expiry:** Only people whose contracts end soon
• **Hire Date:** Only people hired in specific timeframes
• **Last Login:** Only active or inactive users
• **Birthday Month:** Only people with birthdays this month
• **Work Anniversary:** Only people celebrating milestones

**⭐ Performance & Behavior:**
• **Performance Rating:** High performers, meets expectations, needs improvement
• **Attendance Rate:** People with good/poor attendance
• **Training Completion:** People with complete/overdue training
• **Goal Achievement:** People who hit/miss their targets

**🏖️ Leave & Time:**
• **Leave Balance:** People with high/low leave balances
• **Probation Status:** New employees still in probation
• **Working Hours:** Full-time, part-time, shift workers
• **Timezone:** People in specific time zones

**🛡️ Compliance & Security:**
• **Compliance Status:** Compliant vs non-compliant employees
• **Document Status:** People with missing/expired documents
• **Access Level:** Basic users vs admins vs super admins
• **Risk Level:** Low, medium, high risk employees

**🔗 Complex Combinations:**
• **AND Logic:** Must meet ALL criteria (e.g., Managers AND in Sales)
• **OR Logic:** Must meet ANY criteria (e.g., Managers OR high performers)
• **NOT Logic:** Exclude certain groups (e.g., Everyone EXCEPT contractors)

**Who should your workflow affect?** I can help you set up the perfect filters! 🎯`,
        suggestions: [
          "How do I filter by department only?",
          "Show me how to combine multiple filters",
          "What filters work for new employees?",
          "How do I exclude certain groups?"
        ]
      };
    }
    
    if (lowerQuery.includes('error handling') || lowerQuery.includes('what if something goes wrong')) {
      return {
        success: true,
        response: `🛡️ **Here's how to make your workflows bulletproof with error handling:**

**🔄 Retry Logic:**
• **Retry with Backoff:** If an email fails, wait a bit and try again
• **Exponential Backoff:** Wait longer between each retry attempt
• **Max Retries:** Stop trying after a certain number of attempts

**⬆️ Escalation:**
• **Notify IT Team:** Send alerts when system errors occur
• **Escalate to Manager:** Route issues to appropriate people
• **Create Support Ticket:** Automatically log issues for tracking

**🔄 Fallback Actions:**
• **Alternative Communication:** If email fails, try SMS instead
• **Backup Systems:** Use secondary systems if primary fails
• **Manual Override:** Allow humans to step in when needed

**📝 Logging & Tracking:**
• **Error Logs:** Record all failures for debugging
• **Audit Trail:** Track what went wrong and when
• **Performance Metrics:** Monitor workflow success rates

**⏭️ Graceful Degradation:**
• **Skip Failed Steps:** Continue workflow even if some parts fail
• **Partial Success:** Complete what you can, flag what failed
• **Alternative Paths:** Take different routes when primary fails

**🛡️ Prevention:**
• **Data Validation:** Check data quality before processing
• **Permission Checks:** Verify access before taking actions
• **Rate Limiting:** Avoid overwhelming external systems

**Want me to show you how to add error handling to your workflow?** I can help make it rock-solid! 🚀`,
        suggestions: [
          "Show me how to retry failed emails",
          "How do I handle missing employee data?",
          "What if the external system is down?",
          "How do I notify someone when errors happen?"
        ]
      };
    }
    
    if (lowerQuery.includes('parallel') || lowerQuery.includes('simultaneously') || lowerQuery.includes('at the same time')) {
      return {
        success: true,
        response: `⚡ **Here's how to make your workflows lightning-fast with parallel processing:**

**🚀 Parallel Actions:**
• **Send Multiple Emails:** Email manager, employee, and HR simultaneously
• **Create Tasks & Send Notifications:** Do both at the same time
• **Update Data & Generate Reports:** Process multiple actions together
• **API Calls:** Hit multiple external systems in parallel

**🔍 Parallel Conditions:**
• **Check Multiple Criteria:** Verify department AND role AND status together
• **Fast Filtering:** Screen large employee lists quickly
• **Complex Logic:** Handle sophisticated filtering without delays

**⏳ Synchronization Options:**
• **Wait for All:** Complete all parallel actions before continuing
• **Wait for Any:** Continue as soon as the first action finishes
• **Merge Results:** Combine data from multiple parallel processes

**🎯 Smart Routing:**
• **Branch Based on Results:** Take different paths based on parallel outcomes
• **Conditional Processing:** Only run certain actions if conditions are met
• **Dynamic Workflows:** Adapt based on real-time data

**📊 Performance Benefits:**
• **Faster Execution:** Reduce workflow time by 50-80%
• **Better User Experience:** Employees get faster responses
• **Efficient Resource Use:** Make better use of system capacity
• **Scalability:** Handle more employees without slowdowns

**Real-world Examples:**
• **Onboarding:** Send welcome email + assign buddy + create tasks + update systems all at once
• **Leave Approval:** Notify employee + manager + HR + update calendar + create coverage plan simultaneously
• **Performance Review:** Send reminders + prepare materials + schedule meetings + update records in parallel

**Want to see how to add parallel processing to your workflow?** I can help you speed it up! ⚡`,
        suggestions: [
          "Show me how to send emails and create tasks at the same time",
          "How do I check multiple conditions in parallel?",
          "What's the difference between 'wait for all' and 'wait for any'?",
          "How do I merge results from parallel actions?"
        ]
      };
    }
    
    // Default response for other queries
    return {
      success: false,
      response: "I'd be happy to help you learn about workflow capabilities! You can ask me about triggers, actions, conditions, error handling, parallel processing, or any other workflow topics. What would you like to know more about?"
    };
    
  } catch (error) {
    return {
      success: false,
      response: "I'm having trouble understanding your question about workflow capabilities. Could you try rephrasing it? I can help with triggers, actions, conditions, and more!"
    };
  }
}

// Generate detailed node explanations
export function explainNodeType(nodeType: string, nodeData: any): string {
  switch (nodeType) {
    case 'trigger':
      const triggerType = nodeData.triggerType;
      switch (triggerType) {
        // Employee Lifecycle Triggers
        case 'EMPLOYEE_CREATED':
          return "🚀 **Starts when:** A new employee is added to the system\n**Frequency:** Every time HR creates a new employee record\n**Use case:** Perfect for onboarding workflows";
        case 'EMPLOYEE_START_DATE':
          return "📅 **Starts when:** An employee's actual start date arrives\n**Frequency:** Once per employee on their start date\n**Use case:** Welcome emails, IT setup, first-day tasks";
        case 'EMPLOYEE_DEPARTMENT_CHANGED':
          return "🔄 **Starts when:** Employee moves to a different department\n**Frequency:** Every time department assignment changes\n**Use case:** Update access, notify new team, transfer equipment";
        case 'EMPLOYEE_SALARY_CHANGED':
          return "💰 **Starts when:** Employee salary is updated\n**Frequency:** Every time salary changes\n**Use case:** Update payroll, notify employee, update benefits";
        case 'EMPLOYEE_TERMINATED':
          return "🚪 **Starts when:** Employee is terminated\n**Frequency:** Every time termination is processed\n**Use case:** Offboarding, access revocation, final payments";
        
        // Contract & Document Triggers
        case 'CONTRACT_EXPIRING':
          return "⚠️ **Starts when:** Employee contracts are about to expire\n**Frequency:** Configurable days before expiry (e.g., 60 days)\n**Use case:** Renewal reminders, HR notifications";
        case 'DOCUMENT_EXPIRING':
          return "📄 **Starts when:** Important documents expire soon\n**Frequency:** Configurable days before expiry\n**Use case:** Renewal reminders, compliance alerts";
        case 'DOCUMENT_SIGNED':
          return "✍️ **Starts when:** Document is electronically signed\n**Frequency:** Every time signature is completed\n**Use case:** Archive documents, notify stakeholders";
        
        // Performance Triggers
        case 'PROBATION_ENDING':
          return "📋 **Starts when:** An employee's probation period is ending\n**Frequency:** Once per employee at probation end\n**Use case:** Performance reviews, permanent status updates";
        case 'PERFORMANCE_REVIEW_DUE':
          return "📊 **Starts when:** Performance review is scheduled\n**Frequency:** Based on review cycle (quarterly, annual)\n**Use case:** Send reminders, prepare review materials";
        case 'PERFORMANCE_GOAL_ACHIEVED':
          return "🎯 **Starts when:** Employee achieves performance goal\n**Frequency:** When goals are marked complete\n**Use case:** Recognition, reward processing, new goal setting";
        
        // Leave & Time Triggers
        case 'LEAVE_REQUEST_SUBMITTED':
          return "🏖️ **Starts when:** Someone submits a leave request\n**Frequency:** Every time someone requests leave\n**Use case:** Approval workflows, coverage planning";
        case 'LEAVE_BALANCE_LOW':
          return "📉 **Starts when:** Employee has low leave balance\n**Frequency:** When balance drops below threshold\n**Use case:** Encourage leave planning, wellness reminders";
        case 'OVERTIME_RECORDED':
          return "⏰ **Starts when:** Overtime hours are recorded\n**Frequency:** Every time overtime is logged\n**Use case:** Approval workflows, fatigue management";
        
        // Training Triggers
        case 'TRAINING_ASSIGNED':
          return "📚 **Starts when:** Training is assigned to employee\n**Frequency:** Every time training is assigned\n**Use case:** Send welcome emails, create learning plans";
        case 'TRAINING_COMPLETED':
          return "✅ **Starts when:** Training course is completed\n**Frequency:** When completion is recorded\n**Use case:** Issue certificates, update skills, assign next training";
        case 'TRAINING_OVERDUE':
          return "⚠️ **Starts when:** Training becomes overdue\n**Frequency:** When deadline passes without completion\n**Use case:** Send reminders, escalate to managers";
        
        // System Triggers
        case 'SCHEDULED':
          return "⏰ **Starts when:** At scheduled times (daily, weekly, monthly)\n**Frequency:** As configured (e.g., every Monday at 9 AM)\n**Use case:** Regular reports, recurring tasks";
        case 'MANUAL':
          return "👤 **Starts when:** Someone manually triggers the workflow\n**Frequency:** When manually executed\n**Use case:** One-off processes, emergency procedures";
        case 'WEBHOOK_RECEIVED':
          return "🔗 **Starts when:** External system sends webhook\n**Frequency:** When webhook is received\n**Use case:** Integration workflows, real-time sync";
        
        // Financial Triggers
        case 'PAYROLL_PROCESSED':
          return "💳 **Starts when:** Payroll run is completed\n**Frequency:** Every pay period\n**Use case:** Send payslips, update records, compliance reporting";
        case 'BONUS_AWARDED':
          return "🎁 **Starts when:** Bonus is approved and awarded\n**Frequency:** When bonus is processed\n**Use case:** Send notifications, update records, celebrate achievements";
        
        // Security Triggers
        case 'SECURITY_BREACH_DETECTED':
          return "🔒 **Starts when:** Security incident is detected\n**Frequency:** When security systems alert\n**Use case:** Immediate response, notifications, compliance reporting";
        case 'ACCESS_REVOKED':
          return "🚫 **Starts when:** Employee access is revoked\n**Frequency:** When access is removed\n**Use case:** Clean up resources, notify stakeholders, audit trail";
        
        default:
          return "🔄 **Trigger Node:** Starts the workflow when specific conditions are met";
      }
    
    case 'action':
      const actionType = nodeData.actionType;
      switch (actionType) {
        // Communication Actions
        case 'send_email':
          return `📧 **Email Action:** Sends personalized email to ${nodeData.config?.to || 'recipient'}\n**Subject:** ${nodeData.config?.subject || 'No subject'}\n**Personalization:** Uses employee data like {{firstName}}, {{department}}`;
        case 'send_slack_message':
          return "💬 **Slack Message:** Sends message to Slack channels or users\n**Features:** Formatting, mentions, file attachments\n**Integration:** Real-time team communication";
        case 'send_sms':
          return "📱 **SMS Notification:** Sends text message for urgent alerts\n**Use case:** Critical notifications, mobile-first communication\n**Delivery:** Instant mobile delivery";
        case 'send_notification':
          return "🔔 **In-App Notification:** Sends notification to user dashboard\n**Visibility:** Appears immediately in the system\n**Purpose:** Alerts, updates, reminders";
        case 'broadcast_announcement':
          return "📢 **Company Announcement:** Sends company-wide message\n**Targeting:** Can target specific groups or everyone\n**Tracking:** Read receipts and engagement metrics";
        
        // Task & Workflow Actions
        case 'create_task':
          return "✅ **Task Creation:** Creates a to-do item for someone\n**Purpose:** Follow-up actions, reminders, assignments\n**Tracking:** Tasks appear in user dashboards";
        case 'create_project':
          return "📋 **Project Creation:** Creates project with milestones and timelines\n**Includes:** Team assignments, deadlines, progress tracking\n**Management:** Full project lifecycle support";
        case 'assign_buddy':
          return "👥 **Buddy Assignment:** Pairs new employee with experienced team member\n**Purpose:** Onboarding support, mentorship\n**Automatic:** System finds suitable buddy";
        case 'create_escalation':
          return "⬆️ **Escalation:** Escalates issues to managers or HR\n**Routing:** Automatic routing based on issue type\n**Tracking:** Full escalation trail and resolution";
        case 'schedule_performance_review':
          return "📊 **Performance Review:** Sets up review meeting and sends invites\n**Includes:** Calendar invitations, preparation tasks\n**Timing:** Scheduled automatically";
        
        // Employee Data Actions
        case 'update_employee':
          return "👤 **Employee Update:** Updates employee information in system\n**Validation:** Ensures data integrity and compliance\n**Audit:** Full change tracking and approval workflows";
        case 'update_salary':
          return "💰 **Salary Update:** Handles salary changes with approval workflows\n**Integration:** Connects to payroll and benefits systems\n**Compliance:** Ensures regulatory compliance";
        case 'change_department':
          return "🏢 **Department Transfer:** Moves employee to new department\n**Automatic:** Updates access, equipment, and team assignments\n**Notifications:** Alerts relevant stakeholders";
        case 'change_manager':
          return "👔 **Manager Change:** Updates reporting structure\n**Impact:** Reassigns teams, updates permissions\n**Transition:** Manages handover process";
        
        // Leave & Time Actions
        case 'update_leave_balance':
          return "🏖️ **Leave Balance Update:** Adjusts employee leave days\n**Calculations:** Handles accrual, carry-over, and adjustments\n**Compliance:** Follows company leave policies";
        case 'approve_leave':
          return "✅ **Leave Approval:** Approves leave requests\n**Integration:** Updates calendars and coverage planning\n**Notifications:** Alerts team members and stakeholders";
        case 'calculate_overtime':
          return "⏰ **Overtime Calculation:** Computes overtime hours and pay\n**Policies:** Applies company overtime rules\n**Integration:** Connects to payroll system";
        
        // Training & Development
        case 'assign_training':
          return "📚 **Training Assignment:** Assigns courses to employees\n**Tracking:** Monitors progress and completion\n**Personalization:** Based on role and skill gaps";
        case 'create_training_plan':
          return "🎓 **Training Plan:** Develops personalized learning path\n**Assessment:** Includes skill assessments and gap analysis\n**Progression:** Tracks career development goals";
        case 'track_certifications':
          return "🏆 **Certification Tracking:** Monitors certification expiry\n**Renewals:** Sends renewal reminders and workflows\n**Compliance:** Ensures regulatory requirements are met";
        
        // Document & Compliance
        case 'create_document':
          return "📄 **Document Generation:** Creates contracts, policies, reports\n**Templates:** Uses customizable templates\n**Personalization:** Includes employee-specific data";
        case 'request_signature':
          return "✍️ **Signature Request:** Sends documents for electronic signature\n**Compliance:** Meets legal requirements for e-signatures\n**Tracking:** Monitors signature status and completion";
        case 'validate_compliance':
          return "🛡️ **Compliance Check:** Runs compliance validation\n**Regulations:** Checks against current regulations\n**Reporting:** Generates compliance reports";
        
        // Financial Actions
        case 'process_payroll':
          return "💳 **Payroll Processing:** Handles payroll calculations\n**Tax:** Ensures tax compliance and reporting\n**Integration:** Connects to banking and tax systems";
        case 'award_bonus':
          return "🎁 **Bonus Award:** Processes bonus payments\n**Approval:** Requires approval workflows\n**Integration:** Connects to payroll and recognition systems";
        case 'approve_expense':
          return "🧾 **Expense Approval:** Approves employee expenses\n**Validation:** Checks receipts and policy compliance\n**Integration:** Connects to accounting systems";
        
        // Integration & Automation
        case 'webhook':
          return "🔗 **Webhook:** Sends data to external systems\n**Reliability:** Includes retry logic and error handling\n**Integration:** Connects to third-party services";
        case 'api_call':
          return "🌐 **API Call:** Makes calls to external services\n**Security:** Includes authentication and rate limiting\n**Error Handling:** Manages failures gracefully";
        case 'export_data':
          return "📊 **Data Export:** Exports data in multiple formats\n**Scheduling:** Can be scheduled for regular delivery\n**Formats:** CSV, Excel, PDF, JSON";
        
        // Advanced Actions
        case 'run_analytics':
          return "📈 **Analytics:** Executes data analysis queries\n**Visualization:** Creates charts and reports\n**Insights:** Provides actionable business insights";
        case 'generate_report':
          return "📋 **Report Generation:** Creates custom reports\n**Scheduling:** Can be scheduled for regular delivery\n**Distribution:** Sends to stakeholders automatically";
        case 'predict_attrition':
          return "🔮 **Attrition Prediction:** Uses AI to predict employee turnover\n**Intervention:** Suggests retention strategies\n**Risk Assessment:** Identifies at-risk employees";
        
        default:
          return `🔧 **Action Node:** Performs specific task: ${actionType}`;
      }
    
    case 'condition':
      const conditionType = nodeData.conditionType;
      switch (conditionType) {
        // Basic Filters
        case 'department_is':
          return `🏢 **Department Filter:** Only affects ${nodeData.config?.value || 'specific department'}\n**Purpose:** Department-specific workflows\n**Example:** Only Sales team gets certain notifications`;
        case 'job_role_is':
          return `👔 **Role Filter:** Only affects ${nodeData.config?.value || 'specific role'}\n**Purpose:** Role-based automation\n**Example:** Only Managers get leadership training`;
        case 'employment_type_is':
          return `📝 **Contract Type Filter:** Only affects ${nodeData.config?.value || 'specific employment type'}\n**Purpose:** Different rules for different contract types\n**Example:** Full-time vs part-time processes`;
        case 'employment_status_is':
          return `📊 **Status Filter:** Only affects ${nodeData.config?.value || 'specific employment status'}\n**Purpose:** Status-based workflows\n**Example:** Only active employees get certain benefits`;
        case 'location_is':
          return `📍 **Location Filter:** Only affects ${nodeData.config?.value || 'specific location'}\n**Purpose:** Location-specific processes\n**Example:** Different policies for remote vs office workers`;
        case 'manager_is':
          return `👔 **Manager Filter:** Only affects ${nodeData.config?.value || 'specific manager'}\n**Purpose:** Manager-specific workflows\n**Example:** Custom processes for specific teams`;
        
        // Advanced Filters
        case 'salary_range':
          return `💰 **Salary Filter:** Only affects ${nodeData.config?.value || 'specific salary range'}\n**Purpose:** Compensation-based workflows\n**Example:** Different benefits for different salary levels`;
        case 'tenure_range':
          return `📅 **Tenure Filter:** Only affects ${nodeData.config?.value || 'specific tenure range'}\n**Purpose:** Experience-based workflows\n**Example:** New hires get different onboarding than veterans`;
        case 'age_range':
          return `🎂 **Age Filter:** Only affects ${nodeData.config?.value || 'specific age group'}\n**Purpose:** Age-appropriate workflows\n**Example:** Different retirement planning for different age groups`;
        case 'skill_has':
          return `🛠️ **Skill Filter:** Only affects ${nodeData.config?.value || 'employees with specific skills'}\n**Purpose:** Skill-based workflows\n**Example:** Advanced training for skilled employees`;
        
        // Time-based Conditions
        case 'contract_end_date':
          return `📋 **Contract Expiry Filter:** Only affects ${nodeData.config?.value || 'contracts ending in specific timeframe'}\n**Purpose:** Contract management workflows\n**Example:** Renewal processes for expiring contracts`;
        case 'last_login_date':
          return `💻 **Login Activity Filter:** Only affects ${nodeData.config?.value || 'employees with specific login patterns'}\n**Purpose:** Activity-based workflows\n**Example:** Re-engagement for inactive users`;
        case 'birthday_month':
          return `🎉 **Birthday Filter:** Only affects ${nodeData.config?.value || 'employees with birthdays in specific month'}\n**Purpose:** Birthday-related workflows\n**Example:** Birthday celebrations and reminders`;
        
        // Performance Conditions
        case 'performance_rating':
          return `⭐ **Performance Filter:** Only affects ${nodeData.config?.value || 'employees with specific performance ratings'}\n**Purpose:** Performance-based workflows\n**Example:** Recognition for high performers, support for underperformers`;
        case 'attendance_rate':
          return `📊 **Attendance Filter:** Only affects ${nodeData.config?.value || 'employees with specific attendance rates'}\n**Purpose:** Attendance-based workflows\n**Example:** Support for employees with attendance issues`;
        case 'training_completion':
          return `📚 **Training Filter:** Only affects ${nodeData.config?.value || 'employees with specific training status'}\n**Purpose:** Training-based workflows\n**Example:** Reminders for incomplete training`;
        
        // Leave Conditions
        case 'leave_balance':
          return `🏖️ **Leave Balance Filter:** Only affects ${nodeData.config?.value || 'employees with specific leave balances'}\n**Purpose:** Leave management workflows\n**Example:** Encouraging leave for employees with high balances`;
        case 'probation_status':
          return `🆕 **Probation Filter:** Only affects employees ${nodeData.config?.value || 'in/out of probation'}\n**Purpose:** New employee vs established employee workflows\n**Example:** Probationary employees get extra support`;
        
        // Compliance Conditions
        case 'compliance_status':
          return `🛡️ **Compliance Filter:** Only affects ${nodeData.config?.value || 'employees with specific compliance status'}\n**Purpose:** Compliance-based workflows\n**Example:** Additional checks for non-compliant employees`;
        case 'document_status':
          return `📄 **Document Filter:** Only affects ${nodeData.config?.value || 'employees with specific document status'}\n**Purpose:** Document management workflows\n**Example:** Reminders for missing documents`;
        
        // Complex Conditions
        case 'and_condition':
          return `🔗 **AND Condition:** Only affects employees meeting ALL specified criteria\n**Purpose:** Complex multi-criteria filtering\n**Example:** Managers in Sales department with high performance`;
        case 'or_condition':
          return `🔀 **OR Condition:** Affects employees meeting ANY specified criteria\n**Purpose:** Flexible multi-criteria filtering\n**Example:** Either managers OR high performers`;
        case 'not_condition':
          return `🚫 **NOT Condition:** Excludes employees meeting specified criteria\n**Purpose:** Exclusion-based filtering\n**Example:** Everyone except contractors`;
        
        default:
          return `🔍 **Condition Node:** Filters who this affects: ${conditionType}`;
      }
    
    case 'delay':
      const delayType = nodeData.delayType;
      switch (delayType) {
        case 'fixed_delay':
          return `⏱️ **Fixed Delay:** Waits ${nodeData.config?.duration || 'specified time'} before continuing\n**Purpose:** Timing control, staggered actions\n**Example:** Wait 7 days before follow-up`;
        case 'business_delay':
          return `🏢 **Business Delay:** Waits until next business day/week/month\n**Purpose:** Business-aware timing\n**Example:** Wait until next Monday or end of quarter`;
        case 'conditional_delay':
          return `🔀 **Conditional Delay:** Waits until specific condition is met\n**Purpose:** Event-driven delays\n**Example:** Wait until training is completed`;
        case 'dynamic_delay':
          return `📅 **Dynamic Delay:** Waits based on employee data\n**Purpose:** Personalized timing\n**Example:** Wait until probation period ends`;
        default:
          return `⏱️ **Delay Node:** Waits before continuing the workflow`;
      }
    
    case 'branch':
      const branchType = nodeData.branchType;
      switch (branchType) {
        case 'simple_branch':
          return `🌿 **Simple Branch:** If/else logic based on single condition\n**Purpose:** Basic conditional routing\n**Example:** If manager, send one email; if employee, send another`;
        case 'multi_branch':
          return `🔀 **Multi Branch:** Multiple paths based on different conditions\n**Purpose:** Complex conditional routing\n**Example:** Different actions for different departments`;
        case 'switch_branch':
          return `🎛️ **Switch Branch:** Route based on specific values\n**Purpose:** Value-based routing\n**Example:** Different workflows for different job roles`;
        case 'probability_branch':
          return `🎲 **Probability Branch:** Random routing with weighted probabilities\n**Purpose:** A/B testing and randomization\n**Example:** 70% get email, 30% get SMS`;
        case 'time_branch':
          return `🕐 **Time Branch:** Different paths based on time\n**Purpose:** Time-aware routing\n**Example:** Different actions for morning vs evening`;
        default:
          return `🌿 **Branch Node:** Creates conditional workflow paths`;
      }
    
    case 'loop':
      const loopType = nodeData.loopType;
      switch (loopType) {
        case 'for_each':
          return `🔄 **For Each Loop:** Repeats action for each employee in list\n**Purpose:** Batch processing\n**Example:** Send email to each new hire`;
        case 'while_loop':
          return `🔁 **While Loop:** Continues until condition is met\n**Purpose:** Conditional repetition\n**Example:** Keep sending reminders until task is completed`;
        case 'retry_loop':
          return `🔄 **Retry Loop:** Retries failed actions with backoff\n**Purpose:** Error recovery\n**Example:** Retry failed email sends with increasing delays`;
        case 'batch_loop':
          return `📦 **Batch Loop:** Processes employees in batches\n**Purpose:** Large-scale processing\n**Example:** Process 100 employees at a time`;
        default:
          return `🔄 **Loop Node:** Repeats actions in the workflow`;
      }
    
    case 'parallel':
      const parallelType = nodeData.parallelType;
      switch (parallelType) {
        case 'parallel_actions':
          return `⚡ **Parallel Actions:** Runs multiple actions simultaneously\n**Purpose:** Speed up workflow execution\n**Example:** Send email and create task at same time`;
        case 'parallel_conditions':
          return `🔍 **Parallel Conditions:** Checks multiple conditions simultaneously\n**Purpose:** Efficient condition checking\n**Example:** Check department and role at same time`;
        case 'merge_results':
          return `🔗 **Merge Results:** Combines results from parallel processes\n**Purpose:** Aggregate parallel outputs\n**Example:** Combine data from multiple API calls`;
        case 'wait_for_all':
          return `⏳ **Wait for All:** Waits for all parallel actions to complete\n**Purpose:** Synchronization\n**Example:** Wait for all emails to be sent before continuing`;
        case 'wait_for_any':
          return `⚡ **Wait for Any:** Continues when any parallel action completes\n**Purpose:** Fastest response\n**Example:** Continue when first response is received`;
        default:
          return `⚡ **Parallel Node:** Runs multiple processes simultaneously`;
      }
    
    case 'data_manipulation':
      const dataType = nodeData.dataType;
      switch (dataType) {
        case 'transform_data':
          return `🔄 **Transform Data:** Converts data format and calculates values\n**Purpose:** Data processing\n**Example:** Format salary as currency, calculate age from birthdate`;
        case 'lookup_data':
          return `🔍 **Lookup Data:** Gets additional data from external sources\n**Purpose:** Data enrichment\n**Example:** Get employee photo from directory service`;
        case 'validate_data':
          return `✅ **Validate Data:** Checks data quality and format\n**Purpose:** Data integrity\n**Example:** Validate email format, check required fields`;
        case 'aggregate_data':
          return `📊 **Aggregate Data:** Calculates sums, counts, averages\n**Purpose:** Data analysis\n**Example:** Count employees by department, average salary by role`;
        case 'filter_data':
          return `🔍 **Filter Data:** Removes or includes specific data fields\n**Purpose:** Data privacy and relevance\n**Example:** Remove sensitive fields before sharing`;
        default:
          return `🔄 **Data Manipulation Node:** Processes and transforms data`;
      }
    
    case 'error_handling':
      const errorType = nodeData.errorType;
      switch (errorType) {
        case 'try_catch':
          return `🛡️ **Try/Catch:** Handles errors gracefully with fallback actions\n**Purpose:** Error recovery\n**Example:** If email fails, send SMS instead`;
        case 'retry_with_backoff':
          return `🔄 **Retry with Backoff:** Retries failed actions with increasing delays\n**Purpose:** Resilience\n**Example:** Retry API calls with exponential backoff`;
        case 'escalate_on_error':
          return `⬆️ **Escalate on Error:** Sends alerts when errors occur\n**Purpose:** Error monitoring\n**Example:** Notify IT team when system errors occur`;
        case 'log_error':
          return `📝 **Log Error:** Records errors for debugging and analysis\n**Purpose:** Error tracking\n**Example:** Log all workflow errors for analysis`;
        case 'skip_on_error':
          return `⏭️ **Skip on Error:** Continues workflow even if some steps fail\n**Purpose:** Fault tolerance\n**Example:** Continue workflow even if one email fails`;
        default:
          return `🛡️ **Error Handling Node:** Manages errors in the workflow`;
      }
    
    case 'approval':
      const approvalType = nodeData.approvalType;
      switch (approvalType) {
        case 'manager_approval':
          return `👔 **Manager Approval:** Requires manager approval before proceeding\n**Purpose:** Manager oversight\n**Example:** Manager must approve salary changes`;
        case 'hr_approval':
          return `👩‍💼 **HR Approval:** Requires HR approval for sensitive actions\n**Purpose:** HR oversight\n**Example:** HR must approve terminations`;
        case 'multi_level_approval':
          return `⬆️ **Multi-Level Approval:** Requires approval from multiple levels\n**Purpose:** Hierarchical approval\n**Example:** Both manager and director must approve large expenses`;
        case 'automatic_approval':
          return `🤖 **Automatic Approval:** Auto-approves based on predefined rules\n**Purpose:** Streamlined approval\n**Example:** Auto-approve leave requests under 3 days`;
        case 'delegated_approval':
          return `🔄 **Delegated Approval:** Allows approval delegation when manager is away\n**Purpose:** Approval continuity\n**Example:** Delegate approval to deputy when manager is on leave`;
        default:
          return `✅ **Approval Node:** Requires human approval before proceeding`;
      }
    
    default:
      return `🔗 **${nodeType} Node:** Part of the workflow process`;
  }
}

