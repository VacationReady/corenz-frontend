import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateCoordinates } from "@/lib/geofence";

const locationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadius: z.number().int().min(50).max(5000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/locations/[id]
 * Get a single location
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

/**
 * PUT /api/locations/[id]
 * Update a location
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = locationUpdateSchema.parse(body);

    // Fetch existing location
    const existing = await prisma.location.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (existing.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
      const coordValidation = validateCoordinates(data.latitude, data.longitude);
      if (!coordValidation.valid) {
        return NextResponse.json({ error: coordValidation.error }, { status: 400 });
      }
    }

    // Check for duplicate name
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.location.findFirst({
        where: {
          companyId: session.user.companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A location with this name already exists" },
          { status: 400 }
        );
      }
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        name: data.name,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error updating location:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid location data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

/**
 * DELETE /api/locations/[id]
 * Delete a location
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
