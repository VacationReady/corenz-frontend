import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// ✅ GET employee profile by Employee.id (not User.id)
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: {
        id: params.id, // ✅ Use Employee.id for matching
        companyId: session.user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { id: true, name: true } },
            jobRole: { select: { id: true, name: true } },
          },
        },
        leaveEntitlements: true,
        leaveRequests: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(
      "Error fetching employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}

// ✅ DELETE employee by Employee.id
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id, companyId: session.user.companyId },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employeeId = employee.id;
    const userId = employee.userId;
    const companyId =
      employee.companyId ?? employee.user?.companyId ?? undefined;

    const result = await prisma.$transaction(async (tx) => {
      // Onboarding instances and nested data
      await tx.onboardingStepResponse.deleteMany({
        where: {
          onboardingStepInstance: { onboardingInstance: { employeeId } },
        },
      });
      await tx.onboardingStepInstance.deleteMany({
        where: { onboardingInstance: { employeeId } },
      });
      await tx.onboardingInstance.deleteMany({ where: { employeeId } });

      // Form related
      await tx.formDataRecord.deleteMany({ where: { employeeId } });
      await tx.formSubmission.deleteMany({ where: { employeeId } });
      await tx.formAssignment.deleteMany({ where: { employeeId } });

      // Employment and compliance
      await tx.documentAcknowledgement.deleteMany({ where: { employeeId } });
      await tx.employmentCheck.deleteMany({ where: { employeeId } });
      await tx.driverLicence.deleteMany({ where: { employeeId } });
      await tx.trainingRecord.deleteMany({ where: { employeeId } });

      // Leave
      await tx.leaveEntitlement.deleteMany({ where: { employeeId } });
      await tx.leaveRequest.deleteMany({
        where: {
          OR: [
            { employeeId },
            { requesterId: userId },
            { approvedById: userId },
          ],
        },
      });

      // Offboarding (tasks cascade on offboarding delete)
      await tx.employeeOffboarding.deleteMany({ where: { employeeId } });

      // Documents: delete only those attached to this employee
      await tx.document.deleteMany({ where: { employeeId } });

      // Onboarding assignments for this user
      await tx.onboardingAssignment.deleteMany({ where: { userId } });

      // Activation token
      await tx.activationToken.deleteMany({ where: { userId } });

      // Saved reports and authored news posts
      await tx.savedReport.deleteMany({ where: { createdBy: userId } });
      await tx.newsPost.deleteMany({ where: { authorId: userId } });

      // Reassign company-level documents uploaded by this user (if any) to another admin, else delete
      if (companyId) {
        const fallbackAdmin = await tx.user.findFirst({
          where: { companyId, role: "ADMIN", id: { not: userId } },
          select: { id: true },
        });
        if (fallbackAdmin) {
          await tx.document.updateMany({
            where: { uploaderId: userId, employeeId: null },
            data: { uploaderId: fallbackAdmin.id },
          });
        } else {
          await tx.document.deleteMany({
            where: { uploaderId: userId, employeeId: null },
          });
        }
      } else {
        await tx.document.deleteMany({
          where: { uploaderId: userId, employeeId: null },
        });
      }

      // Working pattern assignments
      await tx.employeeWorkingPatternAssignment.deleteMany({
        where: { employeeId },
      });

      // Finally delete employee then user
      await tx.employee.delete({ where: { id: employeeId } });
      await tx.user.delete({ where: { id: userId } });

      return { deleted: true };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(
      "Error deleting employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
