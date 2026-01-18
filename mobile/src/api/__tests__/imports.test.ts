import * as shifts from '../shifts';
import * as swaps from '../swaps';
import * as timesheets from '../timesheets';
import * as reconciliation from '../reconciliation';
import { shiftService } from '../../services/ShiftService';
import { swapService } from '../../services/SwapService';
import { timesheetService } from '../../services/TimesheetService';

describe('API imports', () => {
  it('should export shift functions', () => {
    expect(shifts.getMyShifts).toBeDefined();
    expect(shifts.getTodayShifts).toBeDefined();
    expect(shifts.getShiftById).toBeDefined();
    expect(shifts.getWeekShifts).toBeDefined();
  });

  it('should export swap functions', () => {
    expect(swaps.createSwapRequest).toBeDefined();
    expect(swaps.acceptSwap).toBeDefined();
    expect(swaps.rejectSwap).toBeDefined();
    expect(swaps.cancelSwap).toBeDefined();
    expect(swaps.getMySwapRequests).toBeDefined();
    expect(swaps.getIncomingSwaps).toBeDefined();
    expect(swaps.getOutgoingSwaps).toBeDefined();
    expect(swaps.getEligibleSwapTargets).toBeDefined();
  });

  it('should export timesheet functions', () => {
    expect(timesheets.getMyTimesheets).toBeDefined();
    expect(timesheets.submitTimesheet).toBeDefined();
    expect(timesheets.getTimesheetById).toBeDefined();
    expect(timesheets.getTimesheetEntries).toBeDefined();
    expect(timesheets.updateEntryNotes).toBeDefined();
    expect(timesheets.getCurrentWeekTimesheet).toBeDefined();
  });

  it('should export reconciliation functions', () => {
    expect(reconciliation.getReconciliationStats).toBeDefined();
    expect(reconciliation.getDayReconciliation).toBeDefined();
    expect(reconciliation.bulkApproveEntries).toBeDefined();
    expect(reconciliation.editClockEntry).toBeDefined();
    expect(reconciliation.adjustEntry).toBeDefined();
    expect(reconciliation.flagEntry).toBeDefined();
    expect(reconciliation.matchClockToShift).toBeDefined();
  });

  it('should export services', () => {
    expect(shiftService).toBeDefined();
    expect(swapService).toBeDefined();
    expect(timesheetService).toBeDefined();
  });

  it('should have ShiftService methods', () => {
    expect(shiftService.getWeekShifts).toBeDefined();
    expect(shiftService.getTodayShift).toBeDefined();
    expect(shiftService.getTomorrowShift).toBeDefined();
    expect(shiftService.getUpcomingShifts).toBeDefined();
    expect(shiftService.refreshShifts).toBeDefined();
  });

  it('should have SwapService methods', () => {
    expect(swapService.getMySwaps).toBeDefined();
    expect(swapService.getPendingIncomingCount).toBeDefined();
    expect(swapService.requestSwap).toBeDefined();
    expect(swapService.acceptSwap).toBeDefined();
    expect(swapService.rejectSwap).toBeDefined();
    expect(swapService.cancelSwap).toBeDefined();
    expect(swapService.getEligibleTargets).toBeDefined();
  });

  it('should have TimesheetService methods', () => {
    expect(timesheetService.getMyTimesheets).toBeDefined();
    expect(timesheetService.getCurrentWeekTimesheet).toBeDefined();
    expect(timesheetService.getTimesheetWithEntries).toBeDefined();
    expect(timesheetService.submitTimesheet).toBeDefined();
    expect(timesheetService.updateEntryNotes).toBeDefined();
    expect(timesheetService.getTimesheetSummary).toBeDefined();
  });
});
