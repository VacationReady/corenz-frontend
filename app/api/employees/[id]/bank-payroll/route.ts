import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";
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
import {
  validateKiwiSaverEmployeeRate,
  validateKiwiSaverEmployerRate,
  validateStudentLoanRate,
  validateSpecialTaxRate,
} from "@/lib/payroll/nz-payroll-validation";

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
    const role = session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isEmployeeViewingOwnRecord =
      role === "EMPLOYEE" && employee.userId === session.user.id;

    // Only admins/SUPER_ADMIN or the employee themselves can submit changes.
    // Managers are fully blocked from Bank & Payroll updates.
    if (!isAdmin && !isEmployeeViewingOwnRecord) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Payroll details restricted to admins or the employee themselves",
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, ...updateFields } = body;
    
    const allowed = [
      "bankAccountNumber",
      "irdNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
      "kiwiSaverEmployeeRate",
      "kiwiSaverEmployerRate",
      "hasStudentLoan",
      "studentLoanRate",
      "specialTaxRate",
      "taxExemptionReason",
    ] as const;

    const updates: Record<string, any> = {};
    const canEditAllFields = isAdmin;
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(updateFields, key)) continue;

      // Non-admins (employees editing their own record) can only update bankAccountNumber
      if (!canEditAllFields && key !== "bankAccountNumber") {
        continue;
      }

      updates[key] = updateFields[key as string];
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

    // Validate KiwiSaver employee rate
    if (Object.prototype.hasOwnProperty.call(updates, "kiwiSaverEmployeeRate")) {
      const isEnrolled = Object.prototype.hasOwnProperty.call(updates, "kiwiSaverEnrolled")
        ? updates.kiwiSaverEnrolled
        : employee.kiwiSaverEnrolled;
      const validation = validateKiwiSaverEmployeeRate(updates.kiwiSaverEmployeeRate, isEnrolled ?? false);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Validate KiwiSaver employer rate
    if (Object.prototype.hasOwnProperty.call(updates, "kiwiSaverEmployerRate")) {
      const isEnrolled = Object.prototype.hasOwnProperty.call(updates, "kiwiSaverEnrolled")
        ? updates.kiwiSaverEnrolled
        : employee.kiwiSaverEnrolled;
      const validation = validateKiwiSaverEmployerRate(updates.kiwiSaverEmployerRate, isEnrolled ?? false);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Validate student loan rate
    if (Object.prototype.hasOwnProperty.call(updates, "studentLoanRate")) {
      const hasLoan = Object.prototype.hasOwnProperty.call(updates, "hasStudentLoan")
        ? updates.hasStudentLoan
        : employee.hasStudentLoan;
      const validation = validateStudentLoanRate(updates.studentLoanRate, hasLoan);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      // Apply default rate if needed
      if (validation.defaultRate !== undefined) {
        updates.studentLoanRate = validation.defaultRate;
      }
    }

    // Validate special tax rate
    if (Object.prototype.hasOwnProperty.call(updates, "specialTaxRate")) {
      const reason = Object.prototype.hasOwnProperty.call(updates, "taxExemptionReason")
        ? updates.taxExemptionReason
        : employee.taxExemptionReason;
      const validation = validateSpecialTaxRate(updates.specialTaxRate, reason);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
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
              kiwiSaverEmployeeRate: employee.kiwiSaverEmployeeRate,
              kiwiSaverEmployerRate: employee.kiwiSaverEmployerRate,
              hasStudentLoan: employee.hasStudentLoan,
              studentLoanRate: employee.studentLoanRate,
              specialTaxRate: employee.specialTaxRate,
              taxExemptionReason: employee.taxExemptionReason,
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
          const employeeName = employee.User
            ? `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim() || employee.User.email
            : "Employee";
          const { html, text } = renderPeopleCoreEmail({
            preheader: "Approval needed: Bank & Payroll",
            title: "Approval requested: Bank & Payroll",
            ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
            sections: [
              {
                title: "Summary",
                description: [
                  `Employee Name: ${employeeName}`,
                  `Fields changed: ${diffs.length}`,
                ],
              },
            ],
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
    const role = session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const isEmployeeViewingOwnRecord =
      role === "EMPLOYEE" && employee.userId === session.user.id;

    // Managers are fully blocked from Bank & Payroll, even for their own record.
    if (!isAdmin && !isEmployeeViewingOwnRecord) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Payroll details restricted to admins or the employee themselves",
        },
        { status: 403 },
      );
    }

    const canView = await canAccessEmployee(
      {
        id: session.user.id,
        role: role as any,
        companyId: session.user.companyId,
      },
      id,
    );
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      bankAccountNumber: employee.bankAccountNumber,
      irdNumber: employee.irdNumber,
      taxCode: employee.taxCode,
      kiwiSaverEnrolled: employee.kiwiSaverEnrolled,
      kiwiSaverContribution: employee.kiwiSaverContribution,
      kiwiSaverEmployeeRate: employee.kiwiSaverEmployeeRate,
      kiwiSaverEmployerRate: employee.kiwiSaverEmployerRate,
      hasStudentLoan: employee.hasStudentLoan,
      studentLoanRate: employee.studentLoanRate,
      specialTaxRate: employee.specialTaxRate,
      taxExemptionReason: employee.taxExemptionReason,
    });
  } catch (e: any) {
    console.error("[bank-payroll-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


