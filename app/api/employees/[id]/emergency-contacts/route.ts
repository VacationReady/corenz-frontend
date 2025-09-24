import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason } from "@/lib/audit-helpers";

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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const contact = await prisma.emergencyContact.create({
      data: { id: crypto.randomUUID(), employeeId: employee.id, ...contactData },
    });

    // Create audit log for contact creation
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

    return NextResponse.json(contact, { status: 201 });
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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    }

    const updated = await prisma.emergencyContact.update({
      where: { id: body.id },
      data: updates,
    });
    
    return NextResponse.json(updated);
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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (e: any) {
    console.error("[emergency-contacts-delete]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


