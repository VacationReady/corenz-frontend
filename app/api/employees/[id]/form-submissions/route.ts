import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const employeeId = params.id;

    // Verify employee belongs to the same company
    const employee = await prisma.employee.findFirst({
      where: { 
        id: employeeId,
        companyId: session.user.companyId 
      }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get form submissions for this employee
    const submissions = await prisma.formSubmission.findMany({
      where: { employeeId },
      include: {
        form: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
