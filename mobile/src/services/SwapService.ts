import * as swapsApi from '../api/swaps';

export class SwapService {
  private static instance: SwapService;

  static getInstance(): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService();
    }
    return SwapService.instance;
  }

  async getMySwaps(): Promise<{
    incoming: swapsApi.ShiftSwapRequest[];
    outgoing: swapsApi.ShiftSwapRequest[];
  }> {
    const [incoming, outgoing] = await Promise.all([
      swapsApi.getIncomingSwaps(),
      swapsApi.getOutgoingSwaps(),
    ]);
    return { incoming, outgoing };
  }

  async getPendingIncomingCount(): Promise<number> {
    const incoming = await swapsApi.getIncomingSwaps();
    return incoming.filter((s) => s.status === 'PENDING').length;
  }

  async requestSwap(
    shiftId: string,
    targetEmployeeId?: string,
    message?: string
  ): Promise<swapsApi.ShiftSwapRequest> {
    return swapsApi.createSwapRequest(shiftId, targetEmployeeId, message);
  }

  async acceptSwap(swapId: string): Promise<void> {
    return swapsApi.acceptSwap(swapId);
  }

  async rejectSwap(swapId: string, reason?: string): Promise<void> {
    return swapsApi.rejectSwap(swapId, reason);
  }

  async cancelSwap(swapId: string): Promise<void> {
    return swapsApi.cancelSwap(swapId);
  }

  async getEligibleTargets(shiftId: string): Promise<swapsApi.EligibleSwapTarget[]> {
    return swapsApi.getEligibleSwapTargets(shiftId);
  }
}

export const swapService = SwapService.getInstance();
