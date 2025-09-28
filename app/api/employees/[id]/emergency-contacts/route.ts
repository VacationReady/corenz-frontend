import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

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

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { employeeId: employee.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(contacts);
  } catch (e: any) {
    console.error("[emergency-contacts-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      name: string;
      relationship?: string;
      phone?: string;
      email?: string;
      reason?: string;
    };
    
    const { reason, ...contactData } = body;
    
    if (!reason) {
      return NextResponse.json(
        { error: "Reason required for creating emergency contact" },
        { status: 400 }
      );
    }

    let contact: any = null;
    if (isAdmin) {
      contact = await prisma.emergencyContact.create({
        data: { id: crypto.randomUUID(), employeeId: employee.id, ...contactData },
      });
    }

    // Create audit log for contact creation
    if (isAdmin) {
      await createAuditLogs({
        companyId: session.user.companyId!,
        employeeId: employee.id,
        section: "emergency-contacts",
        diffs: [{
          field: "__create__",
          oldValue: null,
          newValue: JSON.stringify(contactData),
        }],
        reasons: { "__create__": reason },
        changedById: session.user.id,
      });
    } else {
      const diffs = [{ field: "__create__", oldValue: null, newValue: JSON.stringify(contactData) }];
      const recipients = await getTransactionalRecipients({
        companyId: session.user.companyId!,
        employeeId: employee.id,
        section: "emergency-contacts",
        changedById: session.user.id,
      });
      const approverIds = recipients.map((r) => r.id);
      await (prisma as any).transactionalChangeRequest.create({
        data: {
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "emergency-contacts",
          action: "CREATE",
          targetId: null,
          payload: contactData,
          oldValues: {},
          diffs,
          reasons: { "__create__": reason },
          requesterId: session.user.id,
          approverIds,
        },
      });

      const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
      if (toEmails.length) {
        const baseUrl = getAppBaseUrl();
        const { html, text } = renderPeopleCoreEmail({
          preheader: "Approval needed: Emergency Contacts",
          title: "Approval requested: Emergency Contacts",
          ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
          sections: [ { title: "Summary", description: [ `New contact: ${contactData.name}` ] } ],
          outro: ["PeopleCore HRIS System"],
        });
        await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Emergency Contacts", html, text });
      }
    }

    if (isAdmin) {
      return NextResponse.json(contact, { status: 201 });
    } else {
      return NextResponse.json({ success: true, pendingApproval: true }, { status: 201 });
    }
  } catch (e: any) {
    console.error("[emergency-contacts-post]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

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

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      id: string;
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
      reasons?: Record<string, string>;
    };

    const { reasons, ...updateFields } = body;

    // Get the existing contact
    const existingContact = await prisma.emergencyContact.findFirst({
      where: { id: body.id, employeeId: employee.id },
    });
    
    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const allowed = ["name", "relationship", "phone", "email"] as const;
    const updates: Record<string, any> = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateFields, key)) {
        updates[key] = (updateFields as any)[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Compute diffs
    const diffs = computeDiffs(existingContact, { ...existingContact, ...updates }, allowed);
    
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
            section: "emergency-contacts",
            diffs,
            reasons: reasons || {},
            changedById: session.user.id,
          });
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else {
        const recipients = await getTransactionalRecipients({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "emergency-contacts",
          changedById: session.user.id,
        });
        const approverIds = recipients.map((r) => r.id);
        await (prisma as any).transactionalChangeRequest.create({
          data: {
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "emergency-contacts",
            action: "UPDATE",
            targetId: existingContact.id,
            payload: updates,
            oldValues: allowed.reduce((acc: any, k) => { acc[k] = (existingContact as any)[k]; return acc; }, {}),
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
            preheader: "Approval needed: Emergency Contacts",
            title: "Approval requested: Emergency Contacts",
            ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
            sections: [ { title: "Summary", description: [ `Fields changed: ${diffs.length}` ] } ],
            outro: ["PeopleCore HRIS System"],
          });
          await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Emergency Contacts", html, text });
        }
      }
    }

    if (isAdmin) {
      const updated = await prisma.emergencyContact.update({
        where: { id: body.id },
        data: updates,
      });
      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (e: any) {
    console.error("[emergency-contacts-patch]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as { id: string; reason?: string };
    
    if (!body.reason) {
      return NextResponse.json(
        { error: "Reason required for deleting emergency contact" },
        { status: 400 }
      );
    }

    // Get the contact to be deleted for audit logging
    const contactToDelete = await prisma.emergencyContact.findFirst({
      where: { id: body.id, Employee: { id: employee.id, companyId: session.user.companyId } },
    });
    
    if (!contactToDelete) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (isAdmin) {
      // Create audit log before deletion
      await createAuditLogs({
        companyId: session.user.companyId!,
        employeeId: employee.id,
        section: "emergency-contacts",
        diffs: [{
          field: "__delete__",
          oldValue: JSON.stringify({
            name: contactToDelete.name,
            relationship: contactToDelete.relationship,
            phone: contactToDelete.phone,
            email: contactToDelete.email,
          }),
          newValue: null,
        }],
        reasons: { "__delete__": body.reason },
        changedById: session.user.id,
      });

      await prisma.emergencyContact.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    } else {
      const diffs = [{ field: "__delete__", oldValue: JSON.stringify({ name: contactToDelete.name, relationship: contactToDelete.relationship, phone: contactToDelete.phone, email: contactToDelete.email }), newValue: null }];
      const recipients = await getTransactionalRecipients({
        companyId: session.user.companyId!,
        employeeId: employee.id,
        section: "emergency-contacts",
        changedById: session.user.id,
      });
      const approverIds = recipients.map((r) => r.id);
      await (prisma as any).transactionalChangeRequest.create({
        data: {
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "emergency-contacts",
          action: "DELETE",
          targetId: contactToDelete.id,
          payload: {},
          oldValues: { name: contactToDelete.name, relationship: contactToDelete.relationship, phone: contactToDelete.phone, email: contactToDelete.email },
          diffs,
          reasons: { "__delete__": body.reason },
          requesterId: session.user.id,
          approverIds,
        },
      });

      const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
      if (toEmails.length) {
        const baseUrl = getAppBaseUrl();
        const { html, text } = renderPeopleCoreEmail({
          preheader: "Approval needed: Emergency Contacts",
          title: "Approval requested: Emergency Contacts",
          ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard/approvals` },
          sections: [ { title: "Summary", description: [ `Delete contact: ${contactToDelete.name}` ] } ],
          outro: ["PeopleCore HRIS System"],
        });
        await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Emergency Contacts", html, text });
      }

      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (e: any) {
    console.error("[emergency-contacts-delete]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


