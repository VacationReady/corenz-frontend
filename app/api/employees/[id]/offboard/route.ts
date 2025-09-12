import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { OffboardingType, TaskCategory } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = params;
    const body = await req.json();

    const {
      lastWorkingDate,
      offboardingType,
      offboardingReason,
      isVoluntary,
      noticePeriodDays,
      resignationDate,
      removeAccessImmediately,
      handoverRequired,
      handoverAssignedTo,
      exitInterviewRequired,
      assetsToReturn,
      hrNotes,
    } = body;

    // Validate required fields
    if (!lastWorkingDate || !offboardingType) {
      return NextResponse.json(
        { error: "Last working date and offboarding type are required" },
        { status: 400 },
      );
    }

    // Check if employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, offboardingRecord: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.offboardingRecord) {
      return NextResponse.json(
        { error: "Employee is already being offboarded" },
        { status: 400 },
      );
    }

    // If a handover assignee is specified, ensure they exist and map to their user ID
    let handoverAssigneeUserId: string | null = null;
    if (handoverAssignedTo) {
      const assignee = await prisma.employee.findUnique({
        where: { id: handoverAssignedTo },
        select: { userId: true },
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Handover assignee not found" },
          { status: 400 },
        );
      }

      handoverAssigneeUserId = assignee.userId;
    }

    // Create offboarding record
    const offboardingRecord = await prisma.employeeOffboarding.create({
      data: {
        employeeId,
        initiatedById: session.user.id,
        lastWorkingDate: new Date(lastWorkingDate),
        offboardingType: offboardingType as OffboardingType,
        offboardingReason,
        isVoluntary: isVoluntary ?? true,
        noticePeriodDays,
        resignationDate: resignationDate ? new Date(resignationDate) : null,
        removeAccessImmediately: removeAccessImmediately ?? false,
        handoverRequired: handoverRequired ?? false,
        handoverAssignedTo: handoverAssigneeUserId ?? undefined,
        exitInterviewRequired: exitInterviewRequired ?? false,
        assetsToReturn: assetsToReturn || null,
        hrNotes,
        // Set access removal time if immediate
        accessRemovedAt: removeAccessImmediately ? new Date() : null,
        accessRemovedBy: removeAccessImmediately ? session.user.id : null,
      },
    });

    // Create default offboarding tasks
    const defaultTasks = [
      {
        title: "Revoke system access",
        description: "Remove access to all company systems and accounts",
        category: "ACCESS" as TaskCategory,
        isRequired: true,
        order: 1,
      },
      {
        title: "Collect company assets",
        description:
          "Retrieve laptop, phone, keys, ID card, and other company property",
        category: "ASSETS" as TaskCategory,
        isRequired: true,
        order: 2,
      },
      {
        title: "Process final payroll",
        description: "Calculate final pay including unused leave and benefits",
        category: "PAYROLL" as TaskCategory,
        isRequired: true,
        order: 3,
      },
      {
        title: "HR documentation review",
        description: "Complete HR checklist and ensure compliance",
        category: "HR" as TaskCategory,
        isRequired: true,
        order: 4,
      },
      {
        title: "Archive employee records",
        description: "Move employee documentation to archived status",
        category: "COMPLIANCE" as TaskCategory,
        isRequired: true,
        order: 5,
      },
    ];

    // Add conditional tasks
    if (handoverRequired && handoverAssigneeUserId) {
      defaultTasks.push({
        title: "Complete knowledge handover",
        description:
          "Transfer responsibilities and knowledge to assigned colleague",
        category: "HANDOVER" as TaskCategory,
        isRequired: true,
        order: 2.5,
      });
    }

    if (exitInterviewRequired) {
      defaultTasks.push({
        title: "Conduct exit interview",
        description: "Schedule and complete exit interview",
        category: "HR" as TaskCategory,
        isRequired: false,
        order: 3.5,
      });
    }

    // Create tasks
    await prisma.offboardingTask.createMany({
      data: defaultTasks.map((task) => ({
        offboardingId: offboardingRecord.id,
        title: task.title,
        description: task.description,
        category: task.category,
        isRequired: task.isRequired,
        order: Math.floor(task.order * 10), // Convert to integer
        assignedTo:
          task.category === TaskCategory.HANDOVER
            ? handoverAssigneeUserId
            : null,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      })),
    });

    // Update employee status
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isActive: false,
        offboardingStatus: "IN_PROGRESS",
        offboardingDate: new Date(),
        lastWorkingDate: new Date(lastWorkingDate),
        noticePeriodDays,
        offboardingReason,
      },
    });

    return NextResponse.json({
      message: "Offboarding process started successfully",
      offboardingId: offboardingRecord.id,
    });
  } catch (error) {
    console.error("Error starting offboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = params;

    const offboardingRecord = await prisma.employeeOffboarding.findUnique({
      where: { employeeId },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
            jobRole: true,
          },
        },
        initiatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        handoverAssignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        exitInterview: true,
        tasks: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            completedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!offboardingRecord) {
      return NextResponse.json(
        { error: "No offboarding record found for this employee" },
        { status: 404 },
      );
    }

    let interviewer = null;
    if (offboardingRecord.exitInterview?.interviewerId) {
      interviewer = await prisma.user.findUnique({
        where: { id: offboardingRecord.exitInterview.interviewerId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    }

    const response = {
      ...offboardingRecord,
      exitInterview: offboardingRecord.exitInterview
        ? { ...offboardingRecord.exitInterview, interviewer }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching offboarding record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = params;
    const body = await req.json();

    const offboardingRecord = await prisma.employeeOffboarding.findUnique({
      where: { employeeId },
    });

    if (!offboardingRecord) {
      return NextResponse.json(
        { error: "No offboarding record found" },
        { status: 404 },
      );
    }

    // Update the offboarding record
    const updatedRecord = await prisma.employeeOffboarding.update({
      where: { id: offboardingRecord.id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Offboarding record updated successfully",
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Error updating offboarding record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
