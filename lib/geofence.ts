/**
 * Geofence Helper Library
 * Utilities for location-based time tracking validation
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate if coordinates are within valid ranges
 */
export function validateCoordinates(lat: number, lng: number): {
  valid: boolean;
  error?: string;
} {
  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: "Latitude must be between -90 and 90 degrees",
    };
  }

  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: "Longitude must be between -180 and 180 degrees",
    };
  }

  return { valid: true };
}

/**
 * Check if user coordinates are within a geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
  return distance <= radiusMeters;
}

/**
 * Find the nearest location from a list of locations
 */
export function getNearestLocation(
  userLat: number,
  userLon: number,
  locations: Array<{
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    geofenceRadius: number | null;
  }>
): {
  location: any;
  distance: number;
} | null {
  let nearest: { location: any; distance: number } | null = null;

  for (const location of locations) {
    if (location.latitude === null || location.longitude === null) {
      continue;
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      location.latitude,
      location.longitude
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { location, distance };
    }
  }

  return nearest;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Get user's current location (browser geolocation API)
 */
export function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
