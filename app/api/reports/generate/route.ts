import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { reportDefinitions } from "@/lib/reportDefinitions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportType, filters = {}, pagination = { page: 1, limit: 50, sortBy: null, sortOrder: "asc" } }: { reportType: string; filters?: any; pagination?: any } = body;

    if (!reportDefinitions[reportType]) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const data = await reportDefinitions[reportType].query(filters, pagination);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
