import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculateDistance, isWithinGeofence } from "@/lib/geofence";

const validateSchema = z.object({
  locationId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * POST /api/locations/validate-geofence
 * Validate if coordinates are within a location's geofence
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = validateSchema.parse(body);

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    // Fetch location with geofence data
    const location = await prisma.location.findUnique({
      where: {
        id: data.locationId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        geofenceRadius: true,
        companyId: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Validate company scoping
    if (location.companyId !== employee.companyId) {
      return NextResponse.json({ error: "Unauthorized access to location" }, { status: 403 });
    }

    // Check if location has coordinates
    if (location.latitude === null || location.longitude === null) {
      return NextResponse.json(
        {
          error: "Location does not have coordinates configured",
        },
        { status: 400 }
      );
    }

    // Get geofence radius (use location-specific or default)
    const geofenceRadius = location.geofenceRadius || 100;

    // Calculate distance
    const distance = calculateDistance(
      data.latitude,
      data.longitude,
      location.latitude,
      location.longitude
    );

    // Check if within geofence
    const isWithin = isWithinGeofence(
      data.latitude,
      data.longitude,
      location.latitude,
      location.longitude,
      geofenceRadius
    );

    return NextResponse.json({
      isWithinGeofence: isWithin,
      distance: parseFloat(distance.toFixed(2)),
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
      },
      geofenceRadius,
    });
  } catch (error) {
    console.error("Geofence validation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid validation data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate geofence" },
      { status: 500 }
    );
  }
}
