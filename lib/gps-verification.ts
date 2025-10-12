export interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy?: number; // in meters
}

export interface Geofence {
  lat: number;
  lng: number;
  radius: number; // in meters
  name: string;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
export function calculateDistance(point1: GPSCoordinates, point2: GPSCoordinates): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = toRadians(point1.lat);
  const φ2 = toRadians(point2.lat);
  const Δφ = toRadians(point2.lat - point1.lat);
  const Δλ = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Check if a location is within a geofence
 */
export function isWithinGeofence(location: GPSCoordinates, geofence: Geofence): boolean {
  const distance = calculateDistance(location, geofence);
  return distance <= geofence.radius;
}

/**
 * Find the nearest geofence to a location
 */
export function findNearestGeofence(
  location: GPSCoordinates,
  geofences: Geofence[]
): { geofence: Geofence; distance: number } | null {
  if (geofences.length === 0) return null;

  let nearest = geofences[0];
  let minDistance = calculateDistance(location, nearest);

  for (let i = 1; i < geofences.length; i++) {
    const distance = calculateDistance(location, geofences[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = geofences[i];
    }
  }

  return { geofence: nearest, distance: minDistance };
}

/**
 * Validate GPS coordinates
 */
export function isValidGPSCoordinates(location: GPSCoordinates): boolean {
  const { lat, lng } = location;

  // Check latitude range (-90 to 90)
  if (lat < -90 || lat > 90) return false;

  // Check longitude range (-180 to 180)
  if (lng < -180 || lng > 180) return false;

  // Check for obviously invalid values (0,0) unless actually at null island
  if (lat === 0 && lng === 0) return false;

  return true;
}

/**
 * Check GPS accuracy is acceptable
 */
export function isAccuracyAcceptable(
  location: GPSCoordinates,
  maxAccuracyMeters: number = 100
): boolean {
  if (!location.accuracy) return true; // No accuracy data, assume OK
  return location.accuracy <= maxAccuracyMeters;
}

/**
 * Verify clock location against geofences
 */
export function verifyClockLocation(
  location: GPSCoordinates,
  geofences: Geofence[],
  options: {
    requireGeofence: boolean;
    maxAccuracyMeters?: number;
  }
): {
  isValid: boolean;
  withinGeofence: boolean;
  nearestGeofence?: { name: string; distance: number };
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate coordinates
  if (!isValidGPSCoordinates(location)) {
    errors.push('Invalid GPS coordinates');
    return {
      isValid: false,
      withinGeofence: false,
      errors,
      warnings,
    };
  }

  // Check accuracy
  const maxAccuracy = options.maxAccuracyMeters || 100;
  if (!isAccuracyAcceptable(location, maxAccuracy)) {
    warnings.push(`GPS accuracy (${location.accuracy}m) exceeds threshold (${maxAccuracy}m)`);
  }

  // Check geofences
  if (geofences.length > 0) {
    let withinAnyGeofence = false;

    for (const geofence of geofences) {
      if (isWithinGeofence(location, geofence)) {
        withinAnyGeofence = true;
        break;
      }
    }

    const nearest = findNearestGeofence(location, geofences);

    if (!withinAnyGeofence && options.requireGeofence) {
      errors.push(
        `Location is outside all approved geofences. Nearest is ${nearest?.geofence.name} (${Math.round(nearest?.distance || 0)}m away)`
      );
    } else if (!withinAnyGeofence) {
      warnings.push(
        `Location is outside approved geofences. Nearest is ${nearest?.geofence.name} (${Math.round(nearest?.distance || 0)}m away)`
      );
    }

    return {
      isValid: errors.length === 0,
      withinGeofence: withinAnyGeofence,
      nearestGeofence: nearest
        ? { name: nearest.geofence.name, distance: nearest.distance }
        : undefined,
      errors,
      warnings,
    };
  }

  // No geofences configured
  return {
    isValid: true,
    withinGeofence: false,
    errors,
    warnings,
  };
}

/**
 * Calculate center point of multiple coordinates (for geofence suggestion)
 */
export function calculateCenterPoint(locations: GPSCoordinates[]): GPSCoordinates {
  if (locations.length === 0) {
    throw new Error('Cannot calculate center of empty locations array');
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const location of locations) {
    const lat = toRadians(location.lat);
    const lng = toRadians(location.lng);

    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }

  const total = locations.length;
  x = x / total;
  y = y / total;
  z = z / total;

  const centralLng = Math.atan2(y, x);
  const centralSqrt = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSqrt);

  return {
    lat: (centralLat * 180) / Math.PI,
    lng: (centralLng * 180) / Math.PI,
  };
}

/**
 * Suggest geofence radius based on historical clock locations
 */
export function suggestGeofenceRadius(
  centerPoint: GPSCoordinates,
  historicalLocations: GPSCoordinates[],
  coverage: number = 0.95 // Cover 95% of historical locations
): number {
  const distances = historicalLocations
    .map((loc) => calculateDistance(centerPoint, loc))
    .sort((a, b) => a - b);

  const index = Math.floor(distances.length * coverage);
  const suggestedRadius = distances[index] || 100;

  // Round up to nearest 10 meters and add 20m buffer
  return Math.ceil(suggestedRadius / 10) * 10 + 20;
}
