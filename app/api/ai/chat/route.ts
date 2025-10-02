/**
 * AI Chat Endpoint - Main orchestration endpoint
 * Handles all AI interactions with conversation memory and action execution
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAIEnabled, validateAPIKey, checkRateLimit } from "@/lib/ai/openai-client";
import { processUserMessage } from "@/lib/ai/orchestrator";
import { undoAction } from "@/lib/ai/action-executor";
import { clearConversation } from "@/lib/ai/conversation-memory";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    const rateLimit = checkRateLimit(session.user.id, 100, 3600000);
    if (!rateLimit.allowed) {
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

    const { message, action, undoId } = await req.json();

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
      session.user.companyId
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
    ],
    examples: [
      "How many employees don't have IRD numbers?",
      "Change Parj Sangha's bank details to 12-3456-0123456-00",
      "Book leave for James Garner from December 20-27",
      "Email the CEO a headcount report every Monday",
      "Add a 'T-Shirt Size' dropdown to personal information",
      "Create a workflow that alerts HR 60 days before contracts expire",
    ],
  });
}

