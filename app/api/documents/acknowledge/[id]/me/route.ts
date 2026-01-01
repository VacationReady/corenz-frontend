import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ acknowledged: false });
    }

    // Check for optional employeeId query param (for admin/manager viewing another employee's status)
    const { searchParams } = new URL(req.url);
    const targetEmployeeId = searchParams.get("employeeId");

    // Find the employee record linked to the logged-in user
    const currentEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!currentEmployee) {
      return NextResponse.json({ acknowledged: false });
    }

    // Determine which employee's acknowledgment to check
    let checkEmployeeId = currentEmployee.id;
    
    if (targetEmployeeId && targetEmployeeId !== currentEmployee.id) {
      // Verify the target employee belongs to the same company
      const targetEmployee = await prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          companyId: currentEmployee.companyId,
        },
        select: { id: true },
      });
      
      if (targetEmployee) {
        checkEmployeeId = targetEmployee.id;
      }
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId: currentEmployee.companyId,
      },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ acknowledged: false });
    }

    // Check if acknowledgement exists
    const ack = await prisma.documentAcknowledgement.findUnique({
      where: {
        documentId_employeeId: {
          documentId: id,
          employeeId: checkEmployeeId,
        },
      },
    });

    if (ack) {
      return NextResponse.json({
        acknowledged: true,
        acknowledgedAt: ack.acknowledgedAt,
      });
    } else {
      return NextResponse.json({ acknowledged: false });
    }
  } catch (error) {
    console.error("Acknowledgement Check Error:", error);
    return NextResponse.json({ acknowledged: false });
  }
}
