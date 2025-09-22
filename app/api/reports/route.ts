import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";

export async function GET() {
  await ensurePrismaConnected();
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await prisma.savedReport.findMany({
      where: { companyId: session.user.companyId },
      include: {
        User: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      reports.map((report) => ({
        id: report.id,
        name: report.name,
        category: report.category,
        createdAt: report.createdAt,
        createdBy: { email: report.User?.email || "Unknown" },
        fields: report.fields, // ✅ ADD THIS LINE
      })),
    );
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, fields } = body;

    if (!name || !category || !fields) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const report = await prisma.savedReport.create({
      data: {
        name,
        category,
        fields: fields,
        createdBy: session.user.id,
        companyId: session.user.companyId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

