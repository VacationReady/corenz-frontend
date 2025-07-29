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

    // Fetch the document and its linked employee
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        employee: { include: { user: true } },
        acknowledgements: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // If company document (no employee link), fetch acknowledgements filtered by dept/role
    if (!doc.employee) {
      const acknowledgements = await prisma.documentAcknowledgement.findMany({
        where: {
          documentId: doc.id,
          employee: {
            department: doc.accessDepartments?.length
              ? { in: doc.accessDepartments }
              : undefined,
            jobRole: doc.accessJobRoles?.length
              ? { in: doc.accessJobRoles }
              : undefined,
          },
        },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { acknowledgedAt: "desc" },
      });

      return NextResponse.json({
        acknowledgements: acknowledgements.map((ack) => ({
          id: ack.id,
          employeeName: ack.employee.user.name,
          employeeEmail: ack.employee.user.email,
          department: ack.employee.department,
          jobRole: ack.employee.jobRole,
          acknowledgedAt: ack.acknowledgedAt,
        })),
      });
    }

    // Ensure this is employee-specific
    if (!doc.employee) {
      return NextResponse.json({ error: "This is not an employee-specific document" }, { status: 400 });
    }

    // Check if that employee has acknowledged
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
