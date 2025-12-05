import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getReportLibrary } from "@/lib/reportLibrary";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: getReportLibrary() });
}

