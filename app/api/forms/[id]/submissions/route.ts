import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

// GET: List submissions (HR/admin view)
export async function GET(
  _: NextRequest,
  context: any,
) {
  const rawParams = context?.params;
  const { id } = rawParams?.then ? await rawParams : rawParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formId: id,
      Form: { companyId: session.user.companyId },
    },
    include: { Employee: true },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

// POST: Employee submits a form
export async function POST(
  req: NextRequest,
  context: any,
) {
  const rawParams = context?.params;
  const { id } = rawParams?.then ? await rawParams : rawParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, employeeId, assignmentId, reasons } = await req.json();

  // Determine which employee is submitting
  const targetEmployeeId = employeeId || session.user.id;

  // Verify the target employee belongs to the same company
  const employee = await prisma.employee.findFirst({
    where: {
      id: targetEmployeeId,
      companyId: session.user.companyId,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Check if form is transactional-enabled
  const form = await prisma.form.findFirst({ where: { id, companyId: session.user.companyId } });
  const isAdmin = session.user.role === "ADMIN";
  let submission: any = null;
  const diffs = formatDiffsForFormData(data || {});

  if (isAdmin || !form?.transactionalEnabled) {
    // Create the submission immediately
    submission = await prisma.formSubmission.create({
      data: {
        id: crypto.randomUUID(),
        formId: id,
        employeeId: targetEmployeeId,
        data,
      },
    });
  } else {
    const recipients = await getTransactionalRecipients({
      companyId: session.user.companyId!,
      employeeId: targetEmployeeId,
      section: `forms:${id}`,
      changedById: session.user.id,
    });
    const approverIds = recipients.map((r) => r.id);
    await (prisma as any).transactionalChangeRequest.create({
      data: {
        companyId: session.user.companyId!,
        employeeId: targetEmployeeId,
        section: `forms:${id}`,
        action: "CREATE",
        targetId: null,
        payload: { data },
        oldValues: {},
        diffs,
        reasons: reasons || {},
        requesterId: session.user.id,
        approverIds,
      },
    });

    const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
    if (toEmails.length) {
      const baseUrl = getAppBaseUrl();
      const { html, text } = renderPeopleCoreEmail({
        preheader: "Approval needed: Form Submission",
        title: "Approval requested: Form Submission",
        sections: [ { title: "Summary", description: [ `Form: ${form?.name ?? id}`, `Fields: ${diffs.length}` ] } ],
        ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
        outro: ["PeopleCore HRIS System"],
      });
      await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Form Submission", html, text });
    }
  }

  // If this submission is for a specific assignment, mark it as completed
  if (assignmentId) {
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
  }

  // Write audit logs immediately only when applied
  if (isAdmin || !form?.transactionalEnabled) {
    try {
      await createAuditLogs({
        companyId: session.user.companyId!,
        employeeId: targetEmployeeId,
        section: `forms:${id}`,
        diffs,
        reasons: reasons || {},
        changedById: session.user.id!,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  if (isAdmin || !form?.transactionalEnabled) {
    return NextResponse.json(submission, { status: 201 });
  } else {
    return NextResponse.json({ success: true, pendingApproval: true }, { status: 201 });
  }
}
