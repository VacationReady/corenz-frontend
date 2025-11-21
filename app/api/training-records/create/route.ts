import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";
import { canAccessEmployee } from "@/lib/permissions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const employeeId = (formData.get("employeeId") as string | null)?.trim();
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }
  const courseId = formData.get("courseId") as string;
  const providerId = formData.get("providerId") as string;
  const dateCompleted = new Date(formData.get("dateCompleted") as string);
  const expiryDateRaw = formData.get("expiryDate") as string;
  const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
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

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, companyId: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (employee.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await canAccessEmployee(
    {
      id: session.user.id,
      role: session.user.role as any,
      companyId: session.user.companyId,
    },
    employeeId,
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let documentId: string | null = null;

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
        id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
        category: "Training Certificate",
        url: publicUrl,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
        employeeId: employeeId as string,
      },
    });

    documentId = doc.id;
  }

  const isAdmin = session.user.role === "ADMIN";
  let trainingRecord: any = null;
  const diffs = formatDiffsForFormData({ courseId, providerId, dateCompleted, expiryDate, documentId });
  if (isAdmin) {
    trainingRecord = await prisma.trainingRecord.create({
      data: {
        id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        courseId,
        providerId,
        dateCompleted,
        expiryDate,
        documentId,
        updatedAt: new Date(),
      },
    });
  } else {
    const recipients = await getTransactionalRecipients({
      companyId: session.user.companyId!,
      employeeId,
      section: "training",
      changedById: session.user.id,
    });
    const approverIds = recipients.map((r) => r.id);
    await (prisma as any).transactionalChangeRequest.create({
      data: {
        companyId: session.user.companyId!,
        employeeId,
        section: "training",
        action: "CREATE",
        targetId: null,
        payload: { courseId, providerId, dateCompleted, expiryDate, documentId },
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
        preheader: "Approval needed: Training record",
        title: "Approval requested: Training Record",
        sections: [
          { title: "Summary", description: [
            `Course: ${courseId}`,
            `Provider: ${providerId}`,
            `Completed: ${dateCompleted.toISOString().slice(0,10)}`,
            expiryDate ? `Expiry: ${expiryDate.toISOString().slice(0,10)}` : undefined,
          ].filter(Boolean) as string[] },
        ],
        ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard` },
        outro: ["PeopleCore HRIS System"],
      });
      await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Training Record", html, text });
    }
  }

  // Audit logs only when admin applied immediately
  if (isAdmin) {
    try {
      await createAuditLogs({
        companyId: session.user.companyId!,
        employeeId,
        section: "training",
        diffs,
        reasons,
        changedById: session.user.id,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  if (isAdmin) {
    return NextResponse.json(trainingRecord);
  } else {
    return NextResponse.json({ success: true, pendingApproval: true });
  }
}

