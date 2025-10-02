/**
 * Server-Sent Events Stream for Test Execution
 * GET /api/automation-rules/[id]/test/stream?session=<sessionId>
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { testSimulator } from "@/lib/automation/test-simulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("session");

    if (!sessionId) {
      return new Response("Missing session parameter", { status: 400 });
    }

    // Check if session exists
    const testRun = testSimulator.getTestRun(sessionId);
    if (!testRun) {
      return new Response("Session not found", { status: 404 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial state
        const initialData = `data: ${JSON.stringify(testRun)}\n\n`;
        controller.enqueue(encoder.encode(initialData));

        // Subscribe to updates
        const unsubscribe = testSimulator.subscribe(sessionId, (data) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));

            // Close stream when test is completed or failed
            if (data.status === "completed" || data.status === "failed") {
              setTimeout(() => {
                controller.close();
              }, 1000); // Give client time to receive final message
            }
          } catch (error) {
            console.error("SSE stream error:", error);
            controller.error(error);
          }
        });

        // Cleanup on close
        req.signal.addEventListener("abort", () => {
          unsubscribe();
          controller.close();
        });

        // Auto-close after 5 minutes if still open
        const timeout = setTimeout(() => {
          unsubscribe();
          controller.close();
        }, 5 * 60 * 1000);

        req.signal.addEventListener("abort", () => {
          clearTimeout(timeout);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable proxy buffering
      },
    });
  } catch (error: any) {
    console.error("SSE stream setup error:", error);
    return new Response(error.message || "Stream error", { status: 500 });
  }
}
