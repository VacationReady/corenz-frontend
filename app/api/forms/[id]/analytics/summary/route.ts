import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch form analytics summary
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formId = params.id;

    // Verify form exists and belongs to company
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        formType: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get submission metrics
    const submissions = await prisma.formSubmission.findMany({
      where: {
        formId,
        form: {
          companyId: session.user.companyId,
        },
      },
      select: {
        id: true,
        employeeId: true,
        submittedAt: true,
        employee: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                departmentId: true,
                jobRoleId: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
            jobRole: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // Get form assignments for completion rate calculation
    const assignments = await prisma.formAssignment.findMany({
      where: {
        formId,
        form: {
          companyId: session.user.companyId,
        },
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
        completedAt: true,
        dueDate: true,
      },
    });

    // Calculate basic metrics
    const totalSubmissions = submissions.length;
    const uniqueSubmitters = new Set(submissions.map((s) => s.employeeId)).size;
    const totalAssignments = assignments.length;

    // Completion rate (only meaningful if there are assignments)
    let completionRate = null;
    if (totalAssignments > 0) {
      const completedAssignments = assignments.filter(
        (a) => a.status === "completed" || a.completedAt,
      ).length;
      completionRate = Math.round(
        (completedAssignments / totalAssignments) * 100,
      );
    }

    // Calculate submission trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = submissions.filter(
      (s) => new Date(s.submittedAt) >= thirtyDaysAgo,
    );

    // Group submissions by date for trend analysis
    const submissionsByDate = recentSubmissions.reduce(
      (acc, submission) => {
        const date = new Date(submission.submittedAt)
          .toISOString()
          .split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Department breakdown
    const departmentBreakdown = submissions.reduce(
      (acc, submission) => {
        const dept = submission.employee?.department?.name || "No Department";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Job role breakdown
    const jobRoleBreakdown = submissions.reduce(
      (acc, submission) => {
        const role = submission.employee?.jobRole?.name || "No Job Role";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Recent activity (last 10 submissions)
    const recentActivity = submissions.slice(0, 10).map((submission) => ({
      id: submission.id,
      submitterName:
        `${submission.employee?.user?.firstName || ""} ${submission.employee?.user?.lastName || ""}`.trim() ||
        "Unknown",
      submitterEmail: submission.employee?.user?.email,
      department: submission.employee?.department?.name,
      jobRole: submission.employee?.jobRole?.name,
      submittedAt: submission.submittedAt,
    }));

    // Overdue assignments (if applicable)
    const now = new Date();
    const overdueAssignments = assignments.filter(
      (a) =>
        a.status !== "completed" &&
        !a.completedAt &&
        a.dueDate &&
        new Date(a.dueDate) < now,
    ).length;

    const analytics = {
      form: {
        id: form.id,
        name: form.name,
        type: form.formType,
        isActive: form.isActive,
        createdAt: form.createdAt,
      },
      metrics: {
        totalSubmissions,
        uniqueSubmitters,
        completionRate, // null if no assignments
        totalAssignments,
        overdueAssignments,
        recentSubmissions: recentSubmissions.length,
      },
      trends: {
        submissionsByDate,
        last30Days: recentSubmissions.length,
      },
      breakdowns: {
        byDepartment: Object.entries(departmentBreakdown)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byJobRole: Object.entries(jobRoleBreakdown)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      },
      recentActivity,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching form analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
