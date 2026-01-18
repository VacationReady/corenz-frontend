import * as shiftsApi from '../api/shifts';
import * as SecureStore from 'expo-secure-store';

const SHIFTS_CACHE_KEY = 'cached_shifts';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedShifts {
  shifts: shiftsApi.Shift[];
  cachedAt: number;
  weekStart: string;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStartOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const start = getStartOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

export class ShiftService {
  private static instance: ShiftService;

  static getInstance(): ShiftService {
    if (!ShiftService.instance) {
      ShiftService.instance = new ShiftService();
    }
    return ShiftService.instance;
  }

  async getWeekShifts(weekStartDate?: Date): Promise<shiftsApi.Shift[]> {
    const weekStart = weekStartDate || getStartOfWeek(new Date());
    const weekEnd = getEndOfWeek(weekStart);
    const weekKey = formatDateKey(weekStart);

    // Check cache first
    const cached = await this.getCachedShifts(weekKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await shiftsApi.getMyShifts(weekStart, weekEnd);
      await this.cacheShifts(response.shifts, weekKey);
      return response.shifts;
    } catch (error) {
      // Return cached data if available, even if stale
      const staleCache = await this.getCachedShifts(weekKey, true);
      if (staleCache) {
        console.log('[ShiftService] Using stale cache due to network error');
        return staleCache;
      }
      throw error;
    }
  }

  async getTodayShift(): Promise<shiftsApi.Shift | null> {
    const shifts = await this.getWeekShifts();
    return shifts.find((s) => isToday(new Date(s.startTime))) || null;
  }

  async getTomorrowShift(): Promise<shiftsApi.Shift | null> {
    const shifts = await this.getWeekShifts();
    return shifts.find((s) => isTomorrow(new Date(s.startTime))) || null;
  }

  async getUpcomingShifts(limit: number = 5): Promise<shiftsApi.Shift[]> {
    const shifts = await this.getWeekShifts();
    const now = new Date();
    return shifts.filter((s) => new Date(s.startTime) >= now).slice(0, limit);
  }

  async refreshShifts(): Promise<shiftsApi.Shift[]> {
    // Force refresh by clearing cache
    try {
      await SecureStore.deleteItemAsync(SHIFTS_CACHE_KEY);
    } catch {
      // Ignore cache clear errors
    }
    return this.getWeekShifts();
  }

  private async getCachedShifts(
    weekKey: string,
    ignoreExpiry: boolean = false
  ): Promise<shiftsApi.Shift[] | null> {
    try {
      const stored = await SecureStore.getItemAsync(SHIFTS_CACHE_KEY);
      if (!stored) {
        return null;
      }

      const cached: CachedShifts = JSON.parse(stored);
      if (cached.weekStart !== weekKey) {
        return null;
      }

      const isExpired = Date.now() - cached.cachedAt > CACHE_DURATION_MS;
      if (isExpired && !ignoreExpiry) {
        return null;
      }

      return cached.shifts;
    } catch {
      return null;
    }
  }

  private async cacheShifts(shifts: shiftsApi.Shift[], weekKey: string): Promise<void> {
    try {
      const cacheData: CachedShifts = {
        shifts,
        cachedAt: Date.now(),
        weekStart: weekKey,
      };
      await SecureStore.setItemAsync(SHIFTS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[ShiftService] Failed to cache shifts:', error);
    }
  }
}

export const shiftService = ShiftService.getInstance();
