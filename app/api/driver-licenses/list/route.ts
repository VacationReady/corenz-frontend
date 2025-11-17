import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId")?.trim();
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
      select: { id: true },
    });

    if (!employee) {
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

    const licences = await prisma.driverLicence.findMany({
      where: {
        employeeId,
      },
      include: {
        Document: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(licences);
  } catch (error) {
    console.error("Error fetching driver licences:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

