import { NextRequest, NextResponse } from "next/server";
import { getAutomationScheduler } from "@/lib/automation";
import { verifyCronSecret, getUnauthorizedResponse } from "@/lib/cron/auth";

// GET: Cron endpoint for scheduled trigger evaluation
export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronSecret(req)) {
      return getUnauthorizedResponse();
    }

    const scheduler = getAutomationScheduler();

    // This endpoint is called by external cron services (like Vercel Cron)
    // It manually triggers the scheduler check
    console.log("Cron trigger: Starting automation rule evaluation");

    // Since this is a serverless environment, we need to manually trigger
    // the scheduler check rather than relying on a persistent process
    await scheduler.checkTriggers?.();

    return NextResponse.json({
      success: true,
      message: "Automation triggers evaluated",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron automation triggers error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate automation triggers",
        message: error?.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// POST: Manual trigger for testing
export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate request
    if (!verifyCronSecret(req)) {
      return getUnauthorizedResponse();
    }

    const scheduler = getAutomationScheduler();

    console.log("Manual trigger: Starting automation rule evaluation");

    // Manually trigger the scheduler check
    await scheduler.checkTriggers?.();

    return NextResponse.json({
      success: true,
      message: "Automation triggers evaluated manually",
      timestamp: new Date().toISOString(),
      trigger: "manual",
    });
  } catch (error: any) {
    console.error("Manual automation triggers error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate automation triggers",
        message: error?.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

