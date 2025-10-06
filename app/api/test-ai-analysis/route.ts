import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { triggerManualAnalysis } from "@/lib/ai/survey-analyzer";

/**
 * Test endpoint for AI analysis functionality
 * POST /api/test-ai-analysis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { surveyId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: "Survey ID is required" },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing AI analysis for survey: ${surveyId}`);

    // Trigger AI analysis
    const result = await triggerManualAnalysis(surveyId);

    return NextResponse.json({
      success: true,
      message: "AI analysis test completed",
      analysis: result,
    });

  } catch (error) {
    console.error("Error in AI analysis test:", error);
    return NextResponse.json(
      { 
        error: "AI analysis test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
