import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendOffboardingCompletionSummaryEmail } from "@/lib/email/send";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = params;
    const body = await req.json();
    const { completed, notes, assignedTo } = body;

    const task = await prisma.offboardingTask.findUnique({
      where: { id: taskId },
      include: { EmployeeOffboarding: { include: { Employee: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const companyId = session.user.companyId;

    if (task.EmployeeOffboarding.Employee.companyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (completed !== undefined) {
      updateData.completedAt = completed ? new Date() : null;
      updateData.completedBy = completed ? session.user.id : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (assignedTo !== undefined) {
      if (assignedTo) {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedTo },
          select: { id: true, companyId: true },
        });
        if (!assignee) {
          return NextResponse.json(
            { error: "Assigned user not found" },
            { status: 400 },
          );
        }
        if (assignee.companyId !== companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      updateData.assignedTo = assignedTo;
    }

    const updatedTask = await prisma.offboardingTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        User_OffboardingTask_assignedToToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        User_OffboardingTask_completedByToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Check if all required tasks are completed to update offboarding status
    if (completed) {
      const allTasks = await prisma.offboardingTask.findMany({
        where: {
          offboardingId: task.offboardingId,
          EmployeeOffboarding: { is: { Employee: { companyId } } },
        },
      });

      const allRequiredTasksCompleted = allTasks
        .filter((t) => t.isRequired)
        .every((t) => t.completedAt !== null);

      if (allRequiredTasksCompleted) {
        await prisma.employeeOffboarding.update({
          where: { id: task.offboardingId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        // Update employee status to fully offboarded
        await prisma.employee.update({
          where: { id: task.EmployeeOffboarding.employeeId },
          data: {
            offboardingStatus: "COMPLETED",
          },
        });

        await sendOffboardingCompletionSummaryEmail(task.offboardingId);
      }
    }

    return NextResponse.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = params;

    const task = await prisma.offboardingTask.findUnique({
      where: { id: taskId },
      include: { EmployeeOffboarding: { include: { Employee: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.EmployeeOffboarding.Employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't allow deletion of required tasks
    if (task.isRequired) {
      return NextResponse.json(
        { error: "Cannot delete required tasks" },
        { status: 400 },
      );
    }

    await prisma.offboardingTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
