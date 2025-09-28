import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const employeeId = formData.get("employeeId") as string;
  const type = formData.get("type") as string;
  const licenceNumber = formData.get("licenceNumber") as string;
  const issueDate = new Date(formData.get("issueDate") as string);
  const expiryDate = new Date(formData.get("expiryDate") as string);
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

  let documentId: string | null = null; // ✅ FIXED TYPING

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer);

    if (error) {
      return NextResponse.json(
        { error: "Supabase upload failed", details: error.message },
        { status: 500 },
      );
    }

    const publicUrl = `https://lzthrdwhziggqfbgogij.supabase.co/storage/v1/object/public/documents/${data.path}`;

    const doc = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
        category: "Driver Licence",
        url: publicUrl,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
        employeeId: employeeId,
      },
    });

    documentId = doc.id; // ✅ now valid
  }

  const isAdmin = session.user.role === "ADMIN";
  let licence: any = null;
  const diffs = formatDiffsForFormData({
    type,
    licenceNumber,
    issueDate,
    expiryDate,
    documentId,
  });

  if (isAdmin) {
    licence = await prisma.driverLicence.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        type,
        licenceNumber,
        issueDate,
        expiryDate,
        documentId,
        updatedAt: new Date(),
      },
    });
  } else {
    const recipients = await getTransactionalRecipients({
      companyId: session.user.companyId!,
      employeeId,
      section: "driver-licenses",
      changedById: session.user.id,
    });
    const approverIds = recipients.map((r) => r.id);
    await (prisma as any).transactionalChangeRequest.create({
      data: {
        companyId: session.user.companyId!,
        employeeId,
        section: "driver-licenses",
        action: "CREATE",
        targetId: null,
        payload: { type, licenceNumber, issueDate, expiryDate, documentId },
        oldValues: {},
        diffs,
        reasons,
        requesterId: session.user.id,
        approverIds,
      },
    });

    const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
    if (toEmails.length) {
      const baseUrl = getAppBaseUrl();
      const { html, text } = renderPeopleCoreEmail({
        preheader: "Approval needed: Driver License",
        title: "Approval requested: Driver License",
        sections: [
          {
            title: "Summary",
            description: [
              `Type: ${type}`,
              `Licence: ${licenceNumber}`,
              `Issue: ${issueDate.toISOString().slice(0, 10)}`,
              `Expiry: ${expiryDate.toISOString().slice(0, 10)}`,
            ],
          },
        ],
        ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
        outro: ["PeopleCore HRIS System"],
      });
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
        to: toEmails,
        subject: "Approval needed: Driver License",
        html,
        text,
      });
    }
  }

  // Build and write audit logs (admin immediate only)
  if (isAdmin) {
    try {
      await createAuditLogs({
        companyId: session.user.companyId!,
        employeeId,
        section: "driver-licenses",
        diffs,
        reasons,
        changedById: session.user.id,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  if (isAdmin) {
    return NextResponse.json(licence);
  } else {
    return NextResponse.json({ success: true, pendingApproval: true });
  }
}

