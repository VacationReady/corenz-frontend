import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";
import {
  formatBankAccountNumber,
  isValidIrdNumber,
  isValidNzBankAccountNumber,
  normalizeBankAccountNumber,
  normalizeIrdNumber,
} from "@/lib/utils";
import { TaxCode } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = session.user.role === "ADMIN";

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, ...updateFields } = body;
    
    const allowed = [
      "bankAccountNumber",
      "irdNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateFields, key)) {
        updates[key] = updateFields[key as string];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "bankAccountNumber")) {
      const raw = updates.bankAccountNumber;
      if (raw === null || raw === undefined) {
        updates.bankAccountNumber = null;
      } else if (typeof raw === "string") {
        const normalized = normalizeBankAccountNumber(raw);
        if (!normalized) {
          updates.bankAccountNumber = null;
        } else if (!isValidNzBankAccountNumber(normalized)) {
          return NextResponse.json(
            { error: "Invalid bank account number" },
            { status: 400 },
          );
        } else {
          updates.bankAccountNumber = formatBankAccountNumber(normalized);
        }
      } else {
        return NextResponse.json(
          { error: "Invalid bank account number" },
          { status: 400 },
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "irdNumber")) {
      const raw = updates.irdNumber;
      if (raw === null || raw === undefined) {
        updates.irdNumber = null;
      } else if (typeof raw === "string") {
        const normalized = normalizeIrdNumber(raw);
        if (!normalized) {
          updates.irdNumber = null;
        } else if (!isValidIrdNumber(normalized)) {
          return NextResponse.json(
            { error: "Invalid IRD number" },
            { status: 400 },
          );
        } else {
          updates.irdNumber = normalized;
        }
      } else {
        return NextResponse.json(
          { error: "Invalid IRD number" },
          { status: 400 },
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "taxCode")) {
      const value = updates.taxCode;
      if (value === null || value === undefined || value === "") {
        updates.taxCode = null;
      } else if (typeof value === "string") {
        if (!Object.values(TaxCode).includes(value as TaxCode)) {
          return NextResponse.json(
            { error: "Invalid tax code" },
            { status: 400 },
          );
        }
        updates.taxCode = value as TaxCode;
      } else {
        return NextResponse.json(
          { error: "Invalid tax code" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Compute diffs before update
    const diffs = computeDiffs(employee, { ...employee, ...updates }, allowed);
    
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
            section: "bank-payroll",
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
          section: "bank-payroll",
          changedById: session.user.id,
        });
        const approverIds = recipients.map((r) => r.id);
        await (prisma as any).transactionalChangeRequest.create({
          data: {
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "bank-payroll",
            action: "UPDATE",
            targetId: employee.id,
            payload: updates,
            oldValues: {
              bankAccountNumber: employee.bankAccountNumber,
              irdNumber: employee.irdNumber,
              taxCode: employee.taxCode,
              kiwiSaverEnrolled: employee.kiwiSaverEnrolled,
              kiwiSaverContribution: employee.kiwiSaverContribution,
            },
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
            preheader: "Approval needed: Bank & Payroll",
            title: "Approval requested: Bank & Payroll",
            ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
            sections: [ { title: "Summary", description: [ `Fields changed: ${diffs.length}` ] } ],
            outro: ["PeopleCore HRIS System"],
          });
          await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Bank & Payroll", html, text });
        }
      }
    }

    let updated: any = null;
    if (isAdmin) {
      updated = await prisma.employee.update({
        where: { id: employee.id },
        data: updates,
      });
    }

    if (isAdmin) {
      return NextResponse.json({ ok: true, employee: updated });
    } else {
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (e: any) {
    console.error("[bank-payroll-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      bankAccountNumber: employee.bankAccountNumber,
      irdNumber: employee.irdNumber,
      taxCode: employee.taxCode,
      kiwiSaverEnrolled: employee.kiwiSaverEnrolled,
      kiwiSaverContribution: employee.kiwiSaverContribution,
    });
  } catch (e: any) {
    console.error("[bank-payroll-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


