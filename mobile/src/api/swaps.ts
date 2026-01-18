import { apiClient } from './client';

export interface ShiftSwapRequest {
  id: string;
  shiftId: string;
  requesterId: string;
  targetEmployeeId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'MANAGER_PENDING' | 'APPROVED' | 'COMPLETED';
  requestMessage: string | null;
  responseMessage: string | null;
  managerApprovalRequired: boolean;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  Shift: {
    id: string;
    startTime: string;
    endTime: string;
    role: string | null;
  };
  Requester: {
    id: string;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      profileImageUrl: string | null;
    };
  };
  TargetEmployee?: {
    id: string;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      profileImageUrl: string | null;
    };
  };
}

export interface SwapsResponse {
  swapRequests: ShiftSwapRequest[];
  total: number;
}

export interface EligibleSwapTarget {
  id: string;
  employeeId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  department?: string;
  role?: string;
}

export async function getMySwapRequests(): Promise<SwapsResponse> {
  const response = await apiClient.get('/api/shift-swaps');
  return response.data;
}

export async function getIncomingSwaps(): Promise<ShiftSwapRequest[]> {
  const response = await apiClient.get('/api/shift-swaps?type=incoming');
  return response.data.swapRequests || [];
}

export async function getOutgoingSwaps(): Promise<ShiftSwapRequest[]> {
  const response = await apiClient.get('/api/shift-swaps?type=outgoing');
  return response.data.swapRequests || [];
}

export async function createSwapRequest(
  shiftId: string,
  targetEmployeeId?: string,
  requestMessage?: string
): Promise<ShiftSwapRequest> {
  const response = await apiClient.post('/api/shift-swaps', {
    shiftId,
    targetEmployeeId: targetEmployeeId || null,
    requestMessage: requestMessage || null,
  });
  return response.data.swapRequest;
}

export async function acceptSwap(swapId: string): Promise<void> {
  await apiClient.post(`/api/shift-swaps/${swapId}/accept`);
}

export async function rejectSwap(swapId: string, reason?: string): Promise<void> {
  await apiClient.post(`/api/shift-swaps/${swapId}/reject`, {
    reason: reason || null,
  });
}

export async function cancelSwap(swapId: string): Promise<void> {
  await apiClient.delete(`/api/shift-swaps/${swapId}`);
}

export async function getEligibleSwapTargets(shiftId: string): Promise<EligibleSwapTarget[]> {
  const response = await apiClient.get(`/api/shift-swaps/eligible?shiftId=${shiftId}`);
  return response.data.employees || [];
}
