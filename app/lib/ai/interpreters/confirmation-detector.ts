/**
 * AI-Powered Confirmation Detector
 * Uses GPT-4 to intelligently detect confirmations and extract parameters
 */

import { openai, AI_CONFIG } from "../openai-client";

export interface ConfirmationResult {
  isConfirming: boolean;
  isApprovalRequest?: boolean; // NEW: User wants to send for approval instead
  isDenying?: boolean;
}

export async function isUserConfirming(
  userMessage: string,
  context: string
): Promise<boolean> {
  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.1, // Very low for consistent yes/no
      messages: [
        {
          role: "system",
          content: `You are a confirmation detector. Determine if the user is saying YES/CONFIRM to proceed with an action.

Context: ${context}

User might say:
- "Yes", "Yeah", "Yep", "Yup", "Sure", "OK", "Okay"
- "Yes please", "Yeah sure", "Sure thing", "Go for it"
- "Absolutely", "Definitely", "Correct", "That's right"
- "Do it", "Book it", "Go ahead", "Proceed"
- "👍", "✅", "✓"
- Typos: "Yrs", "Ywa", "Yez"
- Slang: "Yea", "Ya", "Ye", "Aye"

User is NOT confirming if they say:
- "No", "Nope", "Nah", "Cancel"
- "Wait", "Hold on", "Not yet"
- Questions or new requests
- Providing information (dates, names, etc.)

Respond with ONLY: true or false`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const response = completion.choices[0].message.content?.trim().toLowerCase();
    return response === 'true';
  } catch (error) {
    console.error('[Confirmation Detector] Error:', error);
    // Fallback to regex if AI fails
    return /^(yes|yeah|yep|yup|sure|ok|okay|y)$/i.test(userMessage.trim());
  }
}

export async function extractParameters(
  userMessage: string,
  expectedType: 'dates' | 'leaveType' | 'employeeName' | 'category' | 'general',
  context: string
): Promise<any> {
  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Extract ${expectedType} from the user's message.

Context: ${context}

Examples:
${expectedType === 'dates' ? `
- "Next Monday" → {startDate: "Next Monday", endDate: "Next Monday", isSingleDay: true}
- "Dec 20-27" → {startDate: "Dec 20", endDate: "27", isSingleDay: false}
- "Monday to Friday" → {startDate: "Monday", endDate: "Friday", isSingleDay: false}
- "Tomorrow" → {startDate: "Tomorrow", endDate: "Tomorrow", isSingleDay: true}
` : ''}
${expectedType === 'leaveType' ? `
- "Annual leave" → "Annual Leave"
- "Annual" → "Annual Leave"
- "Sick" → "Sick Leave"
- "1" (from list) → "Annual Leave" (if first option)
` : ''}
${expectedType === 'employeeName' ? `
- "Gary" → "Gary"
- "Gary Middleton" → "Gary Middleton"
- "1" (from list) → extract from context
` : ''}

Respond with JSON containing the extracted data.`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('[Parameter Extraction] Error:', error);
    // Fallback to simple extraction
    return { value: userMessage.trim() };
  }
}

/**
 * Detect if user wants to send for approval instead of applying immediately
 */
export async function isApprovalRequest(
  userMessage: string,
  context: string
): Promise<boolean> {
  const approvalKeywords = /send.*approval|approval|ceo.*approv|get.*approval|request.*approval|ask.*ceo|need.*approval/i;
  const immediateKeywords = /apply.*now|do.*now|yes|confirm|go.*ahead|proceed/i;
  
  // Quick regex check first
  if (approvalKeywords.test(userMessage)) return true;
  if (immediateKeywords.test(userMessage)) return false;
  
  // Use AI for ambiguous cases
  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Determine if the user wants to SEND FOR APPROVAL or APPLY IMMEDIATELY.

Context: ${context}

APPROVAL REQUEST indicators:
- "send for approval"
- "get CEO approval"
- "ask the CEO"
- "send to CEO"
- "need approval"
- "request approval"

IMMEDIATE APPLICATION indicators:
- "apply now"
- "do it now"
- "yes"
- "confirm"
- "go ahead"
- "proceed"

Respond with ONLY: "approval" or "immediate"`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const response = completion.choices[0].message.content?.trim().toLowerCase();
    return response === 'approval';
  } catch (error) {
    console.error('[Approval Detection] Error:', error);
    return approvalKeywords.test(userMessage);
  }
}

