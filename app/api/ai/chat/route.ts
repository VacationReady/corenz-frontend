/**
 * AI Chat Endpoint - Main orchestration endpoint
 * Handles all AI interactions with conversation memory and action execution
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { isAIEnabled, validateAPIKey, checkRateLimit } from "@/lib/ai/openai-client";
import { processUserMessage } from "@/lib/ai/orchestrator";
import { undoAction } from "@/lib/ai/action-executor";
import { clearConversation, getConversation, updateConversation } from "@/lib/ai/conversation-memory";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "AI features require admin access" },
        { status: 403 }
      );
    }

    if (!isAIEnabled()) {
      const validation = validateAPIKey();
      return NextResponse.json(
        { 
          success: false,
          error: validation.error || "AI features not enabled",
          message: "🔑 AI features haven't been set up yet. An admin needs to add the OpenAI API key (takes 5 minutes)."
        },
        { status: 503 }
      );
    }

    // Rate limit: 500 requests per hour (increase for testing, lower for production)
    // Set DISABLE_AI_RATE_LIMIT=true in .env.local to disable during development
    const skipRateLimit = process.env.DISABLE_AI_RATE_LIMIT === 'true';
    const rateLimit = checkRateLimit(session.user.id, 500, 3600000);
    if (!skipRateLimit && !rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: `🕐 You're using AI Assistant really well! We've hit the hourly limit (100 requests). This resets at ${resetTime}.`,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    // Detect content type to handle file uploads
    const contentType = req.headers.get('content-type') || '';
    
    let message: string = '';
    let action: string | undefined;
    let undoId: string | undefined;
    let context: any | undefined;
    let uploadedFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      message = (formData.get('message') as string) || '';
      action = (formData.get('action') as string) || undefined;
      undoId = (formData.get('undoId') as string) || undefined;
      const contextStr = formData.get('context') as string;
      context = contextStr ? JSON.parse(contextStr) : undefined;
      
      // Extract all uploaded files
      const fileKeys = Array.from(formData.keys()).filter(k => k.startsWith('file_'));
      uploadedFiles = fileKeys.map(key => formData.get(key) as File).filter(Boolean);
      
      // Store files temporarily in conversation for document upload handler
      if (uploadedFiles.length > 0) {
        const conv = getConversation(session.user.id, session.user.companyId);
        if (!conv.entities) conv.entities = {};
        conv.entities.pendingFiles = uploadedFiles;
        updateConversation(session.user.id, session.user.companyId, conv);
      }
    } else {
      // Regular JSON
      const body = await req.json();
      message = body.message;
      action = body.action;
      undoId = body.undoId;
      context = body.context;
    }

    // Handle undo requests
    if (action === "undo" && undoId) {
      const result = await undoAction(undoId);
      return NextResponse.json(result);
    }

    // Handle conversation clear
    if (action === "clear") {
      clearConversation(session.user.id, session.user.companyId);
      return NextResponse.json({
        success: true,
        message: "Conversation cleared!",
      });
    }

    // Main message processing
    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Process the message through the orchestrator
    const result = await processUserMessage(
      message,
      session.user.id,
      session.user.companyId,
      context
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[AI Chat Error]", error);
    
    // Friendly error message
    return NextResponse.json(
      {
        success: false,
        message: "😅 Oops! Something unexpected happened. Try rephrasing your question or refresh the page.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for capabilities
export async function GET() {
  return NextResponse.json({
    capabilities: [
      {
        category: "Data Queries",
        actions: [
          "Count employees by criteria",
          "Find specific employees",
          "Analyze leave patterns",
          "Check compliance gaps",
        ],
      },
      {
        category: "Modify Data",
        actions: [
          "Update employee details",
          "Change bank details",
          "Update contact information",
          "Bulk employee updates",
        ],
      },
      {
        category: "Leave Management",
        actions: [
          "Book leave for employees",
          "Check leave balances",
          "Approve leave requests",
          "Adjust leave balances",
        ],
      },
      {
        category: "Automation",
        actions: [
          "Create workflows",
          "Schedule reports",
          "Set up reminders",
          "Build automation sequences",
        ],
      },
      {
        category: "Customization",
        actions: [
          "Add custom fields",
          "Create new forms",
          "Add leave categories",
          "Set up departments",
        ],
      },
      {
        category: "Survey Management",
        actions: [
          "Create pulse surveys",
          "Send surveys to teams",
          "Analyze survey results",
          "Track completion rates",
          "Generate survey insights",
          "Check survey status",
        ],
      },
      {
        category: "Journey Designer",
        actions: [
          "Create employee journey templates",
          "Design onboarding experiences",
          "Optimize existing journeys",
          "Add experience blocks to journeys",
          "Create A/B experiments for journeys",
          "Analyze journey performance",
          "Generate journey content",
          "Add decision gateways",
          "Suggest journey improvements",
        ],
      },
      {
        category: "Action Items Management",
        actions: [
          "Explain action items capabilities",
          "Show action items overview and stats",
          "Explain performance review integration",
          "Show what integrates with action items",
          "Guide admin dashboard usage",
          "Help filter and find specific items",
          "Explain how to send reminders",
          "Guide CSV export process",
        ],
      },
    ],
    examples: [
      "How many employees don't have IRD numbers?",
      "Change Parj Sangha's bank details to 12-3456-0123456-00",
      "Book leave for James Garner from December 20-27",
      "Email the CEO a headcount report every Monday",
      "Add a 'T-Shirt Size' dropdown to personal information",
      "Create a workflow that alerts HR 60 days before contracts expire",
      "Create a pulse survey for the engineering team",
      "Send the weekly pulse survey to all employees",
      "Show me completion rates for the engagement survey",
      "Analyze last month's pulse survey results",
      "Who hasn't completed the satisfaction survey?",
      "Summarize feedback from the annual engagement survey",
      "Create an onboarding journey for software engineers",
      "Design a new hire experience with welcome email and training",
      "Optimize the current onboarding journey performance",
      "Add a survey block after the welcome email in the journey",
      "Create an A/B test for welcome email timing",
      "Show me how the onboarding journey is performing",
      "Generate content for the welcome email experience block",
      "What can action items do?",
      "Tell me about action items system",
      "How do performance reviews work with action items?",
      "Show me action items overview",
      "What's outstanding and overdue?",
      "What integrates with action items?",
      "How do I use the admin action items dashboard?",
      "How do I filter for overdue items?",
      "Export action items to CSV",
    ],
  });
}

