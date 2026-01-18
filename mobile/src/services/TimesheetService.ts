import * as timesheetsApi from '../api/timesheets';
import * as SecureStore from 'expo-secure-store';

const TIMESHEETS_CACHE_KEY = 'cached_timesheets';

export class TimesheetService {
  private static instance: TimesheetService;

  static getInstance(): TimesheetService {
    if (!TimesheetService.instance) {
      TimesheetService.instance = new TimesheetService();
    }
    return TimesheetService.instance;
  }

  async getMyTimesheets(): Promise<timesheetsApi.Timesheet[]> {
    try {
      const response = await timesheetsApi.getMyTimesheets();
      await this.cacheTimesheets(response.timesheets);
      return response.timesheets;
    } catch (error) {
      // Return cached if network fails
      const cached = await this.getCachedTimesheets();
      if (cached) {
        console.log('[TimesheetService] Using cached timesheets due to network error');
        return cached;
      }
      throw error;
    }
  }

  async getCurrentWeekTimesheet(): Promise<timesheetsApi.Timesheet | null> {
    return timesheetsApi.getCurrentWeekTimesheet();
  }

  async getTimesheetWithEntries(timesheetId: string): Promise<{
    timesheet: timesheetsApi.Timesheet;
    entries: timesheetsApi.TimesheetEntry[];
  }> {
    const [timesheet, entries] = await Promise.all([
      timesheetsApi.getTimesheetById(timesheetId),
      timesheetsApi.getTimesheetEntries(timesheetId),
    ]);
    return { timesheet, entries };
  }

  async submitTimesheet(timesheetId: string): Promise<void> {
    return timesheetsApi.submitTimesheet(timesheetId);
  }

  async updateEntryNotes(entryId: string, notes: string): Promise<void> {
    await timesheetsApi.updateEntryNotes(entryId, notes);
  }

  async getTimesheetSummary(timesheetId: string): Promise<{
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    daysWorked: number;
    entriesCount: number;
  }> {
    const { timesheet, entries } = await this.getTimesheetWithEntries(timesheetId);

    const uniqueDays = new Set(entries.map((e) => e.date.split('T')[0]));

    return {
      totalHours: timesheet.totalHours || 0,
      regularHours: timesheet.regularHours || 0,
      overtimeHours: timesheet.overtimeHours || 0,
      daysWorked: uniqueDays.size,
      entriesCount: entries.length,
    };
  }

  private async getCachedTimesheets(): Promise<timesheetsApi.Timesheet[] | null> {
    try {
      const stored = await SecureStore.getItemAsync(TIMESHEETS_CACHE_KEY);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private async cacheTimesheets(timesheets: timesheetsApi.Timesheet[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(TIMESHEETS_CACHE_KEY, JSON.stringify(timesheets));
    } catch (error) {
      console.error('[TimesheetService] Failed to cache timesheets:', error);
    }
  }
}

export const timesheetService = TimesheetService.getInstance();
