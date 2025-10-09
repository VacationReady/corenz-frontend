import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all employees with their user activation status
    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActivated: true,
            welcomeEmailSentAt: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
        JobRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    // Calculate statistics
    const stats = {
      total: employees.length,
      emailSent: 0,
      emailNotSent: 0,
      activated: 0,
      pendingActivation: 0,
    };

    const employeesList = employees.map(emp => {
      const hasEmailSent = !!emp.User?.welcomeEmailSentAt;
      const isActivated = !!emp.User?.isActivated;

      if (hasEmailSent) stats.emailSent++;
      else stats.emailNotSent++;

      if (isActivated) stats.activated++;
      else stats.pendingActivation++;

      return {
        id: emp.id,
        userId: emp.User?.id,
        name: `${emp.User?.firstName ?? ""} ${emp.User?.lastName ?? ""}`.trim() || emp.User?.email || "Unknown",
        email: emp.User?.email,
        department: emp.Department?.name,
        departmentId: emp.Department?.id,
        jobRole: emp.JobRole?.name,
        jobRoleId: emp.JobRole?.id,
        welcomeEmailSentAt: emp.User?.welcomeEmailSentAt,
        isActivated: isActivated,
        status: !hasEmailSent
          ? "no_email"
          : !isActivated
          ? "email_sent_pending"
          : "activated",
      };
    });

    return NextResponse.json({
      stats,
      employees: employeesList,
    });
  } catch (error) {
    console.error("Failed to fetch activation status:", error);
    return NextResponse.json(
      { error: "Failed to fetch activation status" },
      { status: 500 },
    );
  }
}
