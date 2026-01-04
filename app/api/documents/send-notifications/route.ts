import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { resend } from "@/lib/resend";
import { getAppBaseUrl } from "@/lib/email/template";
import { buildDocumentNotificationEmail } from "@/lib/email/documentNotifications";

/**
 * POST /api/documents/send-notifications
 * 
 * Sends notifications for a document that was uploaded with deferNotifications=true.
 * This is typically called after signature field placement is completed.
 * 
 * Body: { documentId: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    // Fetch the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        companyId: session.user.companyId,
      },
      include: {
        Department: true,
        JobRole: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only send notifications for docs that require acknowledgement or signature
    if (!document.requiresAck && !document.requiresSignature) {
      return NextResponse.json({ 
        message: "Document does not require acknowledgement or signature" 
      }, { status: 200 });
    }

    let employeeForDocument: { id: string; userId: string | null } | null = null;

    if (document.employeeId) {
      employeeForDocument = await prisma.employee.findFirst({
        where: { id: document.employeeId, companyId: document.companyId },
        select: { id: true, userId: true },
      });
    }

    let employeesInScope: { id: string; userId: string | null }[] | null = null;

    // Determine which employees should receive notifications
    if (!document.employeeId) {
      const departmentIds = document.Department.map((d) => d.id);
      const jobRoleIds = document.JobRole.map((j) => j.id);

      if (
        (!departmentIds || departmentIds.length === 0) &&
        (!jobRoleIds || jobRoleIds.length === 0)
      ) {
        employeesInScope = await prisma.employee.findMany({
          where: {
            isActive: true,
            User: { companyId: document.companyId },
          },
          select: { id: true, userId: true },
        });
      } else {
        employeesInScope = await prisma.employee.findMany({
          where: {
            isActive: true,
            User: { companyId: document.companyId },
            OR: [
              departmentIds && departmentIds.length > 0
                ? { departmentId: { in: departmentIds } }
                : undefined,
              jobRoleIds && jobRoleIds.length > 0
                ? { jobRoleId: { in: jobRoleIds } }
                : undefined,
            ].filter(Boolean) as any,
          },
          select: { id: true, userId: true },
        });
      }
    }

    let emailsSent = 0;

    // Send email for employee-specific document
    if (document.employeeId && employeeForDocument?.userId) {
      const user = await prisma.user.findFirst({
        where: { id: employeeForDocument.userId, companyId: document.companyId },
        select: { email: true, name: true, firstName: true },
      });

      if (user?.email) {
        const baseUrl = getAppBaseUrl();
        const docLink = `${baseUrl}/employees/${document.employeeId}/documents?open=${document.id}`;
        const { subject, html, text } = buildDocumentNotificationEmail({
          recipientName: user.name,
          recipientFirstName: user.firstName,
          documentName: document.name,
          category: document.category,
          docLink,
          requiresSignature: document.requiresSignature,
          signatureDueAt: document.signatureDueAt,
        });

        try {
          await resend.emails.send({
            from: "noreply@peoplecore.co.nz",
            to: user.email,
            subject,
            html,
            text,
          });
          emailsSent++;
        } catch (emailError) {
          console.error("Failed to send email to", user.email, emailError);
        }
      }
    }

    // Send emails for company document
    if (!document.employeeId && employeesInScope) {
      const scopedEmployees = employeesInScope;
      const users = await prisma.user.findMany({
        where: {
          id: { in: scopedEmployees.map((e) => e.userId).filter(Boolean) as string[] },
          email: { not: "" },
          companyId: document.companyId,
        },
        select: { id: true, email: true, name: true, firstName: true },
      });

      const chunkSize = 50;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (user) => {
            const baseUrl = getAppBaseUrl();
            const docLink = `${baseUrl}/documents?open=${document.id}`;
            const { subject, html, text } = buildDocumentNotificationEmail({
              recipientName: user.name,
              recipientFirstName: user.firstName,
              documentName: document.name,
              category: document.category,
              docLink,
              requiresSignature: document.requiresSignature,
              signatureDueAt: document.signatureDueAt,
            });

            try {
              await resend.emails.send({
                from: "noreply@peoplecore.co.nz",
                to: user.email,
                subject,
                html,
                text,
              });
              emailsSent++;
            } catch (emailError) {
              console.error("Failed to send email to", user.email, emailError);
            }
          }),
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      emailsSent,
      message: `Notifications sent to ${emailsSent} recipient(s)`
    });
  } catch (error) {
    console.error("❌ Send notifications error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
