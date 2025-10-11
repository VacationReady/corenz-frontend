/**
 * Intent Classifier
 * Analyzes user messages to determine action type and extract parameters
 */

import { openai, AI_CONFIG } from "../openai-client";
import {
  buildGuardrailPrompt,
  buildSystemKnowledgePrompt,
  CORE_CONVERSATION_SECTIONS,
} from "../system-knowledge";

const INTENT_KNOWLEDGE_PROMPT = buildSystemKnowledgePrompt({
  sections: CORE_CONVERSATION_SECTIONS,
  includeHeading: false,
});

const INTENT_GUARDRAILS_PROMPT = buildGuardrailPrompt({ includeHeading: false });

export async function interpretIntent(
  userMessage: string,
  conversationContext: string,
  systemContext: string
) {
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.3,
    messages: [
      { 
        role: "system",
        content: `You are a REVOLUTIONARY next-generation HR AI that understands complex, conversational, and multi-function requests. You excel at detecting when users need guidance vs when they have clear intent.

LANGUAGE INTERPRETATION:
- Interpret slang generously: "yo", "bro", "thx", "yea", "yup", "peeps" (people), "gimme" (give me), "lemme" (let me)
- Handle typos and abbreviations: "u" (you), "r" (are), "n" (and), "4" (for), "2" (to/too), "bout" (about)
- Understand emojis as emphasis: 💯 (excellent/perfect), 🏖️ (vacation/leave), etc.
- Recognize confirmation slang: "yea", "yup", "ya", "do it", "go ahead", "fr fr" (for real)

NEXT-GEN CONVERSATION DETECTION:
If the user's message is vague but shows clear intent for guidance, use:
{
  "actionType": "conversational_guidance",
  "parameters": {"needsGuidance": true, "topic": "detected_topic"},
  "confidence": 0.8,
  "reasoning": "user needs intelligent guidance"
}

If completely unclear, use:
{
  "actionType": "query_data", 
  "parameters": {},
  "confidence": 0.0,
  "reasoning": "unclear intent"
}

Do NOT guess. If you're not 90%+ confident, mark it as unclear. But DO interpret casual language patterns confidently.

${systemContext}

${conversationContext}

SYSTEM KNOWLEDGE BASE:
${INTENT_KNOWLEDGE_PROMPT}

CRITICAL GUARDRAILS:
${INTENT_GUARDRAILS_PROMPT}

AVAILABLE ACTIONS (Organized by Category):

📊 DATA & ANALYTICS:
- query_data: Find/count/analyze data ("How many...", "Show me...", "List...", "What is...", "Who is...")
- analytics_digest: Generate workforce analytics summaries ("Give me turnover stats", "Show diversity breakdown", "Workforce trends")
  NOTE: This consolidates analytics queries. Simple queries use query_data, complex analytics use analytics_digest.

👤 EMPLOYEE MANAGEMENT:
- update_employee: Change specific employee data ("Change X's bank to...", "Update Sarah's email...")
- bulk_update: Update multiple employees at once ("Give everyone in sales a 10% raise", "Set all IT to remote")
- send_activation_email: Send login activation emails to employees ("Send login invite to John", "Send activation email to Sarah")

🏖️ LEAVE & TIME:
- book_leave: Book holiday/leave for individuals or groups ("Book leave for...", "Schedule holiday for...", "Book all employees annual leave...")

⚙️ WORKFLOWS & AUTOMATION:
- create_workflow: Build automation ("Create workflow that alerts...", "Make me a workflow", "I want to create a workflow")
- execute_workflow: Execute an existing automation now ("Run the onboarding workflow for Zoe", "Trigger workflow")
- save_workflow: Save generated workflow ("Save this workflow", "Save it")
- integrated_automation: Multi-system automation workflows ("Survey monthly and email managers")
- multi_function_workflow: Complex workflows spanning multiple HR functions ("When someone joins, send welcome email and schedule survey")

📋 SURVEYS & FEEDBACK:
- create_survey: Create new surveys ("Create a pulse survey", "Build an engagement survey")
- send_survey: Deploy surveys to employees ("Send the pulse survey to engineering", "Launch survey")
- analyze_survey: Analyze survey results and responses ("Show me pulse survey results", "Analyze engagement data")
- track_completion: Track who has/hasn't completed surveys ("Who hasn't completed the survey?", "Show completion rates")
- digest_results: Generate insights from survey data ("Summarize survey feedback", "What are the key findings?")
- survey_status: Check status of active surveys ("What surveys are running?", "Survey status")
- create_survey_automation: Build automated survey workflows ("Send eNPS survey monthly and email results")
- create_complex_automation: Multi-step automation combining surveys, workflows, and communications

🗂️ FORMS & FIELDS:
- add_field: Add custom field to existing form ("Add 'Shirt Size' field...")
- create_form: Build complete new form ("Create a feedback form", "Build an onboarding form")
- deploy_form: Save generated form ("Deploy this form", "Create it")
- dynamic_form_building: Conversational form creation with logic ("Create form that changes based on department")

📄 DOCUMENTS:
- upload_document: Upload and assign documents ("Assign this to Michael", "Upload employment contract")
- bulk_document: Assign documents to multiple employees ("Send contract to all new hires", "Assign policy to everyone")

💬 COMMUNICATIONS:
- send_email: Send one-off emails ("Email all managers about...")
- targeted_comms: Send targeted communications to groups ("Email all managers about policy", "Send reminder to Sales team")
- intelligent_communications: Smart, targeted communications with customization ("Email managers but customize by department")
- bulk_notification: Send notifications to groups ("Notify all managers", "Alert sales team")
- policy_rollout: Announce and track policy changes ("Roll out new leave policy", "Announce WFH policy")

✅ COMPLIANCE & AUDITS:
- compliance_sweep: Run proactive compliance checks
  Patterns: "compliance check", "audit", "verify", "validate", "check if everyone", "who is missing", 
           "find employees without", "ensure all", "sweep", "check all visa", "verify documents"
  Examples: ("Check all visa expiries", "Find missing documents", "Run compliance check", "Audit IRD numbers",
            "Verify everyone has signed contracts", "Ensure all employees have emergency contacts")

🎯 PERFORMANCE:
- create_objective: Create new objectives/OKRs
- update_objective: Update objective progress or details
- view_objectives: View objectives and goals
- schedule_one_to_one: Schedule 1-2-1 meetings
- create_review_cycle: Start 360° review cycles
- track_action_items: Track action items from meetings
- performance_analytics: Analyze performance data
- performance_help: General performance management guidance

📌 ACTION ITEMS:
- action_items_help: Explain action items system capabilities
- action_items_overview: Show action items status and stats
- action_items_integrations: Explain what integrates with action items
- action_items_performance: Explain performance review integration
- action_items_admin: Explain admin dashboard and capabilities
- action_items_filter: Help with filtering and finding specific items
- action_items_reminder: Send reminders for action items
- action_items_export: Export action items data

🗺️ JOURNEYS:
- create_journey: Create new employee journey templates
- optimize_journey: Improve existing journeys with AI suggestions
- add_experience_block: Add blocks to journeys (surveys, training, meetings)
- create_experiment: Create A/B tests for journey optimization
- analyze_performance: Analyze journey metrics and completion rates
- suggest_improvements: Get AI-powered journey optimization suggestions
- add_decision_gateway: Add conditional logic and routing to journeys
- generate_content: Generate content for journey blocks
- journey_design: General journey design requests

📊 CSV IMPORTS:
- csv_help: General CSV import guidance ("Help with CSV", "CSV import help")
- csv_template: Generate CSV template ("Show me CSV template", "Create CSV template")
- csv_errors: Analyze CSV import errors ("CSV import errors", "Why is my CSV failing")
- csv_mapping: Map CSV fields to system fields ("Map my CSV fields", "Field mapping for CSV")

🔄 BULK OPERATIONS:
- smart_bulk_operations: Intelligent bulk actions with conditions ("Give sales a raise but get approval first")
- bulk_workflow: Run workflows for multiple employees ("Run onboarding for new hires")

✔️ APPROVALS:
- check_approval_status: Check status of user's approval requests
- list_pending_approvals: List all pending approvals company-wide

💡 CONVERSATIONAL:
- conversational_guidance: User needs intelligent questions and guidance ("I want to send surveys", "Help me with onboarding")

⚙️ SYSTEM:
- modify_settings: Change system config
- schedule_report: Schedule recurring reports
- create_survey: Create new surveys ("Create a pulse survey", "Build an engagement survey", "Make a feedback form")
- send_survey: Deploy surveys to employees ("Send the pulse survey to engineering", "Launch the engagement survey", "Deploy survey to all employees")
- analyze_survey: Analyze survey results and responses ("Show me pulse survey results", "Analyze engagement data", "Survey analytics")
- track_completion: Track who has/hasn't completed surveys ("Who hasn't completed the survey?", "Show completion rates", "Track survey responses")
- digest_results: Generate insights from survey data ("Summarize survey feedback", "What are the key findings?", "Digest survey results")
- survey_status: Check status of active surveys ("What surveys are running?", "Survey status", "Active surveys")
- create_journey: Create new employee journey templates ("Create an onboarding journey", "Design a new hire experience", "Build a development path")
- optimize_journey: Improve existing journeys ("Optimize the onboarding journey", "Improve employee experience", "Make this journey better")
- add_experience_block: Add blocks to journeys ("Add a survey to the journey", "Insert a training module", "Add a check-in meeting")
- create_experiment: Create A/B tests for journeys ("Test welcome email timing", "Create experiment for onboarding", "A/B test this journey")
- analyze_performance: Analyze journey metrics ("Show journey analytics", "How is the onboarding performing?", "Journey completion rates")
- suggest_improvements: Get AI suggestions for journeys ("Suggest improvements", "What can be optimized?", "How to make this better?")
- add_decision_gateway: Add conditional logic to journeys ("Add decision point", "Route based on performance", "Create conditional path")
- generate_content: Generate content for journey blocks ("Write welcome email", "Create survey questions", "Generate training content")
- journey_design: General journey design requests ("Help with journey design", "Design employee experience", "Create journey", "What are journeys?", "How do journeys work?", "Tell me about journeys", "I dont know what they are")
- create_objective: Create new objectives/OKRs ("Create a company objective", "Set quarterly goals", "Add personal objective", "Create OKR")
- update_objective: Update objective progress or details ("Update objective progress to 80%", "Mark hiring goal complete", "Change objective owner")
- view_objectives: View objectives and goals ("Show me all objectives", "What are my team's goals?", "View company OKRs", "List objectives at risk")
- schedule_one_to_one: Schedule 1-2-1 meetings ("Schedule weekly 1-2-1s", "Book meeting with my team", "Set up performance conversation")
- create_review_cycle: Start 360° review cycles ("Launch annual reviews", "Start quarterly review cycle", "Begin performance reviews")
- track_action_items: Track action items from meetings ("Show my action items", "What tasks are due?", "List pending actions")
- performance_analytics: Analyze performance data ("Show objective completion rates", "Team performance trends", "Review cycle analytics")
- performance_help: General performance management guidance ("How do OKRs work?", "What are 360 reviews?", "Performance management help")
- action_items_help: Explain action items system capabilities ("What can action items do?", "Tell me about action items", "Action items features", "What are action items?", "How do action items work?")
- action_items_overview: Show action items status and stats ("Show action items overview", "What's outstanding?", "Action items status", "Pending action items")
- action_items_integrations: Explain what integrates with action items ("What integrates with action items?", "What workflows use action items?", "Action items integrations")
- action_items_performance: Explain performance review integration ("How do performance reviews work with action items?", "Performance review action items", "Review cycle action items")
- action_items_admin: Explain admin dashboard and capabilities ("How do I use the action items dashboard?", "Admin action items features", "Action items for admins")
- action_items_filter: Help with filtering and finding specific items ("How do I filter action items?", "Find overdue items", "Show specific action items")
- action_items_reminder: Send reminders for action items ("Send reminder for action items", "Remind people about tasks", "Notify overdue items")
- action_items_export: Export action items data ("Export action items", "Download action items CSV", "Get action items report")

PARAMETER EXTRACTION:
- employeeName: Full or partial name (e.g., "Parj Sangha", "James")
- field: What to update (e.g., "bank details", "email", "phone", "salary", "salaryAmount", "last name", "first name", "location")
- value: New value ONLY if explicitly stated. DO NOT extract or guess values. Leave empty if not clearly provided.
  
  EXAMPLES OF WHEN TO EXTRACT VALUE:
  ✅ "Change last name to Smith" → {value: "Smith"}
  ✅ "Update email to sarah@new.com" → {value: "sarah@new.com"}
  ✅ "Set salary to $75,000" → {value: "75000"}
  
  EXAMPLES OF WHEN NOT TO EXTRACT (leave value empty):
  ❌ "Change Gary's last name" → {value: ""} (no new value mentioned)
  ❌ "Update Sarah's email" → {value: ""} (no new email provided)
  ❌ "Can you change the salary?" → {value: ""} (asking, not stating)
- percentage: Numeric percentage (e.g., 10 for "10% raise")
- operation: "increase" or "decrease" (for percentage changes)
- department: Department name (e.g., "sales", "engineering", "IT")
- query: Description of employees to affect (for bulk updates)
- reason: Explanation for the change (CRITICAL for audit compliance)
- startDate/endDate: For leave booking - ALWAYS extract if mentioned (e.g., "next Monday", "Dec 20-27", "tomorrow", "next week")
- leaveType: Leave category (e.g., "Annual Leave", "Sick Leave")
- bulk: true for bulk leave booking (e.g., "all employees", "everyone", "all staff")
- scope: "all" for company-wide, or department/audience for specific groups
- reportType: Type of report
- recipient: Who gets the report
- schedule: Frequency (daily, weekly, "every Monday", "every 30 days")
- confirmed: true if message contains "yes", "confirm", "apply", "do it", "proceed"
- checkType: Type of compliance check (e.g., "visa_expiry", "missing_documents", "ird_compliance", "contract_expiry", "all")
- scope: Who to check (e.g., "all", "department")
- audience: Who to communicate with (e.g., "managers", "hr_team", "all")
- subject: Email subject or topic
- employeeName: For activation emails - name of employee to send activation email to
- policyType: Type of policy (e.g., "leave", "wfh", "general")
- policyDetails: Details about the policy change
- surveyType: Type of survey (e.g., "pulse", "engagement", "enps", "annual", "feedback")
- surveyName: Name of specific survey to work with
- targetAudience: Who should receive the survey (e.g., "engineering", "all", "managers")
- deadline: When survey should be completed by
- timeframe: Time period for analysis (e.g., "last_week", "this_month", "quarter")
- analysisType: Type of analysis requested (e.g., "trends", "sentiment", "department")
- focusArea: Specific area to focus on (e.g., "engagement", "satisfaction", "workload")
- schedule: Frequency for automation (e.g., "monthly", "every_30_days", "quarterly", "weekly")
- anonymize: Anonymization level (e.g., "department", "role", "location", "none")
- emailResults: Whether to email results (true/false)
- emailRecipients: Who should receive email results (e.g., "CEO", "HR", "managers")
- includeEmail: Whether automation includes email functionality
- includeSurveys: Whether automation includes survey functionality
- includeNotifications: Whether automation includes notification functionality
- emailSummaries: Whether to email summary reports
- stakeholder: Key stakeholder requesting the automation (e.g., "CEO", "HR Director")
- workflowType: Type of workflow automation (e.g., "employee_lifecycle", "survey_automation", "compliance")
- objectiveType: Type of objective (e.g., "company", "team", "personal")
- objectiveTitle: Title/name of the objective
- objectiveOwner: Who owns the objective (name or role)
- objectiveProgress: Progress percentage (0-100)
- objectivePriority: Priority level (e.g., "critical", "high", "medium", "low")
- objectiveStatus: Status (e.g., "not_started", "in_progress", "at_risk", "completed")
- keyResults: Array of measurable key results
- meetingType: Type of meeting (e.g., "1-2-1", "quarterly_review", "annual_review", "probation")
- meetingFrequency: How often to schedule (e.g., "weekly", "biweekly", "monthly")
- participants: Who should attend the meeting
- reviewCycleType: Type of review cycle (e.g., "annual", "quarterly", "probation")
- reviewParticipants: Who is included in the review cycle
- reviewDeadline: When reviews should be completed
- actionItemStatus: Status of action items (e.g., "todo", "in_progress", "completed")
- actionItemType: Type of action item (e.g., "PERFORMANCE_SELF_REVIEW", "LEAVE_APPROVAL", "DOCUMENT_ACKNOWLEDGEMENT", "SURVEY_COMPLETION")
- actionItemFilter: Filter criteria (e.g., "overdue", "due_today", "pending", "by_department")
- filterDepartment: Department to filter by
- filterStatus: Status filter (e.g., "PENDING", "IN_PROGRESS", "COMPLETED")
- filterPriority: Priority filter (e.g., "HIGH", "MEDIUM", "LOW")
- reminderRecipients: Who should receive reminders

ACTION ITEMS EXAMPLES:
- "What can action items do?" → {actionType: "action_items_help", parameters: {}}
- "Tell me about action items system" → {actionType: "action_items_help", parameters: {}}
- "How do action items work?" → {actionType: "action_items_help", parameters: {}}
- "Show me action items overview" → {actionType: "action_items_overview", parameters: {}}
- "What's outstanding?" → {actionType: "action_items_overview", parameters: {actionItemFilter: "outstanding"}}
- "Show overdue action items" → {actionType: "action_items_overview", parameters: {actionItemFilter: "overdue"}}
- "What integrates with action items?" → {actionType: "action_items_integrations", parameters: {}}
- "How do performance reviews work with action items?" → {actionType: "action_items_performance", parameters: {}}
- "Tell me about performance review action items" → {actionType: "action_items_performance", parameters: {}}
- "How do I use the admin dashboard?" → {actionType: "action_items_admin", parameters: {}}
- "Show me action items for Engineering department" → {actionType: "action_items_overview", parameters: {filterDepartment: "Engineering"}}
- "How do I filter for overdue items?" → {actionType: "action_items_filter", parameters: {actionItemFilter: "overdue"}}
- "Export action items to CSV" → {actionType: "action_items_export", parameters: {}}
- "Send reminders for overdue reviews" → {actionType: "action_items_reminder", parameters: {actionItemType: "PERFORMANCE", actionItemFilter: "overdue"}}

LEAVE BOOKING EXAMPLES:
- "Book leave for Gary next Monday" → {actionType: "book_leave", parameters: {employeeName: "Gary", startDate: "next Monday", endDate: "next Monday"}}

ACTIVATION EMAIL EXAMPLES:
- "Send login invite to John Smith" → {actionType: "send_activation_email", parameters: {employeeName: "John Smith"}}
- "Send activation email to Sarah" → {actionType: "send_activation_email", parameters: {employeeName: "Sarah"}}
- "Send login invite to x y z" → {actionType: "send_activation_email", parameters: {employeeName: "x y z"}}
- "yo book some time off for Gary next monday bro" → {actionType: "book_leave", parameters: {employeeName: "Gary", startDate: "next Monday", endDate: "next Monday"}}
- "Can you book some leave for Gary Middleton next Monday?" → {actionType: "book_leave", parameters: {employeeName: "Gary Middleton", startDate: "next Monday", endDate: "next Monday"}}
- "Schedule holiday for Sarah from Dec 20-27" → {actionType: "book_leave", parameters: {employeeName: "Sarah", startDate: "Dec 20", endDate: "Dec 27"}}
- "Book sick leave for John tomorrow" → {actionType: "book_leave", parameters: {employeeName: "John", startDate: "tomorrow", endDate: "tomorrow", leaveType: "Sick Leave"}}
- "need 2 days off 4 sarah next week" → {actionType: "book_leave", parameters: {employeeName: "Sarah", startDate: "next week"}}
- "I want to book leave for James" → {actionType: "book_leave", parameters: {employeeName: "James"}} (no dates provided)

BULK LEAVE BOOKING EXAMPLES:
- "Book all employees annual leave between 21st December to 24th December" → {actionType: "book_leave", parameters: {bulk: true, scope: "all", startDate: "21st December", endDate: "24th December", leaveType: "Annual Leave"}}
- "Please book all employees annual leave between 21st December to 24th December" → {actionType: "book_leave", parameters: {bulk: true, scope: "all", startDate: "21st December", endDate: "24th December", leaveType: "Annual Leave"}}
- "Give everyone in sales annual leave from Dec 20-27" → {actionType: "book_leave", parameters: {bulk: true, department: "sales", startDate: "Dec 20", endDate: "Dec 27", leaveType: "Annual Leave"}}
- "Book holiday for all IT staff next week" → {actionType: "book_leave", parameters: {bulk: true, department: "IT", startDate: "next week", leaveType: "Annual Leave"}}
- "Schedule all employees off between Christmas and New Year" → {actionType: "book_leave", parameters: {bulk: true, scope: "all", startDate: "Christmas", endDate: "New Year", leaveType: "Annual Leave"}}
- "Give everyone annual leave for the holidays" → {actionType: "book_leave", parameters: {bulk: true, scope: "all", leaveType: "Annual Leave"}}
- "Book all managers sick leave tomorrow" → {actionType: "book_leave", parameters: {bulk: true, audience: "managers", startDate: "tomorrow", endDate: "tomorrow", leaveType: "Sick Leave"}}

BULK DOCUMENT EXAMPLES:
- "Send contract to all new hires" → {actionType: "bulk_document", parameters: {documentType: "contract", audience: "new_hires"}}
- "Assign policy to everyone" → {actionType: "bulk_document", parameters: {documentType: "policy", scope: "all"}}
- "Send handbook to all sales staff" → {actionType: "bulk_document", parameters: {documentType: "handbook", department: "sales"}}
- "Give all managers the new policy document" → {actionType: "bulk_document", parameters: {documentType: "policy", audience: "managers"}}

BULK NOTIFICATION EXAMPLES:
- "Notify all managers about the meeting" → {actionType: "bulk_notification", parameters: {audience: "managers", message: "meeting"}}
- "Alert sales team about the deadline" → {actionType: "bulk_notification", parameters: {department: "sales", message: "deadline"}}
- "Send reminder to all employees" → {actionType: "bulk_notification", parameters: {scope: "all", message: "reminder"}}

BULK WORKFLOW EXAMPLES:
- "Run onboarding for new hires" → {actionType: "bulk_workflow", parameters: {workflowType: "onboarding", audience: "new_hires"}}
- "Send reminders to all" → {actionType: "bulk_workflow", parameters: {workflowType: "reminder", scope: "all"}}
- "Run compliance check for sales team" → {actionType: "bulk_workflow", parameters: {workflowType: "compliance", department: "sales"}}

WORKFLOW EXECUTION EXAMPLES:
- "Run the onboarding workflow for Zoe" → {actionType: "execute_workflow", parameters: {workflowName: "onboarding", employeeName: "Zoe"}}
- "Trigger the visa alert workflow now" → {actionType: "execute_workflow", parameters: {workflowName: "visa alert"}}
- "Execute workflow 123" → {actionType: "execute_workflow", parameters: {workflowId: "123"}}
- "Fire the contract expiry automation for Gary" → {actionType: "execute_workflow", parameters: {workflowName: "contract expiry", employeeName: "Gary"}}

WORKFLOW CREATION EXAMPLES (INCLUDING VAGUE):
- "Create workflow that alerts HR 60 days before contracts expire" → {actionType: "create_workflow", parameters: {}}
- "Make me a workflow" → {actionType: "create_workflow", parameters: {}}
- "I want to create a workflow" → {actionType: "create_workflow", parameters: {}}
- "Can you make me a workflow" → {actionType: "create_workflow", parameters: {}}
- "Build a workflow" → {actionType: "create_workflow", parameters: {}}
- "yo can u make a workflow 4 me" → {actionType: "create_workflow", parameters: {}}
- "lemme create a workflow thing" → {actionType: "create_workflow", parameters: {}}
- "i need a workflow" → {actionType: "create_workflow", parameters: {}}

SURVEY AUTOMATION EXAMPLES:
- "Send eNPS survey monthly and email results" → {actionType: "create_survey_automation", parameters: {surveyType: "enps", schedule: "monthly", includeEmail: true}}
- "Automate pulse surveys every 30 days" → {actionType: "create_survey_automation", parameters: {surveyType: "pulse", schedule: "every_30_days"}}
- "Set up recurring engagement surveys quarterly" → {actionType: "create_survey_automation", parameters: {surveyType: "engagement", schedule: "quarterly"}}
- "Build workflow to send surveys and email results" → {actionType: "create_survey_automation", parameters: {includeEmail: true}}

COMPLEX AUTOMATION EXAMPLES:
- "Send eNPS survey monthly, anonymize by department, email results" → {actionType: "create_complex_automation", parameters: {surveyType: "enps", schedule: "monthly", anonymize: "department", emailResults: true}}
- "My CEO wants eNPS survey monthly, anonymized by department, with email results" → {actionType: "create_complex_automation", parameters: {surveyType: "enps", schedule: "monthly", anonymize: "department", emailResults: true, stakeholder: "CEO"}}
- "Automate employee lifecycle workflows with surveys and notifications" → {actionType: "create_complex_automation", parameters: {workflowType: "employee_lifecycle", includeSurveys: true, includeNotifications: true}}
- "Build automation that sends surveys, collects responses, and emails summaries" → {actionType: "create_complex_automation", parameters: {includeSurveys: true, emailSummaries: true}}

NEXT-GEN CONVERSATIONAL EXAMPLES:
- "I'm thinking of sending a survey once a month" → {actionType: "conversational_guidance", parameters: {needsGuidance: true, topic: "monthly_surveys"}}
- "Help me with onboarding" → {actionType: "conversational_guidance", parameters: {needsGuidance: true, topic: "onboarding"}}
- "I want to automate something" → {actionType: "conversational_guidance", parameters: {needsGuidance: true, topic: "automation"}}
- "We need better communication" → {actionType: "conversational_guidance", parameters: {needsGuidance: true, topic: "communication"}}
- "Can you help me with forms?" → {actionType: "conversational_guidance", parameters: {needsGuidance: true, topic: "forms"}}

INTEGRATED AUTOMATION EXAMPLES:
- "Survey employees monthly and email results to managers" → {actionType: "integrated_automation", parameters: {surveyType: "monthly", emailResults: true, recipients: "managers"}}
- "Onboard new hires with forms, workflows, and notifications" → {actionType: "integrated_automation", parameters: {process: "onboarding", includes: ["forms", "workflows", "notifications"]}}
- "Set up performance reviews with surveys, reminders, and reporting" → {actionType: "integrated_automation", parameters: {process: "performance_reviews", includes: ["surveys", "reminders", "reporting"]}}

MULTI-FUNCTION WORKFLOW EXAMPLES:
- "When someone joins, send welcome email, create tasks, and schedule 30-day survey" → {actionType: "multi_function_workflow", parameters: {trigger: "employee_joins", actions: ["welcome_email", "create_tasks", "schedule_survey"]}}
- "For departing employees, send exit survey, collect equipment, and notify IT" → {actionType: "multi_function_workflow", parameters: {trigger: "employee_leaves", actions: ["exit_survey", "collect_equipment", "notify_IT"]}}

SMART BULK OPERATIONS EXAMPLES:
- "Give everyone in sales a 10% raise but send for approval first" → {actionType: "smart_bulk_operations", parameters: {department: "sales", action: "salary_increase", percentage: 10, requiresApproval: true}}
- "Move all remote workers to new location and update contracts" → {actionType: "smart_bulk_operations", parameters: {criteria: "remote_workers", actions: ["update_location", "update_contracts"]}}

INTELLIGENT COMMUNICATIONS EXAMPLES:
- "Email all managers about new policy but customize message by department" → {actionType: "intelligent_communications", parameters: {audience: "managers", topic: "policy", customization: "by_department"}}
- "Send onboarding info but different content for different roles" → {actionType: "intelligent_communications", parameters: {process: "onboarding", customization: "by_role"}}

DYNAMIC FORM BUILDING EXAMPLES:
- "Create onboarding form that shows different fields based on department" → {actionType: "dynamic_form_building", parameters: {formType: "onboarding", logic: "department_based"}}
- "Build feedback form that routes to different managers" → {actionType: "dynamic_form_building", parameters: {formType: "feedback", logic: "routing_based"}}

PERFORMANCE MANAGEMENT EXAMPLES:
- "Create a company objective to increase revenue by 25%" → {actionType: "create_objective", parameters: {objectiveType: "company", objectiveTitle: "increase revenue by 25%", objectivePriority: "high"}}
- "Set quarterly goals for the product team" → {actionType: "create_objective", parameters: {objectiveType: "team", timeframe: "quarterly"}}
- "Add personal objective for career development" → {actionType: "create_objective", parameters: {objectiveType: "personal", topic: "career development"}}
- "Create OKR for hiring 10 engineers" → {actionType: "create_objective", parameters: {objectiveTitle: "hiring 10 engineers", keyResults: ["hire 10 engineers"]}}
- "Update objective progress to 80%" → {actionType: "update_objective", parameters: {objectiveProgress: 80}}
- "Mark the hiring goal as complete" → {actionType: "update_objective", parameters: {objectiveStatus: "completed", topic: "hiring"}}
- "Change objective owner to Sarah" → {actionType: "update_objective", parameters: {objectiveOwner: "Sarah"}}
- "Show me all objectives" → {actionType: "view_objectives", parameters: {}}
- "What are my team's goals?" → {actionType: "view_objectives", parameters: {scope: "team"}}
- "View company OKRs" → {actionType: "view_objectives", parameters: {objectiveType: "company"}}
- "List objectives at risk" → {actionType: "view_objectives", parameters: {objectiveStatus: "at_risk"}}
- "What objectives are behind schedule?" → {actionType: "view_objectives", parameters: {objectiveStatus: "at_risk"}}
- "Schedule weekly 1-2-1s with my team" → {actionType: "schedule_one_to_one", parameters: {meetingType: "1-2-1", meetingFrequency: "weekly", participants: "team"}}
- "Book quarterly reviews for product team" → {actionType: "schedule_one_to_one", parameters: {meetingType: "quarterly_review", participants: "product team"}}
- "Set up performance conversation with Sarah" → {actionType: "schedule_one_to_one", parameters: {meetingType: "performance_conversation", participants: "Sarah"}}
- "Schedule 1-2-1s for next month" → {actionType: "schedule_one_to_one", parameters: {meetingType: "1-2-1", timeframe: "next month"}}
- "Launch annual reviews for sales" → {actionType: "create_review_cycle", parameters: {reviewCycleType: "annual", reviewParticipants: "sales"}}
- "Start quarterly review cycle" → {actionType: "create_review_cycle", parameters: {reviewCycleType: "quarterly"}}
- "Begin 360 reviews for managers" → {actionType: "create_review_cycle", parameters: {reviewCycleType: "360", reviewParticipants: "managers"}}
- "Show my action items" → {actionType: "track_action_items", parameters: {scope: "my"}}
- "What tasks are due this week?" → {actionType: "track_action_items", parameters: {timeframe: "this_week"}}
- "List pending actions from 1-2-1s" → {actionType: "track_action_items", parameters: {source: "one_to_one", actionItemStatus: "pending"}}
- "Show objective completion rates" → {actionType: "performance_analytics", parameters: {metricType: "completion_rates", focus: "objectives"}}
- "Team performance trends" → {actionType: "performance_analytics", parameters: {metricType: "trends", scope: "team"}}
- "Review cycle analytics" → {actionType: "performance_analytics", parameters: {metricType: "analytics", focus: "review_cycles"}}
- "How are we doing on our goals?" → {actionType: "performance_analytics", parameters: {focus: "goals"}}
- "How do OKRs work?" → {actionType: "performance_help", parameters: {topic: "okrs"}}
- "What are 360 reviews?" → {actionType: "performance_help", parameters: {topic: "360_reviews"}}
- "Performance management help" → {actionType: "performance_help", parameters: {}}
- "Explain key results" → {actionType: "performance_help", parameters: {topic: "key_results"}}

BULK UPDATE EXAMPLES:
- "Give everyone in sales a 10% raise" → {actionType: "bulk_update", parameters: {department: "sales", percentage: 10, operation: "increase", field: "salaryAmount"}}
- "give them all a 10% bump they deserve it" → {actionType: "bulk_update", parameters: {percentage: 10, operation: "increase", field: "salaryAmount"}} (uses conversation context for department)
- "Increase IT salaries by 5%" → {actionType: "bulk_update", parameters: {department: "IT", percentage: 5, operation: "increase", field: "salaryAmount"}}
- "Set all marketing to Wellington office" → {actionType: "bulk_update", parameters: {department: "marketing", field: "siteLocation", value: "Wellington"}}
- "Move everyone in sales to the IT department" → {actionType: "bulk_update", parameters: {department: "sales", field: "departmentId", value: "IT"}}
- "Change all contractors to permanent" → {actionType: "bulk_update", parameters: {field: "contractType", value: "Permanent"}}
- "Set engineering to work from home" → {actionType: "bulk_update", parameters: {department: "engineering", field: "siteLocation", value: "Work From Home"}}
- "Decrease engineering hourly rates by 2%" → {actionType: "bulk_update", parameters: {department: "engineering", percentage: 2, operation: "decrease", field: "hourlyRate"}}

DOCUMENT UPLOAD EXAMPLES:
- "Assign this to Michael Dowdle" → {actionType: "upload_document", parameters: {employeeName: "Michael Dowdle"}}
- "lemme upload this contract thing 4 mike" → {actionType: "upload_document", parameters: {employeeName: "mike"}}
- "Upload employment contract for Sarah" → {actionType: "upload_document", parameters: {employeeName: "Sarah", category: "Employment Contract"}}

QUERY DATA EXAMPLES (with casual language):
- "how many peeps we got in sales??" → {actionType: "query_data", parameters: {department: "sales", queryType: "count"}}
- "gimme sum analytics on whos been here the longest" → {actionType: "query_data", parameters: {queryType: "tenure_analysis"}}
- "who aint got their ird# setup yet" → {actionType: "query_data", parameters: {field: "irdNumber", filterNull: true}}
- "who reports into Shay Murray?" → {actionType: "query_data", parameters: {managerName: "Shay Murray", queryType: "reporting_structure"}}
- "who reports to Sarah?" → {actionType: "query_data", parameters: {managerName: "Sarah", queryType: "reporting_structure"}}
- "show me John's direct reports" → {actionType: "query_data", parameters: {managerName: "John", queryType: "direct_reports"}}
- "list everyone who reports to Alex" → {actionType: "query_data", parameters: {managerName: "Alex", queryType: "reporting_structure"}}
- "who's on Michael's team?" → {actionType: "query_data", parameters: {managerName: "Michael", queryType: "team_members"}}

COMPLIANCE SWEEP EXAMPLES (CASUAL/TYPO-HEAVY):
- "yo can u check if everyones got their visa stuff sorted??" → {actionType: "compliance_sweep", parameters: {checkType: "visa_expiry"}}
- "lemme c whos missing docs" → {actionType: "compliance_sweep", parameters: {checkType: "missing_documents"}}
- "run compliance check plz thx" → {actionType: "compliance_sweep", parameters: {scope: "all"}}
- "check ird compliance 4 everyone" → {actionType: "compliance_sweep", parameters: {checkType: "ird_compliance"}}
- "gimme a list of peeps w expired contracts" → {actionType: "compliance_sweep", parameters: {checkType: "contract_expiry"}}
- "who aint got ther paperwork done" → {actionType: "compliance_sweep", parameters: {checkType: "missing_documents"}}
- "do a sweep on all the visa things" → {actionType: "compliance_sweep", parameters: {checkType: "visa_expiry"}}
- "check if sales got all their docs" → {actionType: "compliance_sweep", parameters: {checkType: "missing_documents", department: "sales"}}
- "run the compliance thing" → {actionType: "compliance_sweep", parameters: {scope: "all"}}

ANALYTICS DIGEST EXAMPLES (CASUAL/TYPO-HEAVY):
- "yo gimme turnover stats" → {actionType: "analytics_digest", parameters: {reportType: "turnover"}}
- "show me sum analytics bout diversity n stuff" → {actionType: "analytics_digest", parameters: {reportType: "diversity"}}
- "whats our workforce lookin like these days" → {actionType: "analytics_digest", parameters: {reportType: "workforce_trends"}}
- "how many peeps left this qtr??" → {actionType: "analytics_digest", parameters: {reportType: "turnover", period: "quarter"}}
- "can u do like a summary of whos here n who isnt" → {actionType: "analytics_digest", parameters: {reportType: "workforce_trends"}}
- "diversity breakdown plz" → {actionType: "analytics_digest", parameters: {reportType: "diversity"}}
- "lemme see turnover by dept" → {actionType: "analytics_digest", parameters: {reportType: "turnover", groupBy: "department"}}
- "gimme the stats on who left" → {actionType: "analytics_digest", parameters: {reportType: "turnover"}}

TARGETED COMMS EXAMPLES (CASUAL/TYPO-HEAVY):
- "send email 2 all managers bout the new policy thing" → {actionType: "targeted_comms", parameters: {audience: "managers", subject: "new policy"}}
- "email sales team abt training tmrw" → {actionType: "targeted_comms", parameters: {department: "Sales", subject: "training"}}
- "lemme send a msg to everyone in IT" → {actionType: "targeted_comms", parameters: {department: "IT"}}
- "blast out an email 2 all the engineering peeps" → {actionType: "targeted_comms", parameters: {department: "Engineering"}}
- "can u msg the managers real quick" → {actionType: "targeted_comms", parameters: {audience: "managers"}}
- "send reminder to sales bout that thing" → {actionType: "targeted_comms", parameters: {department: "sales", subject: "reminder"}}
- "email everyone in marketing" → {actionType: "targeted_comms", parameters: {department: "marketing"}}

POLICY ROLLOUT EXAMPLES (CASUAL/TYPO-HEAVY):
- "roll out the new WFH policy 2 everyone" → {actionType: "policy_rollout", parameters: {policyType: "wfh", scope: "all"}}
- "announce the leave policy change to all staff plz" → {actionType: "policy_rollout", parameters: {policyType: "leave", scope: "all"}}
- "tell engineering bout the new policy" → {actionType: "policy_rollout", parameters: {policyType: "general", department: "Engineering"}}
- "push out new policy to sales team" → {actionType: "policy_rollout", parameters: {department: "Sales"}}
- "yo we need to rollout that policy we talked about" → {actionType: "policy_rollout", parameters: {}}
- "announce wfh to everyone" → {actionType: "policy_rollout", parameters: {policyType: "wfh", scope: "all"}}

SURVEY EXAMPLES (CASUAL/TYPO-HEAVY):
- "create a pulse survey" → {actionType: "create_survey", parameters: {surveyType: "pulse"}}
- "make me an engagement survey 4 the team" → {actionType: "create_survey", parameters: {surveyType: "engagement"}}
- "build a feedback form" → {actionType: "create_survey", parameters: {surveyType: "feedback"}}
- "yo can u make a survey bout satisfaction" → {actionType: "create_survey", parameters: {surveyType: "feedback", focusArea: "satisfaction"}}
- "send the pulse survey to engineering" → {actionType: "send_survey", parameters: {surveyName: "pulse", targetAudience: "engineering"}}
- "launch the weekly pulse 2 everyone" → {actionType: "send_survey", parameters: {surveyName: "weekly pulse", targetAudience: "all"}}
- "deploy survey to all employees by friday" → {actionType: "send_survey", parameters: {targetAudience: "all", deadline: "friday"}}
- "send engagement survey to managers" → {actionType: "send_survey", parameters: {surveyName: "engagement", targetAudience: "managers"}}
- "show me pulse survey results" → {actionType: "analyze_survey", parameters: {surveyName: "pulse"}}
- "analyze engagement data from last month" → {actionType: "analyze_survey", parameters: {surveyName: "engagement", timeframe: "last_month"}}
- "gimme survey analytics" → {actionType: "analyze_survey", parameters: {}}
- "what r the trends in our surveys" → {actionType: "analyze_survey", parameters: {analysisType: "trends"}}
- "who hasnt completed the survey?" → {actionType: "track_completion", parameters: {}}
- "show completion rates 4 pulse survey" → {actionType: "track_completion", parameters: {surveyName: "pulse"}}
- "track survey responses from engineering" → {actionType: "track_completion", parameters: {targetAudience: "engineering"}}
- "who aint done the engagement thing yet" → {actionType: "track_completion", parameters: {surveyName: "engagement"}}
- "summarize survey feedback" → {actionType: "digest_results", parameters: {}}
- "what r the key findings from pulse" → {actionType: "digest_results", parameters: {surveyName: "pulse"}}
- "digest survey results bout workload" → {actionType: "digest_results", parameters: {focusArea: "workload"}}
- "gimme insights from last weeks survey" → {actionType: "digest_results", parameters: {timeframe: "last_week"}}
- "what surveys r running?" → {actionType: "survey_status", parameters: {}}
- "survey status plz" → {actionType: "survey_status", parameters: {}}
- "show me active surveys" → {actionType: "survey_status", parameters: {}}

Respond with JSON:
{
  "actionType": "one of the action types",
  "parameters": { all extracted parameters },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

