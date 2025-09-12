import { NextResponse } from "next/server";
import { getAutomationScheduler } from "@/lib/automation";

// GET: Cron endpoint for scheduled trigger evaluation
export async function GET(req: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    console.error("Cron automation triggers error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate automation triggers",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// POST: Manual trigger for testing
export async function POST(req: Request) {
  try {
    // For manual testing, we can be more lenient with auth
    const body = await req.json();
    const { secret } = body;

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    console.error("Manual automation triggers error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate automation triggers",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
