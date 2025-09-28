export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const employeeId = formData.get("employeeId") as string;
  const file = formData.get("file") as File | null;
  const reasonsRaw = formData.get("reasons") as string | null;
  if (!reasonsRaw) {
    return NextResponse.json({ error: "Reasons required" }, { status: 400 });
  }
  let reasons: Record<string, string>;
  try {
    reasons = JSON.parse(reasonsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid reasons payload" }, { status: 400 });
  }

  let documentUrl: string | null = null;
  let documentName: string | null = null;
  let documentSize: number | null = null;
  let documentType: string | null = null;
  let documentPath: string | null = null;
  let documentSignedUrl: string | null = null;

  try {
    if (file) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${randomUUID()}.${fileExt}`;

      // ✅ Convert to Buffer to avoid duplex issues
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, buffer, {
          contentType: file.type,
        });

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      documentUrl = data.path;
      documentName = file.name;
      documentSize = file.size;
      documentType = file.type;
      documentPath = data.path;

      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(data.path, 60 * 5);
      documentSignedUrl = signed?.signedUrl ?? null;
    }

    // If actor is ADMIN, commit immediately; otherwise create a pending change request
    const isAdmin = session.user.role === "ADMIN";
    let employmentCheck: any = null;
    const diffs = formatDiffsForFormData({
      typeOfCheck,
      documentNumber,
      dateOfIssue: new Date(dateOfIssue),
      expiryDate: new Date(expiryDate),
      documentUrl,
    });

    if (isAdmin) {
      employmentCheck = await prisma.employmentCheck.create({
        data: {
          id: crypto.randomUUID(),
          typeOfCheck,
          documentNumber,
          dateOfIssue: new Date(dateOfIssue),
          expiryDate: new Date(expiryDate),
          employeeId,
          documentUrl,
          updatedAt: new Date(),
        },
      });
    } else {
      const recipients = await getTransactionalRecipients({
        companyId: session.user.companyId!,
        employeeId,
        section: "employment-checks",
        changedById: session.user.id,
      });
      const approverIds = recipients.map((r) => r.id);
      await (prisma as any).transactionalChangeRequest.create({
        data: {
          companyId: session.user.companyId!,
          employeeId,
          section: "employment-checks",
          action: "CREATE",
          targetId: null,
          payload: {
            typeOfCheck,
            documentNumber,
            dateOfIssue,
            expiryDate,
            documentUrl,
          },
          oldValues: {},
          diffs,
          reasons,
          requesterId: session.user.id,
          approverIds,
        },
      });

      // Notify approvers
      const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
      if (toEmails.length) {
        const baseUrl = getAppBaseUrl();
        const { html, text } = renderPeopleCoreEmail({
          preheader: `Approval needed: Employment Checks change` ,
          title: `Approval requested: Employment Checks`,
          intro: [
            `${session.user.email} submitted a new Employment Check for approval.`,
          ],
          sections: [
            { title: "Summary", description: [
              `Type: ${typeOfCheck}`,
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

    // ✅ Also create Document record for /documents view
    if (documentUrl && documentName && documentPath) {
      await prisma.document.create({
        data: {
          id: crypto.randomUUID(),
          name: documentName,
          path: documentPath,
          url: documentPath,
          size: documentSize ?? 0,
          type: documentType ?? "",
          category: "Employment Checks",
          employeeId,
          uploaderId: session.user.id,
          companyId: session.user.companyId ?? undefined,
        },
      });
    }

    // Audit logs (only for immediate admin commits). For non-admins, audit will be created on approval.
    if (isAdmin) {
      try {
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId,
          section: "employment-checks",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    if (isAdmin) {
      return NextResponse.json({
        ...employmentCheck,
        documentUrl: documentSignedUrl,
      });
    } else {
      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: "Submitted for approval",
      });
    }
  } catch (error) {
    console.error("Employment Check creation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

