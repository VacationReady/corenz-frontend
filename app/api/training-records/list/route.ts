import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  try {
    const records = await prisma.trainingRecord.findMany({
      where: {
        employeeId: employeeId ?? undefined,
      },
      include: {
        document: true,
        course: true, // ✅ Include course details
        provider: true, // ✅ Include provider details
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching training records:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
