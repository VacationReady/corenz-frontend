import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { processCarryover } from "@/lib/processCarryover";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    console.error("❌ Unauthorized attempt to run carryover.");
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admins only." },
      { status: 401 },
    );
  }

  try {
    console.log(
      "🚀 Carryover process triggered via API by ADMIN:",
      session.user.email,
    );
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
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
