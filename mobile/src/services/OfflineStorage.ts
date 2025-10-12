import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'react-native-uuid';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineAction {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'EDIT_ENTRY' | 'START_BREAK' | 'END_BREAK';
  timestamp: string;
  data: any;
  retryCount: number;
  synced: boolean;
  localId: string;
}

const STORAGE_KEY = 'offline_actions';
const MAX_RETRY_COUNT = 5;

/**
 * Get all offline actions from secure storage
 */
export async function getOfflineActions(): Promise<OfflineAction[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting offline actions:', error);
    return [];
  }
}

/**
 * Save offline actions to secure storage
 */
async function saveOfflineActions(actions: OfflineAction[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('Error saving offline actions:', error);
    throw error;
  }
}

/**
 * Queue an offline action
 */
export async function queueOfflineAction(
  type: OfflineAction['type'],
  data: any
): Promise<string> {
  const action: OfflineAction = {
    id: uuidv4() as string,
    type,
    timestamp: new Date().toISOString(),
    data,
    retryCount: 0,
    synced: false,
    localId: uuidv4() as string,
  };

  const actions = await getOfflineActions();
  actions.push(action);
  await saveOfflineActions(actions);

  return action.localId;
}

/**
 * Remove an offline action
 */
export async function removeOfflineAction(actionId: string): Promise<void> {
  const actions = await getOfflineActions();
  const filtered = actions.filter((a) => a.id !== actionId);
  await saveOfflineActions(filtered);
}

/**
 * Mark an action as synced
 */
export async function markActionSynced(actionId: string, serverId?: string): Promise<void> {
  const actions = await getOfflineActions();
  const action = actions.find((a) => a.id === actionId);
  
  if (action) {
    action.synced = true;
    if (serverId) {
      action.data.serverId = serverId;
    }
    await saveOfflineActions(actions);
  }
}

/**
 * Increment retry count for an action
 */
export async function incrementRetryCount(actionId: string): Promise<void> {
  const actions = await getOfflineActions();
  const action = actions.find((a) => a.id === actionId);
  
  if (action) {
    action.retryCount += 1;
    await saveOfflineActions(actions);
  }
}

/**
 * Get pending (unsynced) actions
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const actions = await getOfflineActions();
  return actions.filter((a) => !a.synced && a.retryCount < MAX_RETRY_COUNT);
}

/**
 * Clear all synced actions
 */
export async function clearSyncedActions(): Promise<void> {
  const actions = await getOfflineActions();
  const unsynced = actions.filter((a) => !a.synced);
  await saveOfflineActions(unsynced);
}

/**
 * Clear all actions (use with caution)
 */
export async function clearAllActions(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
}

/**
 * Add network listener
 */
export function addNetworkListener(callback: (isConnected: boolean) => void): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected === true && state.isInternetReachable === true;
    callback(isConnected);
  });

  return unsubscribe;
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  total: number;
  synced: number;
  pending: number;
  failed: number;
}> {
  const actions = await getOfflineActions();
  
  return {
    total: actions.length,
    synced: actions.filter((a) => a.synced).length,
    pending: actions.filter((a) => !a.synced && a.retryCount < MAX_RETRY_COUNT).length,
    failed: actions.filter((a) => a.retryCount >= MAX_RETRY_COUNT).length,
  };
}

/**
 * Export offline data for debugging
 */
export async function exportOfflineData(): Promise<string> {
  const actions = await getOfflineActions();
  return JSON.stringify(actions, null, 2);
}
