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
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        address: true,
        city: true,
        country: true,
      },
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
    const { name, description, address, city, country } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Location name is required." },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for duplicate within the same company
    const existing = await prisma.location.findFirst({
      where: {
        companyId: session.user.companyId,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A location with this name already exists." },
        { status: 400 },
      );
    }

    const location = await prisma.location.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        country: country?.trim() || null,
        companyId: session.user.companyId,
        active: true,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}