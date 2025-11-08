/**
 * Time Tracking Settings Type Definitions
 * 
 * These types match the Prisma schema for TimeTrackingSettings
 * and provide proper TypeScript typing throughout the application.
 */

import { TimeTrackingSettings as PrismaTimeTrackingSettings } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type PhotoRequirement = 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT';
export type OvertimeCalculationMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PATTERN_BASED';
export type PayrollExportFormat = 'CSV' | 'EXCEL' | 'JSON';

// Re-export Prisma's generated type as our main type
export type TimeTrackingSettings = PrismaTimeTrackingSettings;

/**
 * Partial update type for API requests
 */
export type TimeTrackingSettingsUpdate = Partial<Omit<TimeTrackingSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>;

/**
 * API Response type with Decimal fields converted to numbers for frontend compatibility
 * This is what the API endpoints return to the client
 */
export type TimeTrackingSettingsResponse = Omit<TimeTrackingSettings, 
  'overtimeThreshold' | 'overtimeMultiplier' | 'dailyOvertimeThreshold' | 
  'weeklyOvertimeThreshold' | 'monthlyOvertimeThreshold' | 'overtimeMultiplierTier2' | 
  'overtimeThresholdTier2' | 'publicHolidayMultiplier' | 'sundayMultiplier'> & {
  // Decimal fields converted to numbers for JSON serialization
  overtimeThreshold: number;
  overtimeMultiplier: number;
  dailyOvertimeThreshold: number | null;
  weeklyOvertimeThreshold: number | null;
  monthlyOvertimeThreshold: number | null;
  overtimeMultiplierTier2: number | null;
  overtimeThresholdTier2: number | null;
  publicHolidayMultiplier: number;
  sundayMultiplier: number | null;
  
  // Backward compatibility fields (temporary)
  enableGPSTracking?: boolean;
  requirePhotos?: boolean;
  allowManualEntry?: boolean;
};

/**
 * Type guard to check if manual entry is allowed
 * Uses canonical field name with fallback to legacy field
 */
export function isManualEntryAllowed(settings: any | null | undefined): boolean {
  if (!settings) return true; // Default to allowed if no settings
  
  // Use canonical field name
  return settings.allowManualTimeEntry ?? true;
}

/**
 * Type guard to check if photos are required for clock in
 */
export function isPhotoRequiredForClockIn(settings: any | null | undefined): boolean {
  if (!settings) return false;
  
  const photoReq = settings.photoRequirement;
  return photoReq === 'CLOCK_IN' || photoReq === 'CLOCK_IN_OUT';
}

/**
 * Type guard to check if photos are required for clock out
 */
export function isPhotoRequiredForClockOut(settings: any | null | undefined): boolean {
  if (!settings) return false;
  
  return settings.photoRequirement === 'CLOCK_IN_OUT';
}

/**
 * Type guard to check if GPS location is required
 */
export function isGpsLocationRequired(settings: any | null | undefined): boolean {
  if (!settings) return false;
  
  return settings.requireGpsLocation ?? false;
}
