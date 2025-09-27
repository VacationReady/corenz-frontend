import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: {
        OR: [
          { companyId: session.user.companyId },
          { companyId: null },
          // Some older data may have undefined companyId; include all records
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = (await req.json()) as { name?: string };
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    // Use company-scoped records; name might be globally unique in older schema
    const created = await prisma.location.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        companyId: session.user.companyId,
      },
      select: { id: true, name: true },
    });
    return NextResponse.json(created);
  } catch (error: any) {
    const message = String(error?.message || "Failed to create location");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = (await req.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Only allow deletion for company-owned records
    const loc = await prisma.location.findUnique({ where: { id } });
    if (!loc || (loc.companyId && loc.companyId !== session.user.companyId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 },
    );
  }
}
