import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Fetch the document, including departments & jobRoles, scoped by company
    const doc = await prisma.document.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        Department: true,
        JobRole: true,
        Employee: { include: { User: true } }, // for employee-specific docs
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // ✅ Handle company-level documents (no employee link)
    if (!doc.Employee) {
      const deptIds = doc.Department.map((d: any) => d.id);
      const jobRoleIds = doc.JobRole.map((jr: any) => jr.id);

      // ✅ Fetch all employees in scope (filtered by dept/role if present)
      const employeesInScope = await prisma.employee.findMany({
        where: {
          User: { companyId: session.user.companyId },
          ...(deptIds.length > 0 ? { departmentId: { in: deptIds } } : {}),
          ...(jobRoleIds.length > 0
            ? { User: { jobRoleId: { in: jobRoleIds } } }
            : {}),
        },
        include: {
          User: { include: { JobRole: true } },
          Department: true,
        },
      });

      // ✅ Fetch acknowledgements for this document
      const acknowledgements = await prisma.documentAcknowledgement.findMany({
        where: { documentId: doc.id },
        include: {
          Employee: {
            include: {
              User: { include: { JobRole: true } },
              Department: true,
            },
          },
        },
        orderBy: { acknowledgedAt: "desc" },
      });

      // ✅ Split acknowledged vs pending
      const acknowledgedIds = acknowledgements.map((ack: any) => ack.employeeId);
      const acknowledged = acknowledgements.map((ack: any) => ({
        name: ack.employee.user.name,
        email: ack.employee.user.email,
        department: ack.employee.department?.name || "—",
        jobRole: ack.employee.user.jobRole?.name || "—",
        acknowledgedAt: ack.acknowledgedAt,
      }));

      const pending = employeesInScope
        .filter((emp) => !acknowledgedIds.includes(emp.id))
        .map((emp) => ({
          name: emp.User.name,
          email: emp.User.email,
          department: emp.Department?.name || "—",
          jobRole: emp.User.JobRole?.name || "—",
        }));

      return NextResponse.json({
        acknowledged,
        pending,
      });
    }

    // ✅ Handle employee-specific documents
    const ack = await prisma.documentAcknowledgement.findFirst({
      where: { documentId: doc.id, employeeId: doc.Employee.id },
    });

    return NextResponse.json({
      employee: {
        name: doc.Employee.User.name,
        email: doc.Employee.User.email,
      },
      acknowledged: !!ack,
      acknowledgedAt: ack?.acknowledgedAt || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
