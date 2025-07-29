import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the document with acknowledgements
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        acknowledgements: {
          include: {
            employee: {
              include: { user: true }, // So we can access name/email
            },
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Fetch all employees in this company (eligible for acknowledgement)
    const allEmployees = await prisma.employee.findMany({
      where: { companyId: doc.companyId },
      include: { user: true },
    });

    const acknowledged = doc.acknowledgements.map((ack) => ({
      name: ack.employee.user.name,
      email: ack.employee.user.email,
      acknowledgedAt: ack.acknowledgedAt,
    }));

    const acknowledgedIds = doc.acknowledgements.map((ack) => ack.employeeId);

    const pending = allEmployees
      .filter((emp) => !acknowledgedIds.includes(emp.id))
      .map((emp) => ({
        name: emp.user.name,
        email: emp.user.email,
      }));

    return NextResponse.json({ acknowledged, pending });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
