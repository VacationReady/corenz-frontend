import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { Employee, User, TransactionalNotificationPreference } from "@prisma/client";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";

// Base transactional sections configuration
export const BASE_TRANSACTIONAL_SECTIONS = [
  {
    id: "personal-info",
    label: "Personal Information",
    description: "Basic employee details and contact information",
    route: "personal-info",
    group: "Core Profile"
  },
  {
    id: "bank-payroll",
    label: "Bank & Payroll",
    description: "Banking details, tax codes, and KiwiSaver information",
    route: "bank-payroll",
    group: "Core Profile"
  },
  {
    id: "employment-details",
    label: "Employment Details",
    description: "Job role, department, manager, and working patterns",
    route: "employment-details",
    group: "Core Profile"
  },
  {
    id: "emergency-contacts",
    label: "Emergency Contacts",
    description: "Emergency contact details",
    route: "emergency-contacts",
    group: "Core Profile"
  },
  {
    id: "driver-licenses",
    label: "Driver Licenses",
    description: "Driver license information",
    route: "driver-licenses",
    group: "Compliance"
  },
  {
    id: "employment-checks",
    label: "Employment Checks",
    description: "Background checks and verification",
    route: "employment-checks",
    group: "Compliance"
  },
  {
    id: "training",
    label: "Training Records",
    description: "Training and certification records",
    route: "training",
    group: "Compliance"
  },
  {
    id: "forms",
    label: "Forms (Default)",
    description: "Default settings for all form submissions",
    route: "forms",
    group: "Forms"
  }
];

export interface SectionConfig {
  id: string;
  label: string;
  description: string;
  route: string;
  group: string;
}

export interface AuditDiff {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

// Resolve the notification preference for a given section
export async function resolveTransactionalPreference(
  companyId: string,
  section: string
): Promise<TransactionalNotificationPreference | null> {
  // First look for an exact match
  let preference = await prisma.transactionalNotificationPreference.findUnique({
    where: {
      companyId_section: {
        companyId,
        section
      }
    }
  });

  // If no exact match and section contains a colon, try the base section
  if (!preference && section.includes(':')) {
    const baseSection = section.split(':')[0];
    preference = await prisma.transactionalNotificationPreference.findUnique({
      where: {
        companyId_section: {
          companyId,
          section: baseSection
        }
      }
    });
  }

  return preference;
}

// Build the transactional email content
export function buildTransactionalEmail({
  employee,
  actor,
  sectionConfig,
  diffs,
  reasons
}: {
  employee: Employee & { User: User | null };
  actor: User;
  sectionConfig: SectionConfig;
  diffs: AuditDiff[];
  reasons: Record<string, string>;
}): { html: string; text: string } {
  const employeeName = employee.User ? `${employee.User.firstName || ''} ${employee.User.lastName || ''}`.trim() || employee.User.email : 'Employee';
  const actorName = actor.name || actor.email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://peoplecore.vercel.app';
  const sectionUrl = `${appUrl}/employees/${employee.id}/${sectionConfig.route}`;
  const currentDate = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build HTML table of changes
  let changesHtml = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">';
  changesHtml += '<thead><tr style="background-color: #f3f4f6;">';
  changesHtml += '<th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Field</th>';
  changesHtml += '<th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Previous Value</th>';
  changesHtml += '<th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">New Value</th>';
  changesHtml += '<th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Reason</th>';
  changesHtml += '</tr></thead><tbody>';

  let textChanges = '';
  let changeCount = 0;

  for (const diff of diffs) {
    const fieldLabel = labelForField(diff.field);
    const oldValue = formatAuditValue(diff.oldValue);
    const newValue = formatAuditValue(diff.newValue);
    const reason = reasons[diff.field] || '(No reason provided)';
    changeCount++;

    // Handle special synthetic fields
    if (diff.field === '__create__') {
      changesHtml += `<tr><td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ecfdf5;">
        <div style="display: flex; align-items: center;">
          <span style="color: #10b981; font-size: 20px; margin-right: 8px;">+</span>
          <div>
            <strong style="color: #065f46;">New ${sectionConfig.label} record created</strong><br/>
            <span style="color: #047857; font-size: 13px;">Reason: ${reason}</span>
          </div>
        </div>
      </td></tr>`;
      textChanges += `• [CREATED] New ${sectionConfig.label} record\n  Reason: ${reason}\n\n`;
    } else if (diff.field === '__delete__') {
      changesHtml += `<tr><td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; background-color: #fef2f2;">
        <div style="display: flex; align-items: center;">
          <span style="color: #ef4444; font-size: 20px; margin-right: 8px;">−</span>
          <div>
            <strong style="color: #991b1b;">${sectionConfig.label} record deleted</strong><br/>
            <span style="color: #b91c1c; font-size: 13px;">Reason: ${reason}</span>
          </div>
        </div>
      </td></tr>`;
      textChanges += `• [DELETED] ${sectionConfig.label} record removed\n  Reason: ${reason}\n\n`;
    } else {
      const isCleared = newValue === '(empty)';
      const rowStyle = isCleared ? 'background-color: #fefce8;' : '';
      
      changesHtml += `<tr style="${rowStyle}">`;
      changesHtml += `<td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 500;">${fieldLabel}</td>`;
      changesHtml += `<td style="padding: 12px; border: 1px solid #e5e7eb; color: #6b7280;">${oldValue}</td>`;
      changesHtml += `<td style="padding: 12px; border: 1px solid #e5e7eb; ${isCleared ? 'color: #a16207;' : 'color: #059669; font-weight: 500;'}">${newValue}</td>`;
      changesHtml += `<td style="padding: 12px; border: 1px solid #e5e7eb; color: #4b5563; font-size: 13px;">${reason}</td>`;
      changesHtml += '</tr>';
      
      textChanges += `• ${fieldLabel}\n`;
      textChanges += `  From: ${oldValue}\n`;
      textChanges += `  To: ${newValue}\n`;
      textChanges += `  Reason: ${reason}\n\n`;
    }
  }

  changesHtml += '</tbody></table>';

  const summaryDescription = [
    `Employee: ${employeeName}`,
    `Updated by: ${actorName}`,
    `Changes: ${changeCount}`,
    `Date: ${currentDate}`,
  ];

  const { html, text } = renderPeopleCoreEmail({
    preheader: `${actorName} updated ${employeeName}'s ${sectionConfig.label}`,
    title: "Employee Record Updated",
    intro: [
      `${actorName} has updated ${employeeName}'s ${sectionConfig.label}.`,
    ],
    sections: [
      {
        title: "Summary",
        description: summaryDescription,
      },
      {
        title: "Detailed Changes",
        html: changesHtml,
        text: textChanges.trim() ? textChanges.trim() : undefined,
      },
    ],
    ctas: {
      label: "View Employee Record",
      href: sectionUrl,
    },
    outro: [
      "This is an automated notification from PeopleCore HR System.",
      "Please do not reply to this email. For assistance, contact your HR administrator.",
    ],
  });

  return { html, text };
}

// Dispatch transactional notifications for audit changes
export async function dispatchTransactionalNotifications({
  companyId,
  employeeId,
  section,
  diffs,
  reasons,
  changedById
}: {
  companyId: string;
  employeeId: string;
  section: string;
  diffs: AuditDiff[];
  reasons: Record<string, string>;
  changedById: string;
}) {
  try {
    // Resolve the preference (with fallback to base section)
    const preference = await resolveTransactionalPreference(companyId, section);

    // Find the section config
    let sectionConfig = BASE_TRANSACTIONAL_SECTIONS.find(s => s.id === section);
    
    // For form-specific sections, use the forms base config
    if (!sectionConfig && section.startsWith('forms:')) {
      sectionConfig = BASE_TRANSACTIONAL_SECTIONS.find(s => s.id === 'forms');
      if (sectionConfig) {
        // Customize for specific form
        const formId = section.split(':')[1];
        sectionConfig = {
          ...sectionConfig,
          id: section,
          label: `Form Submission`,
          route: `forms/${formId}`
        };
      }
    }

    if (!sectionConfig) {
      console.warn(`No section config found for ${section}`);
      return;
    }

    // Fetch required data in parallel
    const [employee, actor] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          User: true,
          Department: true
        }
      }),
      prisma.user.findUnique({
        where: { id: changedById }
      })
    ]);

    if (!employee || !actor) {
      console.error('Could not find employee or actor for notifications');
      return;
    }

    // Helper: resolve recipients from advanced config if available, otherwise fallback to boolean flags
    async function resolveRecipientUsers(): Promise<{ id: string; email: string | null }[]> {
      const users: { id: string; email: string | null }[] = [];
      const seen = new Set<string>();

      const advanced = preference?.recipientsJson as any[] | undefined;
      const fallback = preference?.fallbackRecipientsJson as any[] | undefined;

      async function addByRole(role: "ADMIN" | "MANAGER" | "EMPLOYEE") {
        if (role === "ADMIN") {
          const admins = await prisma.user.findMany({ where: { companyId, role: "ADMIN" } });
          for (const u of admins) if (!seen.has(u.id)) { seen.add(u.id); users.push({ id: u.id, email: u.email }); }
        } else if (role === "MANAGER") {
          if (employee.User?.managerId) {
            const m = await prisma.user.findUnique({ where: { id: employee.User.managerId } });
            if (m && !seen.has(m.id)) { seen.add(m.id); users.push({ id: m.id, email: m.email }); }
          }
        } else if (role === "EMPLOYEE") {
          if (employee.User && !seen.has(employee.User.id)) { seen.add(employee.User.id); users.push({ id: employee.User.id, email: employee.User.email }); }
        }
      }

      async function addByDepartment(deptId?: string, jobRoleId?: string | null, employeeIds?: string[], includeJobRole?: boolean) {
        // Always include specific employees (mandatory in UI)
        if (Array.isArray(employeeIds) && employeeIds.length) {
          const list = await prisma.user.findMany({ where: { id: { in: employeeIds }, companyId } });
          for (const u of list) if (!seen.has(u.id)) { seen.add(u.id); users.push({ id: u.id, email: u.email }); }
        }
        if (includeJobRole && jobRoleId) {
          const list = await prisma.user.findMany({ where: { companyId, jobRoleId, ...(deptId ? { departmentId: deptId } : {}) } });
          for (const u of list) if (!seen.has(u.id)) { seen.add(u.id); users.push({ id: u.id, email: u.email }); }
        }
      }

      if (advanced && advanced.length) {
        for (const r of advanced) {
          if (r.type === "ADMIN" || r.type === "MANAGER" || r.type === "EMPLOYEE") {
            await addByRole(r.type);
          } else if (r.type === "DEPARTMENT") {
            await addByDepartment(r.departmentId, r.jobRoleId ?? null, r.employeeIds ?? [], r.includeJobRoleWithSpecificEmployees ?? true);
          }
        }
        if (users.length === 0 && Array.isArray(fallback)) {
          for (const r of fallback) {
            if (r.type === "ADMIN" || r.type === "MANAGER" || r.type === "EMPLOYEE") {
              await addByRole(r.type);
            } else if (r.type === "DEPARTMENT") {
              await addByDepartment(r.departmentId, r.jobRoleId ?? null, r.employeeIds ?? [], r.includeJobRoleWithSpecificEmployees ?? true);
            }
          }
        }
      } else {
        // legacy booleans
        const notifyAdmin = preference?.notifyAdmin ?? true;
        const notifyManager = preference?.notifyManager ?? false;
        const notifyEmployee = preference?.notifyEmployee ?? false;
        if (notifyAdmin) await addByRole("ADMIN");
        if (notifyManager) await addByRole("MANAGER");
        if (notifyEmployee) await addByRole("EMPLOYEE");
      }

      // Remove actor
      if (actor?.id) {
        const idx = users.findIndex((u) => u.id === actor.id);
        if (idx >= 0) users.splice(idx, 1);
      }
      return users;
    }

    const recipientUsers = await resolveRecipientUsers();
    if (!recipientUsers.length) return;

    // Create approval task targeting recipient users
    const employeeName = employee.User ? `${employee.User.firstName || ''} ${employee.User.lastName || ''}`.trim() || employee.User.email : 'Employee';
    const diffSummary = { count: diffs.length, fields: diffs.map(d => d.field) };

    const approval = await prisma.transactionalApproval.create({
      data: {
        companyId,
        section,
        employeeId,
        requesterId: changedById,
        approverIds: recipientUsers.map(u => u.id),
        title: `${sectionConfig.label} change for ${employeeName}`,
        subtitle: `${diffs.length} field${diffs.length === 1 ? '' : 's'} changed`,
        diffSummary,
      },
    });

    // Send approval email to approvers with CTA to Approvals
    const baseUrl = getAppBaseUrl();
    const { html, text } = renderPeopleCoreEmail({
      preheader: `Approval needed: ${sectionConfig.label} change for ${employeeName}`,
      title: `Approval requested: ${sectionConfig.label}`,
      intro: [
        `${actor.name || actor.email} submitted changes to ${employeeName}'s ${sectionConfig.label}.`,
        `Please review and approve in Quick Actions.`,
      ],
      sections: [
        { title: "Summary", description: [
          `Employee: ${employeeName}`,
          `Changes: ${diffs.length}`,
        ] },
      ],
      ctas: { label: "Open Approvals", href: `${baseUrl}/dashboard/approvals` },
      outro: ["PeopleCore HRIS System"],
    });

    const toEmails = recipientUsers.map(u => u.email).filter(Boolean) as string[];
    if (toEmails.length) {
      await resend.emails.send({ from: FROM_EMAIL, to: toEmails, subject: `Approval needed: ${sectionConfig.label} - ${employeeName}`, html, text });
      await prisma.transactionalNotificationLog.create({
        data: {
          companyId,
          approvalId: approval.id,
          section,
          employeeId,
          recipients: toEmails,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }
  } catch (error) {
    // Log but don't throw - we don't want notification failures to break audit logging
    console.error('Failed to send transactional notifications:', error);
  }
}
