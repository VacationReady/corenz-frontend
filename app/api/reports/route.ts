import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

export const runtime = "nodejs";

export async function GET() {
  await ensurePrismaConnected();
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 🔒 Bug Fix 3.1: Add permission-based filtering for report list
    // Non-admins can only see their own reports or reports shared with them
    const whereClause: any = { companyId: session.user.companyId };
    
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      // Fetch user's departmentId for department share check
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { departmentId: true },
      });

      whereClause.OR = [
        { createdBy: session.user.id }, // Own reports
        { 
          ReportShare: { 
            some: { 
              OR: [
                { userId: session.user.id }, // Direct user share
                { shareType: "company" }, // Company-wide share
                // Department share (if user has a department)
                ...(currentUser?.departmentId 
                  ? [{ departmentId: currentUser.departmentId }] 
                  : []),
              ]
            } 
          } 
        },
      ];
    }

    const reports = await prisma.savedReport.findMany({
      where: whereClause,
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
    const session = await auth();
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

