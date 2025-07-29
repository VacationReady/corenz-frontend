import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Fetch the document, including departments & jobRoles
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        departments: true,
        jobRoles: true,
        employee: { include: { user: true } }, // for employee-specific docs
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // ✅ Handle company-level documents (no employee link)
    if (!doc.employee) {
      const deptIds = doc.departments.map((d) => d.id);
      const jobRoleIds = doc.jobRoles.map((jr) => jr.id);

      // ✅ Fetch all employees in scope (filtered by dept/role if present)
      const employeesInScope = await prisma.employee.findMany({
  where: {
    user: { companyId: session.user.companyId }, // ✅ Corrected
    ...(deptIds.length > 0 ? { departmentId: { in: deptIds } } : {}),
    ...(jobRoleIds.length > 0
      ? { user: { jobRoleId: { in: jobRoleIds } } }
      : {}),
  },
  include: {
    user: { include: { jobRole: true } },
    department: true,
  },
});

      // ✅ Fetch acknowledgements for this document
      const acknowledgements = await prisma.documentAcknowledgement.findMany({
        where: { documentId: doc.id },
        include: {
          employee: {
            include: {
              user: { include: { jobRole: true } },
              department: true,
            },
          },
        },
        orderBy: { acknowledgedAt: "desc" },
      });

      // ✅ Split acknowledged vs pending
      const acknowledgedIds = acknowledgements.map((ack) => ack.employeeId);
      const pending = employeesInScope.filter(
        (emp) => !acknowledgedIds.includes(emp.id)
      );

      return NextResponse.json({
        acknowledged: acknowledgements.map((ack) => ({
          name: ack.employee.user.name,
          email: ack.employee.user.email,
          department: ack.employee.department?.name || "—",
          jobRole: ack.employee.user.jobRole?.name || "—",
          acknowledgedAt: ack.acknowledgedAt,
        })),
        pending: pending.map((emp) => ({
          name: emp.user.name,
          email: emp.user.email,
          department: emp.department?.name || "—",
          jobRole: emp.user.jobRole?.name || "—",
        })),
      });
    }

    // ✅ Handle employee-specific documents
    const ack = await prisma.documentAcknowledgement.findFirst({
      where: { documentId: doc.id, employeeId: doc.employee.id },
    });

    return NextResponse.json({
      employee: { name: doc.employee.user.name, email: doc.employee.user.email },
      acknowledged: !!ack,
      acknowledgedAt: ack?.acknowledgedAt || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
