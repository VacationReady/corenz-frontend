export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";
import { computeDiffs, createAuditLogs, diffRequiresReason } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const file = formData.get("file") as File | null;
  const reasonsRaw = formData.get("reasons") as string | null;
  let reasons: Record<string, string> | undefined = undefined;
  if (reasonsRaw) {
    try {
      reasons = JSON.parse(reasonsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid reasons payload" }, { status: 400 });
    }
  }

  const existing = await prisma.employmentCheck.findUnique({
    where: { id },
    include: {
      Employee: {
        include: {
          Company: true,
          User: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const companyId = session.user.companyId;
  if (!companyId || existing.Employee?.companyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let documentUrl: string | undefined = undefined;
  let signedUrl: string | undefined = undefined;

  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file.stream(), {
        contentType: file.type,
      });
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
    documentUrl = data.path;
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 5);
    signedUrl = signed?.signedUrl;
  }

  const isAdmin = session.user.role === "ADMIN";
  let updated: any = existing;
  if (isAdmin) {
    updated = await prisma.employmentCheck.update({
      where: { id },
      data: {
        typeOfCheck,
        documentNumber,
        dateOfIssue: new Date(dateOfIssue),
        expiryDate: new Date(expiryDate),
        ...(documentUrl && { documentUrl }),
      },
    });
  }

  if (!signedUrl && updated.documentUrl) {
    const { data: signedExisting } = await supabase.storage
      .from("documents")
      .createSignedUrl(updated.documentUrl, 60 * 5);
    signedUrl = signedExisting?.signedUrl;
  }

  const diffs = computeDiffs(
    existing,
    { ...existing, typeOfCheck, documentNumber, dateOfIssue: new Date(dateOfIssue), expiryDate: new Date(expiryDate), ...(documentUrl && { documentUrl }) },
    ["typeOfCheck", "documentNumber", "dateOfIssue", "expiryDate", "documentUrl"] as const,
  );
  if (diffs.length > 0) {
    const requiresReasons = diffs.some(diffRequiresReason);
    if (requiresReasons && !reasons) {
      return NextResponse.json({ error: "Reasons required" }, { status: 400 });
    }
    if (isAdmin) {
      try {
        await createAuditLogs({
          companyId: existing.Employee.companyId,
          employeeId: existing.employeeId,
          section: "employment-checks",
          diffs,
          reasons: reasons || {},
          changedById: session.user.id,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    } else {
      // Create pending change request for approval
      const recipients = await getTransactionalRecipients({
        companyId: session.user.companyId!,
        employeeId: existing.employeeId,
        section: "employment-checks",
        changedById: session.user.id,
      });
      const approverIds = recipients.map((r) => r.id);
      await (prisma as any).transactionalChangeRequest.create({
        data: {
          companyId: session.user.companyId!,
          employeeId: existing.employeeId,
          section: "employment-checks",
          action: "UPDATE",
          targetId: existing.id,
          payload: {
            typeOfCheck,
            documentNumber,
            dateOfIssue,
            expiryDate,
            ...(documentUrl && { documentUrl }),
          },
          oldValues: {
            typeOfCheck: existing.typeOfCheck,
            documentNumber: existing.documentNumber,
            dateOfIssue: existing.dateOfIssue,
            expiryDate: existing.expiryDate,
            documentUrl: existing.documentUrl,
          },
          diffs,
          reasons: reasons || {},
          requesterId: session.user.id,
          approverIds,
        },
      });

      // Notify approvers
      const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
      if (toEmails.length) {
        const baseUrl = getAppBaseUrl();
        const { html, text } = renderPeopleCoreEmail({
          preheader: `Approval needed: Employment Checks change`,
          title: `Approval requested: Employment Checks`,
          intro: [
            `${session.user.email} submitted changes to Employment Checks for approval.`,
          ],
          sections: [
            { title: "Summary", description: [
              `Document: ${documentNumber}`,
              `Issue: ${dateOfIssue}`,
              `Expiry: ${expiryDate}`,
            ] },
          ],
          ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
          outro: ["PeopleCore HRIS System"],
        });
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
          to: toEmails,
          subject: `Approval needed: Employment Checks`,
          html,
          text,
        });
      }
    }
  }

  if (isAdmin) {
    return NextResponse.json({ ...updated, documentUrl: signedUrl ?? null });
  } else {
    return NextResponse.json({ success: true, pendingApproval: true, message: "Submitted for approval" });
  }
}
