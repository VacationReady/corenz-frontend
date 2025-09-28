import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason, serialize } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.User.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, section: _section, ...updateFields } = body;
    const allowed = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "addressStreet",
      "addressCity",
      "addressPostcode",
      "addressCountry",
      "nationalId",
      "pronouns",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateFields, key)) {
        updates[key] = updateFields[key as string];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const before = employee.User;

    // Compute diffs before update
    const diffs = computeDiffs(before, { ...before, ...updates }, allowed);
    
    // Check if reasons are required and provided
    if (diffs.length > 0) {
      const requiresReasons = diffs.some(diffRequiresReason);
      if (requiresReasons && !reasons) {
        return NextResponse.json(
          { error: "Reasons required for changes" },
          { status: 400 }
        );
      }

      if (isAdmin) {
        try {
          await createAuditLogs({
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "personal-info",
            diffs,
            reasons: (reasons as Record<string, string>) || {},
            changedById: session.user.id,
          });
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else {
        const recipients = await getTransactionalRecipients({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "personal-info",
          changedById: session.user.id,
        });
        const approverIds = recipients.map((r) => r.id);
        await (prisma as any).transactionalChangeRequest.create({
          data: {
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "personal-info",
            action: "UPDATE",
            targetId: before.id,
            payload: updates,
            oldValues: allowed.reduce((acc: any, k) => { acc[k] = (before as any)[k]; return acc; }, {}),
            diffs,
            reasons: (reasons as Record<string, string>) || {},
            requesterId: session.user.id,
            approverIds,
          },
        });

        const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
        if (toEmails.length) {
          const baseUrl = getAppBaseUrl();
          const { html, text } = renderPeopleCoreEmail({
            preheader: "Approval needed: Personal Information",
            title: "Approval requested: Personal Information",
            ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
            sections: [ { title: "Summary", description: [ `Fields changed: ${diffs.length}` ] } ],
            outro: ["PeopleCore HRIS System"],
          });
          await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Personal Information", html, text });
        }
      }
    }

    let updated: any = null;
    if (isAdmin) {
      updated = await prisma.user.update({
        where: { id: before.id },
        data: updates,
      });
    }

    if (isAdmin) {
      return NextResponse.json({ ok: true, user: updated });
    } else {
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (e: any) {
    console.error("[personal-info-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
