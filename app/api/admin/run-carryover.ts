import { NextResponse } from "next/server";
import { processCarryover } from "@/lib/processCarryover";

export async function POST(req: Request) {
    try {
        console.log("🚀 Carryover process triggered via API.");
        await processCarryover();
        console.log("🎉 Carryover process completed via API.");

        return NextResponse.json({
            success: true,
            message: "Carryover process completed.",
        });
    } catch (error) {
        console.error("❌ Error during carryover process:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: "Method not allowed. Use POST." },
        { status: 405 }
    );
}
