import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { canAccessEmployee } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
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
      // Verify the requesting user has permission to access the target employee's data
      const canAccess = await canAccessEmployee(
        {
          id: session.user.id,
          role: session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN",
          companyId: session.user.companyId,
        },
        targetEmployeeId
      );
      
      if (!canAccess) {
        // User doesn't have permission to view this employee's acknowledgment status
        // Return false rather than 403 to avoid leaking information about employee existence
        return NextResponse.json({ acknowledged: false });
      }
      
      checkEmployeeId = targetEmployeeId;
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
