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
- query_data: Find/count/analyze data ("How many...", "Show me...", "List...")
- update_employee: Change specific employee data ("Change X's bank to...", "Update Sarah's email...")
- book_leave: Book holiday/leave ("Book leave for...", "Schedule holiday for...")
- schedule_report: Schedule recurring reports ("Email CEO report every Monday...")
- add_field: Add custom field ("Add 'Shirt Size' field...")
- create_workflow: Build automation ("Create workflow that alerts...")
- save_workflow: Save generated workflow ("Save this workflow", "Save it")
- send_email: Send one-off emails ("Email all managers about...")
- bulk_update: Update multiple employees ("Set all Engineering to WFH...")
- modify_settings: Change system config ("Change probation to 120 days...")

PARAMETER EXTRACTION:
- employeeName: Full or partial name (e.g., "Parj Sangha", "James")
- field: What to update (e.g., "bank details", "email", "phone", "salary", "last name", "first name")
- value: New value
- reason: Explanation for the change (CRITICAL for audit compliance)
- startDate/endDate: For leave booking
- leaveType: Leave category
- reportType: Type of report
- recipient: Who gets the report
- schedule: Frequency (daily, weekly, "every Monday", "every 30 days")
- confirmed: true if message contains "yes", "confirm", "apply", "do it"

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

