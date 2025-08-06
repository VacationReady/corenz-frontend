import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (status && status !== "all") {
      where.status = status;
    }

    const [offboardingRecords, total] = await Promise.all([
      prisma.employeeOffboarding.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              jobRole: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
          tasks: {
            select: {
              id: true,
              title: true,
              category: true,
              isRequired: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.employeeOffboarding.count({ where }),
    ]);

    // Calculate completion percentage for each record
    const recordsWithProgress = offboardingRecords.map((record) => {
      const requiredTasks = record.tasks.filter((task) => task.isRequired);
      const completedRequiredTasks = requiredTasks.filter(
        (task) => task.completedAt !== null
      );
      const completionPercentage = requiredTasks.length > 0 
        ? Math.round((completedRequiredTasks.length / requiredTasks.length) * 100)
        : 0;

      return {
        ...record,
        completionPercentage,
        totalTasks: record.tasks.length,
        completedTasks: record.tasks.filter((task) => task.completedAt !== null).length,
      };
    });

    return NextResponse.json({
      records: recordsWithProgress,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching offboarding records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { offboardingId, title, description, category, assignedTo, dueDate, isRequired } = body;

    if (!offboardingId || !title || !category) {
      return NextResponse.json(
        { error: "Offboarding ID, title, and category are required" },
        { status: 400 }
      );
    }

    // Verify offboarding record exists
    const offboardingRecord = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
    });

    if (!offboardingRecord) {
      return NextResponse.json(
        { error: "Offboarding record not found" },
        { status: 404 }
      );
    }

    // Get the highest order for new task placement
    const lastTask = await prisma.offboardingTask.findFirst({
      where: { offboardingId },
      orderBy: { order: "desc" },
    });

    const newOrder = (lastTask?.order || 0) + 10;

    const task = await prisma.offboardingTask.create({
      data: {
        offboardingId,
        title,
        description,
        category,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        isRequired: isRequired ?? false,
        order: newOrder,
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Error creating offboarding task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}