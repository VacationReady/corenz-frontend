/**
 * Report Share API
 * 
 * Manages report sharing including:
 * - Sharing with users, teams, departments
 * - Creating shareable links
 * - Managing permissions
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

const shareSchema = z.object({
  reportId: z.number(),
  shareType: z.enum(["user", "team", "department", "company", "link"]),
  permission: z.enum(["view", "edit", "admin"]).default("view"),
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  expiresAt: z.string().datetime().optional(), // For link shares
});

/**
 * Generate a secure share token
 */
function generateShareToken(): string {
  return randomBytes(32).toString("hex");
}

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "Report ID required" }, { status: 400 });
    }

    const parsedReportId = parseInt(reportId, 10);

    // Verify report exists in company
    const report = await prisma.savedReport.findFirst({
      where: {
        id: parsedReportId,
        companyId: session.user.companyId,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Security: Verify requester is owner or has a share granting access
    const isOwner = report.createdBy === session.user.id;
    
    if (!isOwner) {
      // Fetch user's departmentId from database (not available in session)
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { departmentId: true },
      });

      // Check if user has any share granting them access to this report
      const userShare = await prisma.reportShare.findFirst({
        where: {
          reportId: parsedReportId,
          companyId: session.user.companyId,
          OR: [
            // Direct user share
            { userId: session.user.id },
            // Department share (if user has a department)
            ...(currentUser?.departmentId 
              ? [{ departmentId: currentUser.departmentId }] 
              : []),
            // Company-wide share
            { shareType: "company" },
          ],
        },
      });

      if (!userShare) {
        return NextResponse.json(
          { error: "You don't have permission to view shares for this report" },
          { status: 403 }
        );
      }
    }

    const shares = await prisma.reportShare.findMany({
      where: {
        reportId: parsedReportId,
        companyId: session.user.companyId,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
        CreatedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status: "success",
      data: shares,
    });
  } catch (error: any) {
    console.error("Error fetching report shares:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch shares" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = shareSchema.parse(body);

    // Verify user owns or can share this report
    const report = await prisma.savedReport.findFirst({
      where: {
        id: validatedData.reportId,
        companyId: session.user.companyId,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if user has permission to share (owner or admin)
    const isOwner = report.createdBy === session.user.id;
    if (!isOwner) {
      // 🔒 Bug Fix 3.3: Check if user has admin share permission via direct, department, or company share
      // Fetch user's departmentId for department share check
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { departmentId: true },
      });

      // Check if user has admin share permission (direct, department, or company)
      const userShare = await prisma.reportShare.findFirst({
        where: {
          reportId: validatedData.reportId,
          permission: "admin",
          OR: [
            { userId: session.user.id }, // Direct user share
            // Department share (if user has a department)
            ...(currentUser?.departmentId 
              ? [{ departmentId: currentUser.departmentId }] 
              : []),
            { shareType: "company" }, // Company-wide share
          ],
        },
      });
      if (!userShare) {
        return NextResponse.json(
          { error: "You don't have permission to share this report" },
          { status: 403 }
        );
      }
    }

    // Validate recipient belongs to the same tenant (Requirement 7.3)
    if (validatedData.userId) {
      const recipientUser = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          companyId: session.user.companyId,
        },
      });
      if (!recipientUser) {
        return NextResponse.json(
          { error: "Recipient user not found" },
          { status: 404 }
        );
      }
    }

    if (validatedData.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: validatedData.departmentId,
          companyId: session.user.companyId,
        },
      });
      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }
    }

    // Generate share token for link shares
    const shareToken = validatedData.shareType === "link" 
      ? generateShareToken() 
      : undefined;

    // Create share
    const share = await prisma.reportShare.create({
      data: {
        reportId: validatedData.reportId,
        shareType: validatedData.shareType,
        permission: validatedData.permission,
        userId: validatedData.userId,
        departmentId: validatedData.departmentId,
        teamId: validatedData.teamId,
        shareToken,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        createdById: session.user.id,
        companyId: session.user.companyId,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Build share link if applicable
    let shareLink: string | undefined;
    if (shareToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      shareLink = `${baseUrl}/reports/shared/${shareToken}`;
    }

    return NextResponse.json({
      status: "success",
      data: {
        ...share,
        shareLink,
      },
    });
  } catch (error: any) {
    console.error("Error creating report share:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid share data", details: error.flatten() },
        { status: 400 }
      );
    }
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This share already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create share" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json({ error: "Share ID required" }, { status: 400 });
    }

    // Find share
    const share = await prisma.reportShare.findFirst({
      where: {
        id: parseInt(shareId, 10),
        companyId: session.user.companyId,
      },
      include: {
        SavedReport: true,
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check if user can delete this share (creator or report owner)
    const isCreator = share.createdById === session.user.id;
    const isReportOwner = share.SavedReport.createdBy === session.user.id;
    
    if (!isCreator && !isReportOwner) {
      return NextResponse.json(
        { error: "You don't have permission to remove this share" },
        { status: 403 }
      );
    }

    await prisma.reportShare.delete({
      where: { id: parseInt(shareId, 10) },
    });

    return NextResponse.json({
      status: "success",
      message: "Share removed successfully",
    });
  } catch (error: any) {
    console.error("Error deleting report share:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to remove share" },
      { status: 500 }
    );
  }
}
















