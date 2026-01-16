import { apiFetch } from './client';

export type ActionItemType = 
  | 'SURVEY' 
  | 'DOCUMENT_SIGNATURE' 
  | 'DOCUMENT_ACKNOWLEDGEMENT' 
  | 'LEAVE_APPROVAL' 
  | 'TIMESHEET_APPROVAL' 
  | 'CHANGE_REQUEST' 
  | 'TASK' 
  | 'BULK_UPDATE_APPROVAL' 
  | 'EXIT_INTERVIEW_FORM';

export interface UnifiedActionItem {
  id: string;
  type: ActionItemType;
  title: string;
  subtitle?: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  urgent?: boolean;
  metadata?: any;
  actionLabel?: string;
  source: 'action_item' | 'approval' | 'change_request' | 'document';
  createdAt: string;
}

export interface ActionItemCounts {
  total: number;
  surveys: number;
  approvals: number;
  timesheets: number;
  documents: number;
  changeRequests: number;
  tasks: number;
}

// Legacy interface for backward compatibility
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
 * Get all unified action items for the current user
 * This includes surveys, approvals, documents, change requests, etc.
 */
export async function getUnifiedActionItems(): Promise<{ items: UnifiedActionItem[]; counts: ActionItemCounts }> {
  try {
    const response = await apiFetch('/api/mobile/unified-actions', {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[getUnifiedActionItems] HTTP ${response.status}: ${errorText}`);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized');
      }
      throw new Error(`Failed to fetch action items (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('[getUnifiedActionItems] Success:', data.counts);
    return {
      items: data.data || [],
      counts: data.counts || { total: 0, surveys: 0, approvals: 0, timesheets: 0, documents: 0, changeRequests: 0, tasks: 0 },
    };
  } catch (error) {
    console.error('[getUnifiedActionItems] Error:', error);
    throw error;
  }
}

/**
 * Get action items for the current user (legacy endpoint)
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
  return Array.isArray(data) ? data : (data.data || []);
}

/**
 * Complete an action item
 */
export async function completeActionItem(itemId: string): Promise<any> {
  // Extract the actual ID from prefixed IDs like "action-xxx"
  const actualId = itemId.startsWith('action-') ? itemId.replace('action-', '') : itemId;
  
  const response = await apiFetch(`/api/action-items/${actualId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to complete action item');
  }

  return response.json();
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  itemId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
): Promise<any> {
  const actualId = itemId.startsWith('action-') ? itemId.replace('action-', '') : itemId;
  
  const response = await apiFetch(`/api/action-items/${actualId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update action item');
  }

  return response.json();
}

/**
 * Approve a leave/holiday request
 */
export async function approveLeaveRequest(decisionId: string, comment?: string): Promise<any> {
  const actualId = decisionId.startsWith('approval-') ? decisionId.replace('approval-', '') : decisionId;
  
  const response = await apiFetch(`/api/approvals/${actualId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve', comment }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to approve leave request');
  }

  return response.json();
}

/**
 * Decline a leave/holiday request
 */
export async function declineLeaveRequest(decisionId: string, comment: string): Promise<any> {
  const actualId = decisionId.startsWith('approval-') ? decisionId.replace('approval-', '') : decisionId;
  
  const response = await apiFetch(`/api/approvals/${actualId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'decline', comment }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to decline leave request');
  }

  return response.json();
}

/**
 * Approve a transactional change request (bank/payroll, personal info, etc.)
 */
export async function approveChangeRequest(requestId: string): Promise<any> {
  const actualId = requestId.startsWith('change-') ? requestId.replace('change-', '') : requestId;
  
  const response = await apiFetch('/api/transactional-change-requests', {
    method: 'POST',
    body: JSON.stringify({ id: actualId, action: 'approve' }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to approve change request');
  }

  return response.json();
}

/**
 * Decline a transactional change request
 */
export async function declineChangeRequest(requestId: string, comment: string): Promise<any> {
  const actualId = requestId.startsWith('change-') ? requestId.replace('change-', '') : requestId;
  
  const response = await apiFetch('/api/transactional-change-requests', {
    method: 'POST',
    body: JSON.stringify({ id: actualId, action: 'decline', comment }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to decline change request');
  }

  return response.json();
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(timesheetId: string): Promise<any> {
  const response = await apiFetch(`/api/timesheets/${timesheetId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to approve timesheet');
  }

  return response.json();
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(timesheetId: string, reason: string): Promise<any> {
  const response = await apiFetch(`/api/timesheets/${timesheetId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reject timesheet');
  }

  return response.json();
}

/**
 * Acknowledge a document
 */
export async function acknowledgeDocument(documentId: string): Promise<any> {
  const actualId = documentId.startsWith('doc-ack-') ? documentId.replace('doc-ack-', '') : documentId;
  
  const response = await apiFetch('/api/documents/acknowledge', {
    method: 'POST',
    body: JSON.stringify({ documentId: actualId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to acknowledge document');
  }

  return response.json();
}

/**
 * Sign a document
 */
export async function signDocument(
  documentId: string, 
  signature: { method: 'TYPED' | 'DRAWN'; typedText?: string; drawnDataUrl?: string }
): Promise<any> {
  const actualId = documentId.startsWith('doc-sign-') ? documentId.replace('doc-sign-', '') : documentId;
  
  const response = await apiFetch('/api/documents/sign', {
    method: 'POST',
    body: JSON.stringify({
      documentId: actualId,
      method: signature.method,
      typedText: signature.typedText,
      drawnDataUrl: signature.drawnDataUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to sign document');
  }

  return response.json();
}

/**
 * Get document details including signature fields
 */
export async function getDocumentDetails(documentId: string): Promise<any> {
  const [docResponse, fieldsResponse] = await Promise.all([
    apiFetch(`/api/documents/signed-url/${documentId}`, { method: 'GET' }),
    apiFetch(`/api/documents/signature-fields/${documentId}`, { method: 'GET' }),
  ]);

  const docData = docResponse.ok ? await docResponse.json() : {};
  const fieldsData = fieldsResponse.ok ? await fieldsResponse.json() : [];

  return {
    url: docData.url,
    signatureFields: Array.isArray(fieldsData) ? fieldsData : [],
  };
}
