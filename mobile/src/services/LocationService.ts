import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceValidationResult {
  isValid: boolean;
  distance?: number;
  nearestLocation?: string;
  error?: string;
}

/**
 * Request location permissions from the user
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission denied');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Get current GPS location
 */
export async function getCurrentLocation(): Promise<LocationCoordinates | null> {
  try {
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      throw new Error('Location services are disabled');
    }

    // Get current position with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}

/**
 * Get current location with retry logic
 */
export async function getCurrentLocationWithRetry(
  maxRetries: number = 3,
  timeoutMs: number = 10000
): Promise<LocationCoordinates | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const location = await Promise.race([
        getCurrentLocation(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), timeoutMs)
        ),
      ]);

      if (location) {
        return location;
      }
    } catch (error) {
      console.warn(`Location attempt ${attempt} failed:`, error);
      lastError = error as Error;

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to get location after retries');
}

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate if current location is within a geofence
 */
export async function validateGeofence(
  currentLocation: LocationCoordinates,
  geofences: Array<{
    lat: number;
    lng: number;
    radius: number;
    name: string;
  }>
): Promise<GeofenceValidationResult> {
  if (geofences.length === 0) {
    return {
      isValid: true,
    };
  }

  let nearestDistance = Infinity;
  let nearestLocation = '';

  for (const geofence of geofences) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      geofence.lat,
      geofence.lng
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestLocation = geofence.name;
    }

    // Check if within radius
    if (distance <= geofence.radius) {
      return {
        isValid: true,
        distance,
        nearestLocation: geofence.name,
      };
    }
  }

  return {
    isValid: false,
    distance: nearestDistance,
    nearestLocation,
    error: `You are ${Math.round(nearestDistance)}m away from ${nearestLocation}`,
  };
}

/**
 * Find the nearest location to current coordinates
 */
export function getNearestLocation(
  currentLocation: LocationCoordinates,
  locations: Array<{
    lat: number;
    lng: number;
    name: string;
  }>
): { name: string; distance: number } | null {
  if (locations.length === 0) {
    return null;
  }

  let nearest = null;
  let nearestDistance = Infinity;

  for (const location of locations) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      location.lat,
      location.lng
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = {
        name: location.name,
        distance,
      };
    }
  }

  return nearest;
}

/**
 * Watch location changes (for background tracking - optional)
 */
export async function startLocationTracking(
  callback: (location: LocationCoordinates) => void
): Promise<Location.LocationSubscription | null> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Background location permission denied');
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Update every minute
        distanceInterval: 50, // Or when moved 50 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
        });
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return null;
  }
}

/**
 * Stop location tracking
 */
export function stopLocationTracking(subscription: Location.LocationSubscription): void {
  subscription.remove();
}
