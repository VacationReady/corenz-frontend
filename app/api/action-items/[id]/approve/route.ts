/**
 * Action Item Approval Endpoint
 * Handles approve/reject for AI-generated bulk update requests
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createAuditLogs, type AuditDiff } from "@/lib/audit-helpers";
import { resend } from "@/lib/resend";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: actionItemId } = await context.params;
    const { decision, reason } = await req.json(); // decision: "approve" or "reject"

    // Fetch the action item
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      include: {
        assignedTo: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!actionItem || actionItem.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    // Verify current user is the assignee
    if (actionItem.assignedToId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the assigned person can approve/reject this" },
        { status: 403 }
      );
    }

    if (actionItem.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request has already been ${actionItem.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Handle rejection
    if (decision === "reject") {
      await prisma.actionItem.update({
        where: { id: actionItemId },
        data: {
          status: "REJECTED",
          completedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...(actionItem.metadata as any),
            rejectedBy: session.user.id,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason || "No reason provided",
          },
        },
      });

      // Notify requester
      const requester = (actionItem.metadata as any)?.requestedBy;
      if (requester) {
        // You can create a notification here or send email
        console.log(`Notifying requester ${requester} that request was rejected`);
      }

      return NextResponse.json({
        success: true,
        message: "Request rejected",
        data: { status: "REJECTED" },
      });
    }

    // Handle approval - execute the bulk update!
    if (decision === "approve") {
      const metadata = actionItem.metadata as any;
      const changes = metadata?.changes || [];

      if (changes.length === 0) {
        return NextResponse.json(
          { error: "No changes found in this approval request" },
          { status: 400 }
        );
      }

      // Execute all changes in a transaction
      const results = await prisma.$transaction(async (tx) => {
        const completed = [];

        for (const change of changes) {
          // Update the employee field
          await tx.employee.update({
            where: { id: change.employeeId },
            data: { [change.field]: change.newValue },
          });

          // Create audit log entry
          const diffs: AuditDiff[] = [
            {
              field: change.field,
              oldValue: String(change.currentValue || 0),
              newValue: String(change.newValue || 0),
            },
          ];

          await createAuditLogs({
            companyId: actionItem.companyId,
            employeeId: change.employeeId,
            section: "compensation",
            diffs,
            reasons: {
              [change.field]: `Approved via action item: ${actionItem.title}. Approved by ${session.user.name || session.user.email}. ${reason || ""}`,
            },
            changedById: session.user.id,
          });

          completed.push(change);
        }

        return completed;
      });

      // Mark action item as completed
      await prisma.actionItem.update({
        where: { id: actionItemId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...metadata,
            approvedBy: session.user.id,
            approvedAt: new Date().toISOString(),
            approvalReason: reason || "Approved",
            executedChanges: results.length,
          },
        },
      });

      // Notify requester
      const requester = metadata?.requestedBy;
      if (requester) {
        const requesterUser = await prisma.user.findUnique({
          where: { id: requester },
          select: { email: true, firstName: true },
        });

        if (requesterUser?.email) {
          try {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
              to: requesterUser.email,
              subject: `✅ Your bulk update request has been approved`,
              html: `
                <p>Hi ${requesterUser.firstName || "there"},</p>
                <p>Good news! Your bulk update request has been approved by ${session.user.firstName || "the CEO"}.</p>
                <p><strong>Request:</strong> ${actionItem.title}</p>
                <p><strong>Changes applied:</strong> ${results.length} employees updated</p>
                <p>All changes have been applied and audit logs have been created.</p>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send approval notification:", emailError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `✅ Approved! ${results.length} employees updated successfully.`,
        data: {
          status: "COMPLETED",
          changesApplied: results.length,
        },
      });
    }

    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  } catch (error: any) {
    console.error("Approval action failed:", error);
    return NextResponse.json(
      { error: error.message || "Approval action failed" },
      { status: 500 }
    );
  }
}

