import { prisma } from "@/lib/prisma";

/**
 * Sync active locations with geofence data to TimeTrackingSettings.geofenceLocations
 * This ensures clock-in/out validation uses the latest location data
 */
export async function syncGeofenceLocations(companyId: string): Promise<void> {
  try {
    // Fetch all active locations with geofence data
    // @ts-ignore - Fields exist in schema but client not generated yet
    const locations = await prisma.location.findMany({
      where: {
        companyId,
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        geofenceRadius: true,
      },
    });

    // Get default geofence radius from settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId },
      select: { geofenceRadius: true },
    });

    const defaultRadius = settings?.geofenceRadius || 100;

    // Transform to geofence format: [{lat, lng, radius, name, id}]
    const geofenceLocations = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      lat: loc.latitude!,
      lng: loc.longitude!,
      radius: loc.geofenceRadius || defaultRadius,
    }));

    // Update TimeTrackingSettings with synced geofences
    const locationsJson = geofenceLocations.length > 0 ? (geofenceLocations as any) : null;
    
    await prisma.timeTrackingSettings.upsert({
      where: { companyId },
      update: {
        geofenceLocations: locationsJson,
      },
      create: {
        companyId,
        geofenceLocations: locationsJson,
      },
    });
  } catch (error) {
    console.error("Error syncing geofence locations:", error);
    // Don't throw - this is a background sync operation
  }
}

