import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
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
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      name: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    const contact = await prisma.emergencyContact.create({
      data: { employeeId: employee.id, ...body },
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
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      id: string;
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    const updated = await prisma.emergencyContact.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.relationship !== undefined
          ? { relationship: body.relationship }
          : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
      },
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
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as { id: string };
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


