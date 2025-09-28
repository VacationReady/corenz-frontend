import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createAuditLogs } from "@/lib/audit-helpers";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

// GET: list my actionable items (admin/manager approver) or my submitted requests
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "assigned"; // assigned | submitted

  const companyId = session.user.companyId!;

  if (scope === "submitted") {
    const items = await (prisma as any).transactionalChangeRequest.findMany({
      where: { companyId, requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        Requester: true,
        Employee: { include: { User: true } },
      },
    });
    return NextResponse.json({ success: true, data: items });
  }

  const items = await (prisma as any).transactionalChangeRequest.findMany({
    where: { companyId, approverIds: { has: session.user.id }, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      Requester: true,
      Employee: { include: { User: true } },
    },
  });
  return NextResponse.json({ success: true, data: items });
}

// POST: act on a request { id, action: approve|decline, comment? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action, comment } = await req.json();
  if (!id || !["approve", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const request = await (prisma as any).transactionalChangeRequest.findUnique({ where: { id } });
  if (!request || request.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(request.approverIds || []).includes(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Apply or decline inside a transaction
  const result = await prisma.$transaction(async (tx) => {
    if (action === "decline") {
      const updated = await (tx as any).transactionalChangeRequest.update({
        where: { id },
        data: {
          status: "DECLINED",
          decisionComment: comment ?? null,
          decidedById: session.user.id,
          decidedAt: new Date(),
        },
      });
      return { updated, applied: false } as const;
    }

    // Approve and apply change based on section
    if (request.section === "employment-checks") {
      if (request.action === "CREATE") {
        const data = request.payload as any;
        const created = await tx.employmentCheck.create({
          data: {
            id: crypto.randomUUID(),
            typeOfCheck: data.typeOfCheck,
            documentNumber: data.documentNumber,
            dateOfIssue: new Date(data.dateOfIssue),
            expiryDate: new Date(data.expiryDate),
            employeeId: request.employeeId,
            documentUrl: data.documentUrl ?? null,
            updatedAt: new Date(),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated: created, applied: true } as const;
      }
      if (request.action === "UPDATE" && request.targetId) {
        const data = request.payload as any;
        const updated = await tx.employmentCheck.update({
          where: { id: request.targetId },
          data: {
            typeOfCheck: data.typeOfCheck,
            documentNumber: data.documentNumber,
            dateOfIssue: new Date(data.dateOfIssue),
            expiryDate: new Date(data.expiryDate),
            ...(data.documentUrl ? { documentUrl: data.documentUrl } : {}),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated, applied: true } as const;
      }
    }
    if (request.section === "driver-licenses") {
      if (request.action === "CREATE") {
        const data = request.payload as any;
        const created = await tx.driverLicence.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: request.employeeId,
            type: data.type,
            licenceNumber: data.licenceNumber,
            issueDate: new Date(data.issueDate),
            expiryDate: new Date(data.expiryDate),
            documentId: data.documentId ?? null,
            updatedAt: new Date(),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated: created, applied: true } as const;
      }
      if (request.action === "UPDATE" && request.targetId) {
        const data = request.payload as any;
        const updated = await tx.driverLicence.update({
          where: { id: request.targetId },
          data: {
            type: data.type,
            licenceNumber: data.licenceNumber,
            issueDate: new Date(data.issueDate),
            expiryDate: new Date(data.expiryDate),
            ...(data.documentId ? { documentId: data.documentId } : {}),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated, applied: true } as const;
      }
    }
    if (request.section === "training") {
      if (request.action === "CREATE") {
        const data = request.payload as any;
        const created = await tx.trainingRecord.create({
          data: {
            id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            employeeId: request.employeeId,
            courseId: data.courseId,
            providerId: data.providerId,
            dateCompleted: new Date(data.dateCompleted),
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
            documentId: data.documentId ?? null,
            updatedAt: new Date(),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated: created, applied: true } as const;
      }
      if (request.action === "UPDATE" && request.targetId) {
        const data = request.payload as any;
        const updated = await tx.trainingRecord.update({
          where: { id: request.targetId },
          data: {
            courseId: data.courseId,
            providerId: data.providerId,
            dateCompleted: new Date(data.dateCompleted),
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
            ...(data.documentId ? { documentId: data.documentId } : {}),
          },
        });
        await (tx as any).transactionalChangeRequest.update({
          where: { id },
          data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
        });
        return { updated, applied: true } as const;
      }
    }
    if (request.section === "personal-info") {
      if (request.action === "UPDATE" && request.targetId) {
        const data = request.payload as any;
        const updated = await tx.user.update({ where: { id: request.targetId }, data });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated, applied: true } as const;
      }
    }
    if (request.section === "bank-payroll") {
      if (request.action === "UPDATE" && request.targetId) {
        const data = request.payload as any;
        const updated = await tx.employee.update({ where: { id: request.targetId }, data });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated, applied: true } as const;
      }
    }
    if (request.section === "emergency-contacts") {
      if (request.action === "CREATE") {
        const created = await tx.emergencyContact.create({ data: { id: crypto.randomUUID(), employeeId: request.employeeId, ...(request.payload as any) } });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated: created, applied: true } as const;
      }
      if (request.action === "UPDATE" && request.targetId) {
        const updated = await tx.emergencyContact.update({ where: { id: request.targetId }, data: request.payload as any });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated, applied: true } as const;
      }
      if (request.action === "DELETE" && request.targetId) {
        await tx.emergencyContact.delete({ where: { id: request.targetId } });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated: null, applied: true } as const;
      }
    }
    if (request.section.startsWith("forms:")) {
      if (request.action === "CREATE") {
        const formId = (request.section.split(":")[1] || "").trim();
        const data = (request.payload as any).data;
        const created = await tx.formSubmission.create({
          data: { id: crypto.randomUUID(), formId, employeeId: request.employeeId, data },
        });
        await (tx as any).transactionalChangeRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() } });
        return { updated: created, applied: true } as const;
      }
    }
    throw new Error("Unsupported section/action");
  });

  // On approval, create audit logs and notify requester
  if (result.applied) {
    try {
      await createAuditLogs({
        companyId: request.companyId,
        employeeId: request.employeeId,
        section: request.section,
        diffs: request.diffs as any,
        reasons: request.reasons as any,
        changedById: request.requesterId,
      });
    } catch (e) {
      // swallow to not block response
      console.error("Failed to create audit logs after approval", e);
    }
  }

  // Notify requester on decision
  try {
    const requester = await prisma.user.findUnique({ where: { id: request.requesterId } });
    const employee = await prisma.employee.findUnique({ where: { id: request.employeeId }, include: { User: true } });
    const employeeName = employee?.User ? `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim() || employee.User.email : "Employee";
    const baseUrl = getAppBaseUrl();
    const { html, text } = renderPeopleCoreEmail({
      preheader: `Your change to ${employeeName}'s ${request.section} was ${result.applied ? "approved" : "declined"}`,
      title: `Change ${result.applied ? "Approved" : "Declined"}`,
      intro: [
        `Your ${request.section} change for ${employeeName} was ${result.applied ? "approved" : "declined"}.`,
        request.decisionComment ? `Comment: ${request.decisionComment}` : undefined,
      ].filter(Boolean) as string[],
      ctas: { label: "View Action Items", href: `${baseUrl}/dashboard/approvals` },
      outro: ["PeopleCore HRIS System"],
    });
    if (requester?.email) {
      await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: requester.email, subject: `Change ${result.applied ? "approved" : "declined"}`, html, text });
    }
  } catch (e) {
    console.error("Failed to notify requester", e);
  }

  return NextResponse.json({ success: true });
}


