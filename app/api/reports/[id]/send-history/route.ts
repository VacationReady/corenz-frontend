import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const reportId = parseInt(params.id, 10);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    // Verify the report belongs to the user's company
    const report = await prisma.savedReport.findFirst({
      where: {
        id: reportId,
        companyId: session.user.companyId,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Fetch send history
    const history = await prisma.reportSendHistory.findMany({
      where: {
        reportId,
        companyId: session.user.companyId,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        sentAt: "desc",
      },
    });

    // Format the response
    const formattedHistory = history.map((item: any) => ({
      id: item.id,
      reportName: item.reportName,
      sentBy: {
        id: item.User.id,
        email: item.User.email,
        name: `${item.User.firstName || ""} ${item.User.lastName || ""}`.trim() || item.User.email,
      },
      sentAt: item.sentAt,
      recipientType: item.recipientType,
      departments: item.departments as any[],
      jobRoles: item.jobRoles as any[],
      recipientCount: item.recipientCount,
      recipientEmails: item.recipientEmails as string[],
      format: item.format,
      subject: item.subject,
      messageBody: item.messageBody,
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error("Error fetching send history:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch send history",
      },
      { status: 500 }
    );
  }
}

