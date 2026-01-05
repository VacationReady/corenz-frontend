import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId")?.trim();
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  try {
    // Use tenant-scoped query to prevent cross-tenant access
    const employee = await prisma.employee.findFirst({
      where: { 
        id: employeeId,
        companyId: session.user.companyId, // Tenant isolation
      },
      select: { id: true, companyId: true },
    });

    if (!employee) {
      // Return 404 for both "not found" and "cross-tenant" to prevent ID enumeration
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const allowed = await canAccessEmployee(
      {
        id: session.user.id,
        role: session.user.role as any,
        companyId: session.user.companyId,
      },
      employeeId,
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const records = await prisma.trainingRecord.findMany({
      where: {
        employeeId,
        Employee: { companyId: session.user.companyId },
      },
      include: {
        Document: true,
        Course: true, // ✅ Include course details
        TrainingProvider: true, // ✅ Include provider details
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = records.map(({ Document, Course, TrainingProvider, ...rest }) => ({
      ...rest,
      document: Document
        ? {
            id: Document.id,
            name: Document.name,
            url: Document.url,
          }
        : null,
      course: Course
        ? {
            id: Course.id,
            name: Course.name,
          }
        : null,
      provider: TrainingProvider
        ? {
            id: TrainingProvider.id,
            name: TrainingProvider.name,
          }
        : null,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching training records:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

