const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

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
  const response = await fetch(`${API_BASE_URL}/api/action-items?scope=my`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch action items');
  }

  return response.json();
}

/**
 * Complete an action item
 */
export async function completeActionItem(itemId: string): Promise<ActionItem> {
  const response = await fetch(`${API_BASE_URL}/api/action-items/${itemId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${API_BASE_URL}/api/action-items/${itemId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update action item');
  }

  return response.json();
}
