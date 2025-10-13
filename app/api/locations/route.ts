import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { validateCoordinates } from "@/lib/geofence";

const locationCreateSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadius: z.number().int().min(50).max(5000).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: {
        companyId: session.user.companyId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
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
    const body = await req.json();
    const data = locationCreateSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
      const coordValidation = validateCoordinates(data.latitude, data.longitude);
      if (!coordValidation.valid) {
        return NextResponse.json({ error: coordValidation.error }, { status: 400 });
      }
    }

    // Check for duplicate within the same company
    const existing = await prisma.location.findFirst({
      where: {
        companyId: session.user.companyId,
        name: data.name.trim(),
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
        name: data.name.trim(),
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid location data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}