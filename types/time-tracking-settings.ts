/**
 * Time Tracking Settings Type Definitions
 * 
 * These types match the Prisma schema for TimeTrackingSettings
 * and provide proper TypeScript typing throughout the application.
 */

import { Decimal } from '@prisma/client/runtime/library';

export type PhotoRequirement = 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT';
export type OvertimeCalculationMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PATTERN_BASED';
export type PayrollExportFormat = 'CSV' | 'EXCEL' | 'JSON';

/**
 * Core TimeTrackingSettings interface matching the database schema
 * Note: Decimal fields use Prisma's Decimal type as returned from the database
 */
export interface TimeTrackingSettings {
  id: string;
  companyId: string;
  
  // GPS and Photo tracking (canonical field names)
  requireGpsLocation: boolean;
  photoRequirement: PhotoRequirement;
  allowMobileClock: boolean;
  
  // Manual time entry (canonical field name)
  allowManualTimeEntry: boolean;
  
  // Legacy compatibility fields (deprecated - will be removed in future version)
  allowManualEntry: boolean;
  requirePhotos: boolean;
  
  // Geofencing and clock settings
  geofenceLocations: any | null;
  enableGeofencing: boolean;
  geofenceRadius: number;
  roundClockTimes: string;
  autoClockOutHours: number | null;
  
  // Break settings
  requireBreaks: boolean;
  minBreakDuration: number;
  
  // Timesheet period settings
  timesheetPeriod: string;
  periodStartDay: string;
  autoSubmit: boolean;
  defaultWorkflowId: string | null;
  allowEditAfterSubmit: boolean;
  
  // Shift settings
  autoSchedulingEnabled: boolean;
  publishDaysAdvance: number;
  requireShiftConfirmation: boolean;
  allowShiftSwaps: boolean;
  managerApprovalSwaps: boolean;
  minimumRestHours: number;
  
  // Overtime configuration (NZ Employment Relations Act 2000 compliance)
  // Note: These use Prisma Decimal type as they come from the database
  includeOvertimeExport: boolean;
  overtimeThreshold: Decimal;
  overtimeMultiplier: Decimal;
  overtimeCalculationMode: OvertimeCalculationMode;
  autoApplyOvertime: boolean;
  allowManualOvertimeEntry: boolean;
  blockOvertimeDuringHours: boolean;
  requireOvertimeApproval: boolean;
  dailyOvertimeThreshold: Decimal | null;
  weeklyOvertimeThreshold: Decimal | null;
  monthlyOvertimeThreshold: Decimal | null;
  overtimeMultiplierTier2: Decimal | null;
  overtimeThresholdTier2: Decimal | null;
  publicHolidayMultiplier: Decimal;
  sundayMultiplier: Decimal | null;
  enableOvertimeBreakdown: boolean;
  
  // Export settings
  payrollExportFormat: PayrollExportFormat;
  includeBreaks: boolean;
  includeNotes: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partial update type for API requests
 */
export type TimeTrackingSettingsUpdate = Partial<Omit<TimeTrackingSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;

/**
 * Type guard to check if manual entry is allowed
 * Uses canonical field name with fallback to legacy field
 */
export function isManualEntryAllowed(settings: TimeTrackingSettings | null | undefined): boolean {
  if (!settings) return true; // Default to allowed if no settings
  
  // Use canonical field name
  return settings.allowManualTimeEntry;
}

/**
 * Type guard to check if photos are required for clock in
 */
export function isPhotoRequiredForClockIn(settings: TimeTrackingSettings | null | undefined): boolean {
  if (!settings) return false;
  
  return settings.photoRequirement === 'CLOCK_IN' || settings.photoRequirement === 'CLOCK_IN_OUT';
}

/**
 * Type guard to check if photos are required for clock out
 */
export function isPhotoRequiredForClockOut(settings: TimeTrackingSettings | null | undefined): boolean {
  if (!settings) return false;
  
  return settings.photoRequirement === 'CLOCK_IN_OUT';
}

/**
 * Type guard to check if GPS location is required
 */
export function isGpsLocationRequired(settings: TimeTrackingSettings | null | undefined): boolean {
  if (!settings) return false;
  
  return settings.requireGpsLocation;
}
