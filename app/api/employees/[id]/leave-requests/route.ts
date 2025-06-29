import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Only MANAGER or ADMIN can view approvals
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | null;
    const status = statusParam || "PENDING";

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        approvalStatus: status,
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        reason: true,
        approvalStatus: true,
        employee: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ success: true, data: leaveRequests });
  } catch (error: any) {
    console.error("API error fetching leave requests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests." },
      { status: 500 }
    );
  }
}

// Existing POST handler remains for leave request creation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }
    const userId = session.user.id;

    const employeeId = params.id;
    const body = await req.json();
    const { type, startDate, endDate, reason } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employee: { connect: { id: employeeId } },
        createdBy: { connect: { id: userId } },
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason ?? "",
      },
    });

    return NextResponse.json({ success: true, data: newLeaveRequest });
  } catch (error: any) {
    console.error("API error creating leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request." },
      { status: 500 }
    );
  }
}
