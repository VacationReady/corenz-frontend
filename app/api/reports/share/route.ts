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

    // Verify user has access to this report
    const report = await prisma.savedReport.findFirst({
      where: {
        id: parseInt(reportId, 10),
        companyId: session.user.companyId,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const shares = await prisma.reportShare.findMany({
      where: {
        reportId: parseInt(reportId, 10),
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
      // Check if user has admin share permission
      const userShare = await prisma.reportShare.findFirst({
        where: {
          reportId: validatedData.reportId,
          userId: session.user.id,
          permission: "admin",
        },
      });
      if (!userShare) {
        return NextResponse.json(
          { error: "You don't have permission to share this report" },
          { status: 403 }
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












