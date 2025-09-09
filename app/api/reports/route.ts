import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await prisma.savedReport.findMany({
      where: { companyId: session.user.companyId },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      reports.map((report) => ({
        id: report.id,
        name: report.name,
        category: report.category,
        createdAt: report.createdAt,
        createdBy: { email: report.user?.email || "Unknown" },
        fields: report.fields, // ✅ ADD THIS LINE
      }))
    );
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, fields } = body;

    if (!name || !category || !fields) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const report = await prisma.savedReport.create({
      data: {
        name,
        category,
        fields: fields,
        createdBy: session.user.id,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
