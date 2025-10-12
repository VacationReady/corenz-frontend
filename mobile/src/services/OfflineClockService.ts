import { apiClient } from '../api/client';
import {
  queueOfflineAction,
  getPendingActions,
  markActionSynced,
  incrementRetryCount,
  removeOfflineAction,
  isOnline,
  OfflineAction,
} from './OfflineStorage';
import { getCurrentLocation } from './LocationService';

/**
 * Clock in (offline-capable)
 */
export async function clockInOffline(
  photoBase64?: string,
  notes?: string
): Promise<{ success: boolean; localId: string; offlineMode: boolean }> {
  try {
    const location = await getCurrentLocation();
    const online = await isOnline();

    const data = {
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy,
      photoBase64,
      notes,
    };

    if (online) {
      // Try to clock in online
      try {
        const response = await apiClient.post('/time-tracking/clock-in', {
          location: location
            ? {
                lat: location.latitude,
                lng: location.longitude,
                accuracy: location.accuracy,
              }
            : undefined,
          photoUrl: photoBase64,
          notes,
        });

        return {
          success: true,
          localId: response.data.clockEntry.id,
          offlineMode: false,
        };
      } catch (error) {
        console.log('Online clock in failed, switching to offline mode');
      }
    }

    // Queue for offline sync
    const localId = await queueOfflineAction('CLOCK_IN', data);

    return {
      success: true,
      localId,
      offlineMode: true,
    };
  } catch (error) {
    console.error('Clock in error:', error);
    throw error;
  }
}

/**
 * Clock out (offline-capable)
 */
export async function clockOutOffline(
  entryId: string,
  breakDuration?: number,
  photoBase64?: string,
  notes?: string
): Promise<{ success: boolean; localId: string; offlineMode: boolean }> {
  try {
    const location = await getCurrentLocation();
    const online = await isOnline();

    const data = {
      entryId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy,
      breakDuration,
      photoBase64,
      notes,
    };

    if (online) {
      // Try to clock out online
      try {
        const response = await apiClient.post('/time-tracking/clock-out', {
          location: location
            ? {
                lat: location.latitude,
                lng: location.longitude,
                accuracy: location.accuracy,
              }
            : undefined,
          breakDuration,
          photoUrl: photoBase64,
          notes,
        });

        return {
          success: true,
          localId: response.data.clockEntry.id,
          offlineMode: false,
        };
      } catch (error) {
        console.log('Online clock out failed, switching to offline mode');
      }
    }

    // Queue for offline sync
    const localId = await queueOfflineAction('CLOCK_OUT', data);

    return {
      success: true,
      localId,
      offlineMode: true,
    };
  } catch (error) {
    console.error('Clock out error:', error);
    throw error;
  }
}

/**
 * Sync all pending offline actions
 */
export async function syncOfflineActions(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ actionId: string; error: string }>;
}> {
  try {
    const online = await isOnline();
    if (!online) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ actionId: 'network', error: 'Device is offline' }],
      };
    }

    const pendingActions = await getPendingActions();
    
    if (pendingActions.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    // Prepare entries for sync API
    const entries = pendingActions.map((action) => ({
      localId: action.localId,
      type: action.type === 'CLOCK_IN' ? 'CLOCK_IN' : 'CLOCK_OUT',
      timestamp: action.timestamp,
      latitude: action.data.latitude,
      longitude: action.data.longitude,
      accuracy: action.data.accuracy,
      photoBase64: action.data.photoBase64,
      notes: action.data.notes,
      breakDuration: action.data.breakDuration,
      offlineCreated: true,
    }));

    // Call sync API
    const response = await apiClient.post('/time-tracking/sync', {
      entries,
    });

    const { synced, failed } = response.data;

    // Update local storage based on sync results
    for (const result of synced) {
      const action = pendingActions.find((a) => a.localId === result.localId);
      if (action) {
        await markActionSynced(action.id, result.serverId);
      }
    }

    for (const result of failed) {
      const action = pendingActions.find((a) => a.localId === result.localId);
      if (action) {
        await incrementRetryCount(action.id);
      }
    }

    return {
      success: true,
      synced: synced.length,
      failed: failed.length,
      errors: failed.map((f: any) => ({
        actionId: f.localId,
        error: f.error,
      })),
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [
        {
          actionId: 'sync',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Auto-sync when network is available
 */
export async function autoSync(): Promise<void> {
  const online = await isOnline();
  if (!online) {
    console.log('Device is offline, skipping auto-sync');
    return;
  }

  const result = await syncOfflineActions();
  
  if (result.synced > 0) {
    console.log(`Auto-sync: ${result.synced} actions synced successfully`);
  }
  
  if (result.failed > 0) {
    console.log(`Auto-sync: ${result.failed} actions failed to sync`);
  }
}
