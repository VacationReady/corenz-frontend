/**
 * AI Query Endpoint
 * Natural language database queries
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  isAIEnabled,
  validateAPIKey,
  checkRateLimit,
} from "@/lib/ai/openai-client";
import { generateQuery, QUICK_QUERIES } from "@/lib/ai/query-generator";
import { getConversation, addMessage, buildContextString } from "@/lib/ai/conversation-memory";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin only for AI features
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "AI features require admin access" },
        { status: 403 }
      );
    }

    // Check if AI is enabled
    if (!isAIEnabled()) {
      const validation = validateAPIKey();
      return NextResponse.json(
        { error: validation.error || "AI features not enabled" },
        { status: 503 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 100, 3600000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    const { query, quickQuery } = await req.json();

    if (!query && !quickQuery) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Handle quick queries (predefined, faster)
    if (quickQuery) {
      const result = await executeQuickQuery(
        quickQuery,
        session.user.companyId
      );
      return NextResponse.json(result);
    }

    // Add query to conversation history
    addMessage(session.user.id, session.user.companyId, "user", query);

    // Get conversation context for follow-up questions
    const conversation = getConversation(session.user.id, session.user.companyId);
    const conversationContext = buildContextString(conversation);

    // Handle AI-generated queries with conversation context
    const result = await generateQuery(
      query,
      session.user.companyId,
      session.user.id,
      conversationContext
    );

    // Add result to conversation history
    if (result.success) {
      const summary = result.explanation || "Query executed successfully";
      addMessage(session.user.id, session.user.companyId, "assistant", summary);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[AI Query Error]", error);
    return NextResponse.json(
      { error: error.message || "Query failed" },
      { status: 500 }
    );
  }
}

async function executeQuickQuery(
  queryName: string,
  companyId: string
): Promise<any> {
  switch (queryName) {
    case "employeesWithoutIRD":
      const count = await QUICK_QUERIES.employeesWithoutIRD(companyId);
      return {
        success: true,
        count,
        explanation: `Found ${count} employees without IRD numbers`,
        query: "employeesWithoutIRD",
      };

    case "activeEmployeeCount":
      const activeCount = await QUICK_QUERIES.activeEmployeeCount(companyId);
      return {
        success: true,
        count: activeCount,
        explanation: `${activeCount} active employees`,
        query: "activeEmployeeCount",
      };

    case "pendingLeaveRequests":
      const pending = await QUICK_QUERIES.pendingLeaveRequests(companyId);
      return {
        success: true,
        count: pending,
        explanation: `${pending} pending leave requests`,
        query: "pendingLeaveRequests",
      };

    case "contractsExpiring30Days":
      const expiring = await QUICK_QUERIES.contractsExpiringInDays(
        companyId,
        30
      );
      return {
        success: true,
        data: expiring,
        count: expiring.length,
        explanation: `${expiring.length} contracts expiring in next 30 days`,
        query: "contractsExpiring30Days",
      };

    default:
      return {
        success: false,
        error: `Unknown quick query: ${queryName}`,
      };
  }
}

// GET endpoint for available quick queries
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    quickQueries: [
      {
        id: "employeesWithoutIRD",
        name: "Employees without IRD Number",
        description: "Count employees missing IRD numbers",
      },
      {
        id: "activeEmployeeCount",
        name: "Active Employee Count",
        description: "Total number of active employees",
      },
      {
        id: "pendingLeaveRequests",
        name: "Pending Leave Requests",
        description: "Count of leave requests awaiting approval",
      },
      {
        id: "contractsExpiring30Days",
        name: "Contracts Expiring Soon",
        description: "Employees with contracts expiring in 30 days",
      },
    ],
    examples: [
      "How many employees don't have IRD numbers?",
      "Show me employees starting in the next 30 days",
      "Which departments have the most leave requests?",
      "List employees with expiring visas",
      "What's the average salary by department?",
    ],
  });
}

