import { apiFetch } from './client';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  assignedToId: string;
  assignedById?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignedBy?: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Get action items for the current user
 */
export async function getMyActionItems(): Promise<ActionItem[]> {
  const response = await apiFetch('/api/action-items?scope=my', {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch action items');
  }

  const data = await response.json();
  // Server returns { success: true, data: [...] } format
  return Array.isArray(data) ? data : (data.data || []);
}

/**
 * Complete an action item
 */
export async function completeActionItem(itemId: string): Promise<ActionItem> {
  const response = await apiFetch(`/api/action-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  if (!response.ok) {
    throw new Error('Failed to complete action item');
  }

  return response.json();
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  itemId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
): Promise<ActionItem> {
  const response = await apiFetch(`/api/action-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update action item');
  }

  return response.json();
}
