/**
 * Test Run Status Endpoint (Fallback for non-SSE clients)
 * GET /api/automation-rules/[id]/test/status?session=<sessionId>
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { testSimulator } from "@/lib/automation/test-simulator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params to satisfy Next.js type requirements
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("session");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session parameter" },
        { status: 400 }
      );
    }

    const testRun = testSimulator.getTestRun(sessionId);
    
    if (!testRun) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(testRun);
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}

