import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    const checks = await prisma.employmentCheck.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(checks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
