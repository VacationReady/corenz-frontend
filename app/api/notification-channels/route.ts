import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json([], { status: 200 });
  }

  const channels = await prisma.notificationChannel.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(channels);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, name, config, isActive = true, fallbackToEmail = true } = body || {};

  if (!type || !name) {
    return NextResponse.json({ error: "type and name are required" }, { status: 400 });
  }

  try {
    const created = await prisma.notificationChannel.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        type,
        name,
        config: config ?? {},
        isActive,
        fallbackToEmail,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (String(error?.code) === "P2002") {
      return NextResponse.json({ error: "A channel with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}


