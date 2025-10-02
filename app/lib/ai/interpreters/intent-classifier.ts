/**
 * Intent Classifier
 * Analyzes user messages to determine action type and extract parameters
 */

import { openai, AI_CONFIG } from "../openai-client";

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
        content: `You are an intent classifier for an HR system. Analyze the user's message and determine what action they want.

${systemContext}

${conversationContext}

AVAILABLE ACTIONS:
- query_data: Find/count/analyze data ("How many...", "Show me...", "List...", "What is...", "Who is...")
- update_employee: Change specific employee data ("Change X's bank to...", "Update Sarah's email...")
- book_leave: Book holiday/leave ("Book leave for...", "Schedule holiday for...")
- schedule_report: Schedule recurring reports ("Email CEO report every Monday...")
- add_field: Add custom field to existing form ("Add 'Shirt Size' field...")
- create_form: Build complete new form ("Create a feedback form", "Build an onboarding form")
- deploy_form: Save generated form ("Deploy this form", "Create it")
- create_workflow: Build automation ("Create workflow that alerts...")
- save_workflow: Save generated workflow ("Save this workflow", "Save it")
- send_email: Send one-off emails ("Email all managers about...")
- bulk_update: Update multiple employees at once ("Give everyone in sales a 10% raise", "Set all IT to remote")
- upload_document: Upload and assign documents ("Assign this to Michael", "Upload employment contract for Sarah")
- modify_settings: Change system config ("Change probation to 120 days...")

PARAMETER EXTRACTION:
- employeeName: Full or partial name (e.g., "Parj Sangha", "James")
- field: What to update (e.g., "bank details", "email", "phone", "salary", "salaryAmount", "last name", "first name", "location")
- value: New value (for direct updates)
- percentage: Numeric percentage (e.g., 10 for "10% raise")
- operation: "increase" or "decrease" (for percentage changes)
- department: Department name (e.g., "sales", "engineering", "IT")
- query: Description of employees to affect (for bulk updates)
- reason: Explanation for the change (CRITICAL for audit compliance)
- startDate/endDate: For leave booking
- leaveType: Leave category
- reportType: Type of report
- recipient: Who gets the report
- schedule: Frequency (daily, weekly, "every Monday", "every 30 days")
- confirmed: true if message contains "yes", "confirm", "apply", "do it", "proceed"

BULK UPDATE EXAMPLES:
- "Give everyone in sales a 10% raise" → {actionType: "bulk_update", parameters: {department: "sales", percentage: 10, operation: "increase", field: "salaryAmount"}}
- "Increase IT salaries by 5%" → {actionType: "bulk_update", parameters: {department: "IT", percentage: 5, operation: "increase", field: "salaryAmount"}}
- "Set all marketing to Wellington office" → {actionType: "bulk_update", parameters: {department: "marketing", field: "siteLocation", value: "Wellington"}}
- "Move everyone in sales to the IT department" → {actionType: "bulk_update", parameters: {department: "sales", field: "departmentId", value: "IT"}}
- "Change all contractors to permanent" → {actionType: "bulk_update", parameters: {field: "contractType", value: "Permanent"}}
- "Set engineering to work from home" → {actionType: "bulk_update", parameters: {department: "engineering", field: "siteLocation", value: "Work From Home"}}
- "Decrease engineering hourly rates by 2%" → {actionType: "bulk_update", parameters: {department: "engineering", percentage: 2, operation: "decrease", field: "hourlyRate"}}

DOCUMENT UPLOAD EXAMPLES:
- "Assign this to Michael Dowdle" → {actionType: "upload_document", parameters: {employeeName: "Michael Dowdle"}}
- "Upload employment contract for Sarah" → {actionType: "upload_document", parameters: {employeeName: "Sarah", category: "Employment Contract"}}

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

